const calendarService = require('../services/calendar.service');
const weatherService = require('../services/weather.service');
const { calculatePrice } = require('../services/pricing.service');
const { holidayProvider } = require('../services/providers/holiday.provider');

async function runTests() {
  console.log('=== Running ShramSaathi Revised Calendar & Event Context Test Suite ===\n');

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] ${name}\n       ${err.message}`);
      failed++;
    }
  }

  function assert(condition, message) {
    if (!condition) {
      throw new Error(message || 'Assertion failed');
    }
  }

  // Test 1: Granular Event Classification (Facts -> Classification)
  await test('Test 1: Granular Event Classification (Marathon -> SPORTS_EVENT, Summit -> MAJOR_EVENT)', async () => {
    const marathonClass = calendarService.classifyEvent({ name: 'Delhi Half Marathon 2026' });
    assert(marathonClass === 'SPORTS_EVENT', `Expected SPORTS_EVENT for marathon, got ${marathonClass}`);

    const summitClass = calendarService.classifyEvent({ name: 'BRICS Summit 2026' });
    assert(summitClass === 'MAJOR_EVENT', `Expected MAJOR_EVENT for summit, got ${summitClass}`);
  });

  // Test 2: System-Derived Rule-Based Impact Estimation (Ignores Manual Multiplier Overrides)
  await test('Test 2: System Derivation of Impact Multipliers from Facts', async () => {
    const created = await calendarService.createEvent({
      name: 'Trade Expo Noida 2026',
      city: 'Noida',
      state: 'Uttar Pradesh',
      affectedArea: 'Sector 62',
      startDate: '2026-10-15',
      endDate: '2026-10-17',
      // Manual attempt to pass fake multipliers should be ignored by createEvent
      demandImpact: 9.99,
      type: 'FAKE_TYPE'
    });

    assert(created.type === 'MAJOR_EVENT', `Expected derived type MAJOR_EVENT, got ${created.type}`);
    assert(created.demand_impact < 3.0, `Manual multiplier 9.99 was not ignored, got ${created.demand_impact}`);
    assert(Array.isArray(created.analysis_reasons), 'Analysis reasons missing');
  });

  // Test 3: New Indian City Support (Noida)
  await test('Test 3: Flexible Indian City Support (Noida, Uttar Pradesh)', async () => {
    const ctx = await calendarService.getCalendarContext({
      bookingDate: '2026-10-16',
      bookingTime: '12:00',
      city: 'Noida',
      pickupLocation: 'Sector 62'
    });

    assert(ctx.city === 'Noida', `Expected city Noida, got ${ctx.city}`);
    assert(ctx.eventPresent === true, 'Expected event to match Noida');
  });

  // Test 4: Weekend System Context Detection (Sunday)
  await test('Test 4: Weekend System Context Detection (Sunday)', async () => {
    const ctx = await calendarService.getCalendarContext({
      bookingDate: '2026-09-20',
      bookingTime: '14:00',
      city: 'Delhi'
    });
    assert(ctx.isWeekend === true, `Expected isWeekend true, got ${ctx.isWeekend}`);
    assert(ctx.dayOfWeek === 'Sunday', `Expected Sunday, got ${ctx.dayOfWeek}`);
  });

  // Test 5: 3-Tier Holiday Provider Fallback (Diwali 2026)
  await test('Test 5: 3-Tier Holiday Provider Fallback (Diwali 2026 when .env is empty)', async () => {
    const holiday = await holidayProvider.resolveHolidayContext('2026-11-08');
    assert(holiday !== null, 'Holiday resolve failed for Diwali');
    assert(holiday.name === 'Diwali', `Expected Diwali, got ${holiday.name}`);
    assert(holiday.datasetSource.includes('2026'), 'Dataset source missing');
  });

  // Test 6: Pricing Guardrails (0.82–1.18x)
  await test('Test 6: Fair Pricing Guardrails (0.82–1.18 Floor/Ceiling)', () => {
    const standardPrice = 500;
    const floorPrice = 410;
    const ceilingPrice = 590;

    const highResult = calculatePrice({ standardPrice, demandRatio: 2.5, floorPrice, ceilingPrice });
    assert(highResult.finalPrice <= ceilingPrice, `Final price ${highResult.finalPrice} exceeded ceiling ${ceilingPrice}`);

    const lowResult = calculatePrice({ standardPrice, demandRatio: 0.1, floorPrice, ceilingPrice });
    assert(lowResult.finalPrice >= floorPrice, `Final price ${lowResult.finalPrice} below floor ${floorPrice}`);
  });

  console.log(`\n=== Summary: ${passed} Passed, ${failed} Failed ===`);
  if (failed > 0) process.exit(1);
}

runTests();
