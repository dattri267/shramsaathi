// backend/src/app.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

// Core middleware — MUST come before routes that use req.body / need CORS
app.use(cors());
app.use(express.json());

// Routes
const adminRoutes = require('./routes/admin.routes');
const authRoutes = require('./routes/auth.routes');
const avatarRoutes = require('./routes/avatar.routes');
const bookingRoutes = require('./routes/booking.routes');
const calendarRoutes = require('./routes/calendar.routes');
const customerRoutes = require('./routes/customer.routes');
const disputeRoutes = require('./routes/dispute.routes');
const emergencyRoutes = require('./routes/emergency.routes');
const invoiceRoutes = require('./routes/invoice.routes');
const locationRoutes = require('./routes/location.routes');
const paymentRoutes = require('./routes/payment.routes');
const pricingRoutes = require('./routes/pricing.routes');
const ratingRoutes = require('./routes/rating.routes');
const skillRoutes = require('./routes/skill.routes');
const welfareRoutes = require('./routes/welfare.routes');
const workerRoutes = require('./routes/worker.routes');

const mainRouter = express.Router();
mainRouter.use(adminRoutes);
mainRouter.use(authRoutes);
mainRouter.use(avatarRoutes);
mainRouter.use(bookingRoutes);
mainRouter.use(calendarRoutes);
mainRouter.use(customerRoutes);
mainRouter.use(disputeRoutes);
mainRouter.use(emergencyRoutes);
mainRouter.use(invoiceRoutes);
mainRouter.use(locationRoutes);
mainRouter.use(paymentRoutes);
mainRouter.use(pricingRoutes);
mainRouter.use(ratingRoutes);
mainRouter.use(skillRoutes);
mainRouter.use(welfareRoutes);
mainRouter.use(workerRoutes);

// Health check endpoint (MUST come before router mounts)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Mount at both /api and / so all endpoints (e.g. /api/admin/workers or /auth/login) resolve correctly
app.use('/api', mainRouter);
app.use('/', mainRouter);

// Global Error Handler
app.use((err, req, res, next) => {
  const status = err.statusCode || err.status || 500;
  return res.status(status).json({
    error: err.message || 'Internal Server Error'
  });
});

module.exports = app;
