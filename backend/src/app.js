const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth.routes');
const bookingRoutes = require('./routes/booking.routes');
const emergencyRoutes = require('./routes/emergency.routes');
const pricingRoutes = require('./routes/pricing.routes');
const paymentRoutes = require('./routes/payment.routes');
const invoiceRoutes = require('./routes/invoice.routes');
const locationRoutes = require('./routes/location.routes');

const customerRoutes = require('./routes/customer.routes');
const workerRoutes = require('./routes/worker.routes');
const skillRoutes = require('./routes/skill.routes');
const avatarRoutes = require('./routes/avatar.routes');
const adminRoutes = require('./routes/admin.routes');

const ratingRoutes = require('./routes/rating.routes');
const disputeRoutes = require('./routes/dispute.routes');
const welfareRoutes = require('./routes/welfare.routes');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok'
  });
});

// Authentication
app.use('/auth', authRoutes);
app.use('/api/auth', authRoutes);

// Main backend modules
app.use('/api', bookingRoutes);
app.use('/api', emergencyRoutes);
app.use('/api', pricingRoutes);
app.use('/api', paymentRoutes);
app.use('/api', invoiceRoutes);
app.use('/api', locationRoutes);

// Profile / worker / customer / skills
app.use('/api', customerRoutes);
app.use('/api', workerRoutes);
app.use('/api', skillRoutes);

// Cloudinary avatar
app.use('/api', avatarRoutes);
app.use('/api', adminRoutes);
// Other existing modules from main
app.use('/api/ratings', ratingRoutes);
app.use('/api', disputeRoutes);
app.use('/api', welfareRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error(err);

  res.status(err.statusCode || 500).json({
    error: err.message || 'Internal server error'
  });
});

module.exports = app;