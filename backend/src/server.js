
require('dotenv').config();

const app = require('./app');
const {
  startEmergencyPoller
} = require('./services/emergency.poller');
const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

startEmergencyPoller();