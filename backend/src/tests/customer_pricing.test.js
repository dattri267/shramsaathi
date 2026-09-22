const http = require('http');
const app = require('../app');
const assert = require('assert');
const jwt = require('jsonwebtoken');

async function runCustomerPricingTests() {
  console.log('🚀 Testing Automated Internal Customer Task Pricing Estimation...\n');

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const secret = process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET || 'dev-jwt-secret-shramsaathi-2026';
  const userId = '33333333-3333-4333-a333-333333333333';
  const token = jwt.sign(
    { sub: userId, user_id: userId, role: 'customer' },
    secret,
    { expiresIn: '1h' }
  );

  try {
    // Test 1: Customer enters location and task
    const res = await fetch(`${baseUrl}/api/customer/pricing/estimate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        task: 'electrician',
        location: 'Sector 62, Noida',
        scheduled_start_at: new Date().toISOString()
      })
    });

    assert.strictEqual(res.status, 200, `Expected 200 OK, got ${res.status}`);
    const body = await res.json();

    console.log('  Response Payload:', JSON.stringify(body, null, 2));

    assert.strictEqual(body.task, 'electrician', 'Task should match electrician');
    assert.strictEqual(body.location, 'Sector 62, Noida', 'Location should match user input');
    assert.ok(typeof body.estimated_price === 'number', 'Estimated price must be a number');
    assert.ok(body.estimated_price >= body.fair_pricing_guardrails.floor, 'Estimated price should respect price floor');
    assert.ok(body.estimated_price <= body.fair_pricing_guardrails.ceiling, 'Estimated price should respect price ceiling');
    assert.ok(body.calendar_context, 'Calendar context must be automatically resolved');
    assert.ok(body.weather_context, 'Weather context must be automatically resolved');

    console.log('\n  ✅ PASSED: Customer task location-based dynamic pricing estimation');
  } finally {
    server.close();
  }
}

runCustomerPricingTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
