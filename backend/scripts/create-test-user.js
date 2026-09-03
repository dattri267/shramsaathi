// backend/scripts/create-test-user.js
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlbnFlb3d2b2VsYmVscWtzZ3dhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzNzMwMjUsImV4cCI6MjEwMzk0OTAyNX0.OZAw3_gTSCkoK4H_IKE5XAxwgh7SifulLotmgn5kmVk'; // ask teammate for this

async function main() {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': ANON_KEY,
    },
    body: JSON.stringify({
      email: 'testcustomer@gmail.com',
      password: 'TestPass123!',
    }),
  });

  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

main();