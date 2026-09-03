const prisma = require('../config/db');

async function createInvoice(req, res) {
  try {
    const { bookingId } = req.body;

    if (!bookingId) {
      return res.status(400).json({
        error: 'bookingId is required'
      });
    }

    const booking = await prisma.bookings.findUnique({
      where: { id: bookingId }
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
        error: 'Invoice can only be generated for completed bookings'
      });
    }

    if (booking.final_amount === null) {
      return res.status(400).json({
        error: 'Final amount is not available'
      });
    }

    const existingInvoice = await prisma.invoices.findUnique({
      where: {
        booking_id: bookingId
      }
    });

    if (existingInvoice) {
      return res.json({
        message: 'Invoice already exists',
        invoice: existingInvoice
      });
    }

    const totalAmount = Number(booking.final_amount);

    // GST placeholder for MVP.
    const gstRate = Number(
      process.env.GST_PERCENT || 0
    );

    const gstAmount = Number(
      (totalAmount * gstRate / 100).toFixed(2)
    );

    const invoiceNumber =
      `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const invoice = await prisma.invoices.create({
      data: {
        booking_id: bookingId,
        invoice_number: invoiceNumber,
        storage_path: `invoices/${invoiceNumber}.pdf`,
        public_url: null,
        gst_amount: gstAmount,
        total_amount: totalAmount,
        issued_at: new Date()
      }
    });

    res.status(201).json({
      message: 'Invoice generated',
      invoice
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: 'Failed to generate invoice'
    });
  }
}

async function getInvoice(req, res) {
  try {
    const { bookingId } = req.params;

    const invoice = await prisma.invoices.findUnique({
      where: {
        booking_id: bookingId
      }
    });

    if (!invoice) {
      return res.status(404).json({
        error: 'Invoice not found'
      });
    }

    const booking = await prisma.bookings.findUnique({
      where: { id: bookingId },
      select: {
        customer_id: true
      }
    });

    if (!booking) {
      return res.status(404).json({
        error: 'Booking not found'
      });
    }

    if (booking.customer_id !== req.user.customerProfileId) {
      return res.status(403).json({
        error: 'You do not own this invoice'
      });
    }

    res.json({
      invoice
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: 'Failed to fetch invoice'
    });
  }
}

module.exports = {
  createInvoice,
  getInvoice
};