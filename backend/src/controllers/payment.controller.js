const prisma = require('../config/db');

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

    if (booking.final_amount === null) {
      return res.status(400).json({
        error: 'Final amount is not available'
      });
    }

    const existingPayment = await prisma.payments.findUnique({
      where: {
        booking_id: bookingId
      }
    });

    if (existingPayment) {
      return res.json({
        message: 'Payment already exists',
        payment: existingPayment
      });
    }

    const payment = await prisma.payments.create({
      data: {
        booking_id: bookingId,
        customer_id: booking.customer_id,
        amount: booking.final_amount,
        currency: 'INR',
        status: 'pending',
        provider: 'mock'
      }
    });

    res.status(201).json({
      message: 'Payment created',
      payment
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: 'Failed to create payment'
    });
  }
}


async function completeMockPayment(req, res) {
  try {
    const { paymentId } = req.params;

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

    const updatedPayment = await prisma.payments.update({
      where: {
        id: paymentId
      },
      data: {
        status: 'paid',
        provider: 'mock',
        provider_payment_id: `MOCK_${Date.now()}`,
        paid_at: new Date()
      }
    });

    res.json({
      message: 'Payment successful',
      payment: updatedPayment
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: 'Payment failed'
    });
  }
}


module.exports = {
  createPayment,
  completeMockPayment
};