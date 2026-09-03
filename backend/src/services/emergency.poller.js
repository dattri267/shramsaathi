const {
  processEmergencyTimeouts
} = require('./emergency.timeout');

function startEmergencyPoller() {

  console.log(
    'Emergency timeout poller started'
  );

  setInterval(async () => {
    await processEmergencyTimeouts();
  }, 5000);
}

module.exports = {
  startEmergencyPoller
};