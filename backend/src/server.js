
require('dotenv').config();

const app = require('./app');

const { connectRedis } = require('./config/redis');
const {
  startEmergencyPoller
} = require('./services/emergency.poller');
const PORT = process.env.PORT && process.env.PORT !== '5000' ? process.env.PORT : 8000;


process.on('unhandledRejection', (reason) => {
  console.warn('Unhandled Rejection detected:', reason.message || reason);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT} (Network API: http://192.168.29.150:${PORT})`);
});

startEmergencyPoller();

//Connect to Redis
connectRedis().catch((err) => {
  console.warn('Redis connection failed:', err.message);
});