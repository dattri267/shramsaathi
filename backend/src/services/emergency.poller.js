const {
  processEmergencyTimeouts
} = require('./emergency.timeout');

function startEmergencyPoller() {
  console.log('Emergency timeout poller started');

  setInterval(async () => {
    if (!process.env.DATABASE_URL) {
      return;
    }
    try {
      await processEmergencyTimeouts();
    } catch (err) {
      console.error('Emergency timeout poller warning:', err.message || err);
    }
  }, 5000);
}

module.exports = {
  startEmergencyPoller
};