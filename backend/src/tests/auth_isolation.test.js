const http = require('http');
const app = require('../app');
const assert = require('assert');
const jwt = require('jsonwebtoken');

async function runAuthIsolationTests() {
  console.log('🚀 Starting Auth & User Isolation Verification Tests...\n');
  let passed = 0;
  let failed = 0;

  // Start app on ephemeral port
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  ✅ PASSED: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAILED: ${name}`);
      console.error(`     Error: ${err.message}`);
      failed++;
    }
  }

  const secret = process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET || 'dev-jwt-secret-shramsaathi-2026';

  const userAId = '11111111-1111-4111-a111-111111111111';
  const tokenA = jwt.sign(
    { sub: userAId, user_id: userAId, role: 'customer', user_metadata: { full_name: 'User Alpha', phone: '9111111111' } },
    secret,
    { expiresIn: '1h' }
  );

  const userBId = '22222222-2222-4222-a222-222222222222';
  const tokenB = jwt.sign(
    { sub: userBId, user_id: userBId, role: 'customer', user_metadata: { full_name: 'User Beta', phone: '9222222222' } },
    secret,
    { expiresIn: '1h' }
  );

  try {
    // 1. Unauthenticated request rejection
    await test('Unauthenticated profile request should return 401 Unauthorized', async () => {
      const res = await fetch(`${baseUrl}/api/v1/customer/profile`);
      assert.strictEqual(res.status, 401, `Expected 401 but got ${res.status}`);
    });

    // 2. Invalid token rejection
    await test('Invalid token profile request should return 401 Unauthorized', async () => {
      const res = await fetch(`${baseUrl}/api/v1/customer/profile`, {
        headers: { Authorization: 'Bearer invalid.token.payload' }
      });
      assert.strictEqual(res.status, 401, `Expected 401 but got ${res.status}`);
    });

    // 3. User A profile isolation
    await test('User A profile request should return User A identity', async () => {
      const res = await fetch(`${baseUrl}/api/v1/customer/profile`, {
        headers: { Authorization: `Bearer ${tokenA}` }
      });
      assert.strictEqual(res.status, 200, `Expected 200 but got ${res.status}`);
      const body = await res.json();
      assert.ok(body.profile, 'Profile object should be returned');
      assert.strictEqual(body.profile.user_id, userAId, 'Profile user_id must match User A ID');
      assert.notStrictEqual(body.profile.full_name, 'Dev User', 'Must not return hardcoded Dev User');
    });

    // 4. User B profile isolation
    await test('User B profile request should return User B identity and not User A', async () => {
      const res = await fetch(`${baseUrl}/api/v1/customer/profile`, {
        headers: { Authorization: `Bearer ${tokenB}` }
      });
      assert.strictEqual(res.status, 200, `Expected 200 but got ${res.status}`);
      const body = await res.json();
      assert.ok(body.profile, 'Profile object should be returned');
      assert.strictEqual(body.profile.user_id, userBId, 'Profile user_id must match User B ID');
      assert.notStrictEqual(body.profile.user_id, userAId, 'User B must NOT receive User A profile');
    });

    // 5. User A creates a booking
    let bookingAId = null;
    await test('User A creates a booking successfully', async () => {
      const res = await fetch(`${baseUrl}/api/v1/bookings`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokenA}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          skill_slug: 'electrician',
          service_address: '123 Alpha Street, Bengaluru',
          latitude: 12.9716,
          longitude: 77.5946,
          scheduled_start_at: new Date(Date.now() + 86400000).toISOString(),
          customer_notes: 'Urgent wiring fix'
        })
      });
      const body = await res.json();
      assert.strictEqual(res.status, 201, `Expected 201 but got ${res.status}: ${JSON.stringify(body)}`);
      assert.ok(body.booking && body.booking.id, 'Booking object with ID must be returned');
      bookingAId = body.booking.id;
    });

    // 6. User B booking list isolation (User B must NOT see User A's booking)
    await test('User B booking list does NOT contain User A booking', async () => {
      const res = await fetch(`${baseUrl}/api/v1/bookings/my`, {
        headers: { Authorization: `Bearer ${tokenB}` }
      });
      assert.strictEqual(res.status, 200, `Expected 200 but got ${res.status}`);
      const body = await res.json();
      const bList = body.bookings || [];
      const leakedBooking = bList.find(b => b.id === bookingAId);
      assert.strictEqual(leakedBooking, undefined, 'User A booking MUST NOT leak into User B booking list');
    });

    // 7. User B cross-user single booking fetch prevention
    await test('User B fetching User A booking by ID returns 403 Forbidden', async () => {
      if (!bookingAId) throw new Error('No booking created for User A');
      const res = await fetch(`${baseUrl}/api/v1/bookings/${bookingAId}`, {
        headers: { Authorization: `Bearer ${tokenB}` }
      });
      assert.strictEqual(res.status, 403, `Expected 403 Forbidden but got ${res.status}`);
    });

    // 8. User B cross-user booking cancellation prevention
    await test('User B cancelling User A booking returns 403 Forbidden', async () => {
      if (!bookingAId) throw new Error('No booking created for User A');
      const res = await fetch(`${baseUrl}/api/v1/bookings/${bookingAId}/cancel`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${tokenB}` }
      });
      assert.strictEqual(res.status, 403, `Expected 403 Forbidden but got ${res.status}`);
    });

    // 9. User B payload tampering prevention
    await test('User B sending User A userId in body/query does not override User B auth', async () => {
      const res = await fetch(`${baseUrl}/api/v1/customer/profile?userId=${userAId}`, {
        headers: { Authorization: `Bearer ${tokenB}` }
      });
      assert.strictEqual(res.status, 200, `Expected 200 but got ${res.status}`);
      const body = await res.json();
      assert.strictEqual(body.profile.user_id, userBId, 'Server must enforce token user_id over query parameter');
    });

  } finally {
    server.close();
  }

  console.log(`\n📊 Verification Summary: ${passed} Passed, ${failed} Failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

runAuthIsolationTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
