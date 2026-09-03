const express = require('express');
const cors = require('cors');
const emergencyRoutes = require('./routes/emergency.routes');
const bookingRoutes = require('./routes/booking.routes');
const pricingRoutes = require('./routes/pricing.routes');
const paymentRoutes = require('./routes/payment.routes');


const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

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