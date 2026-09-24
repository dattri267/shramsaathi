const crypto = require('crypto');
const axios = require('axios');
const prisma = require('../config/db');
const {
  createFairShareLedger
} = require('../services/ledger.service');

const RAZORPAY_API_URL = 'https://api.razorpay.com/v1';

function getRazorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    const err = new Error('Razorpay test keys are not configured on the backend');
    err.statusCode = 500;
    throw err;
  }

  return { keyId, keySecret };
}

function razorpayClient() {
  const { keyId, keySecret } = getRazorpayConfig();

  return axios.create({
    baseURL: RAZORPAY_API_URL,
    auth: {
      username: keyId,
      password: keySecret
    },
    headers: {
      'Content-Type': 'application/json'
    },
    timeout: 15000
  });
}

async function createPayment(req, res) {
  try {
    const { bookingId } = req.body;

    if (!bookingId) {
      return res.status(400).json({
        error: 'bookingId is required'
      });
    }

    const booking = await prisma.bookings.findUnique({
      where: {
        id: bookingId
      }
    });

    if (!booking) {
      return res.status(404).json({
        error: 'Booking not found'
      });
    }

    if (booking.customer_id !== req.user.customerProfileId) {
      return res.status(403).json({
        error: 'You do not own this booking'
      });
    }

    if (booking.status !== 'completed') {
      return res.status(400).json({
        error: 'Payment can only be created after booking completion'
      });
    }

    if (booking.final_amount === null || Number(booking.final_amount) <= 0) {
      return res.status(400).json({
        error: 'Final amount is not available'
      });
    }

    const { keyId } = getRazorpayConfig();
    const amountRupees = Number(booking.final_amount);
    const amountPaise = Math.round(amountRupees * 100);

    let payment = await prisma.payments.findUnique({
      where: {
        booking_id: bookingId
      }
    });

    if (payment?.status === 'paid') {
      return res.json({
        message: 'Payment already completed',
        payment,
        alreadyPaid: true
      });
    }

    if (!payment) {
      payment = await prisma.payments.create({
        data: {
          booking_id: bookingId,
          customer_id: booking.customer_id,
          amount: booking.final_amount,
          currency: 'INR',
          status: 'pending',
          provider: 'razorpay'
        }
      });
    } else if (
      payment.provider === 'razorpay' &&
      payment.status === 'pending' &&
      payment.provider_payment_id
    ) {
      return res.json({
        message: 'Razorpay order already exists',
        payment,
        razorpay: {
          key_id: keyId,
          order_id: payment.provider_payment_id,
          amount: amountPaise,
          currency: 'INR'
        }
      });
    } else {
      payment = await prisma.payments.update({
        where: {
          id: payment.id
        },
        data: {
          amount: booking.final_amount,
          currency: 'INR',
          status: 'pending',
          provider: 'razorpay',
          provider_payment_id: null,
          paid_at: null
        }
      });
    }

    const orderResponse = await razorpayClient().post('/orders', {
      amount: amountPaise,
      currency: 'INR',
      receipt: `booking_${String(bookingId).replace(/-/g, '').slice(0, 24)}`,
      notes: {
        booking_id: String(bookingId),
        payment_id: String(payment.id)
      }
    });

    const order = orderResponse.data;

    payment = await prisma.payments.update({
      where: {
        id: payment.id
      },
      data: {
        provider: 'razorpay',
        provider_payment_id: order.id,
        amount: booking.final_amount,
        currency: 'INR',
        status: 'pending',
        paid_at: null
      }
    });

    return res.status(201).json({
      message: 'Razorpay order created',
      payment,
      razorpay: {
        key_id: keyId,
        order_id: order.id,
        amount: order.amount,
        currency: order.currency
      }
    });
  } catch (err) {
    console.error('Razorpay order creation failed:', err.response?.data || err.message || err);

    const status = err.statusCode || 500;
    return res.status(status).json({
      error: 'Failed to create Razorpay payment order'
    });
  }
}

async function verifyRazorpayPayment(req, res) {
  try {
    const { paymentId } = req.params;
    const {
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: razorpaySignature
    } = req.body;

    if (!paymentId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({
        error: 'Razorpay payment verification data is incomplete'
      });
    }

    const payment = await prisma.payments.findUnique({
      where: {
        id: paymentId
      }
    });

    if (!payment) {
      return res.status(404).json({
        error: 'Payment not found'
      });
    }

    if (payment.customer_id !== req.user.customerProfileId) {
      return res.status(403).json({
        error: 'You do not own this payment'
      });
    }

    if (payment.status === 'paid') {
      return res.json({
        message: 'Payment already completed',
        payment
      });
    }

    if (payment.provider !== 'razorpay') {
      return res.status(400).json({
        error: 'Payment is not a Razorpay payment'
      });
    }

    const storedOrderId = payment.provider_payment_id;

    if (!storedOrderId || storedOrderId !== razorpayOrderId) {
      return res.status(400).json({
        error: 'Razorpay order does not match this payment'
      });
    }

    const { keySecret } = getRazorpayConfig();
    const generatedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${storedOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    const generatedBuffer = Buffer.from(generatedSignature, 'utf8');
    const receivedBuffer = Buffer.from(String(razorpaySignature), 'utf8');
    const signaturesMatch =
      generatedBuffer.length === receivedBuffer.length &&
      crypto.timingSafeEqual(generatedBuffer, receivedBuffer);

    if (!signaturesMatch) {
      return res.status(400).json({
        error: 'Razorpay payment signature verification failed'
      });
    }

    const paymentResponse = await razorpayClient().get(`/payments/${encodeURIComponent(razorpayPaymentId)}`);
    const razorpayPayment = paymentResponse.data;

    const expectedAmountPaise = Math.round(Number(payment.amount) * 100);

    if (
      razorpayPayment.order_id !== storedOrderId ||
      Number(razorpayPayment.amount) !== expectedAmountPaise ||
      razorpayPayment.currency !== payment.currency ||
      razorpayPayment.status !== 'captured'
    ) {
      return res.status(400).json({
        error: 'Razorpay payment could not be confirmed as captured'
      });
    }

    const updatedPayment = await prisma.payments.update({
      where: {
        id: payment.id
      },
      data: {
        status: 'paid',
        provider: 'razorpay',
        provider_payment_id: razorpayPaymentId,
        paid_at: new Date()
      }
    });

    const ledger = await createFairShareLedger(updatedPayment);

    return res.json({
      message: 'Payment successful',
      payment: updatedPayment,
      ledger
    });
  } catch (err) {
    console.error('Razorpay payment verification failed:', err.response?.data || err.message || err);

    return res.status(err.statusCode || 500).json({
      error: 'Payment verification failed'
    });
  }
}

module.exports = {
  createPayment,
  verifyRazorpayPayment
};
