
require('dotenv').config();

const app = require('./app');

const { connectRedis } = require('./config/redis');
const {
  startEmergencyPoller
} = require('./services/emergency.poller');
const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

startEmergencyPoller();

//Connect to Redis
connectRedis().catch((err) => {
  console.error('Redis connection failed:', err.message);
});