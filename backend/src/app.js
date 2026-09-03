const express = require('express');
const cors = require('cors');
const emergencyRoutes = require('./routes/emergency.routes');
const bookingRoutes = require('./routes/booking.routes');
const pricingRoutes = require('./routes/pricing.routes');
const paymentRoutes = require('./routes/payment.routes');
const authRoutes = require('./routes/auth.routes');
const customerRoutes = require('./routes/customer.routes');
const workerRoutes = require('./routes/worker.routes');
const ratingRoutes = require('./routes/rating.routes');
const disputeRoutes = require('./routes/dispute.routes');
const welfareRoutes = require('./routes/welfare.routes');


const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/auth', authRoutes);
app.use('/api/auth', authRoutes);
app.use('/customer', customerRoutes);
app.use('/api/customer', customerRoutes);
app.use('/worker', workerRoutes);
app.use('/api/worker', workerRoutes);
app.use('/skills', workerRoutes);
app.use('/api/skills', workerRoutes);
app.use('/ratings', ratingRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/disputes', disputeRoutes);
app.use('/api/disputes', disputeRoutes);
app.use('/welfare', welfareRoutes);
app.use('/api/welfare', welfareRoutes);
app.use('/api', bookingRoutes);
app.use('/api', emergencyRoutes);
app.use('/api', pricingRoutes);
app.use('/api', paymentRoutes);


app.use((err, req, res, next) => {
  console.error(err);

  res.status(err.statusCode || 500).json({
    error: err.message || 'Internal server error'
  });
});

module.exports = app;