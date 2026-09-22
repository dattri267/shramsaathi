const calendarService = require('../services/calendar.service');
const { calculatePrice } = require('../services/pricing.service');

describe('Calendar & Event Context Layer Tests', () => {

  test('01. Weekend Detection from booking date', async () => {
    // 2026-09-20 is Sunday
    const context = await calendarService.getCalendarContext({
      bookingDate: '2026-09-20',
      bookingTime: '14:00',
      city: 'Delhi'
    });

    expect(context.isWeekend).toBe(true);
    expect(context.dayOfWeek).toBe('Sunday');
  });

  test('02. Normal Weekday Detection', async () => {
    // 2026-09-14 is Monday
    const context = await calendarService.getCalendarContext({
      bookingDate: '2026-09-14',
      bookingTime: '10:00',
      city: 'Delhi'
    });

    expect(context.isWeekend).toBe(false);
    expect(context.dayOfWeek).toBe('Monday');
  });

  test('03. Festival Holiday Resolution', async () => {
    // 2026-11-08 is Diwali
    const context = await calendarService.getCalendarContext({
      bookingDate: '2026-11-08',
      city: 'Delhi'
    });

    expect(context.isHoliday).toBe(true);
    expect(context.holidayName).toBe('Diwali');
    expect(context.demandImpact).toBeGreaterThan(1.1);
  });

  test('04. Location-Aware Event Impact (Affected Area)', async () => {
    // BRICS Summit in Central Delhi 2026-09-12 (08:00 - 20:00)
    const affectedContext = await calendarService.getCalendarContext({
      bookingDate: '2026-09-12',
      bookingTime: '12:00',
      city: 'Delhi',
      pickupLocation: 'Noida',
      destinationLocation: 'Central Delhi'
    });

    expect(affectedContext.eventPresent).toBe(true);
    expect(affectedContext.locationAffected).toBe(true);
    expect(affectedContext.trafficImpact).toBeGreaterThan(1.2);
  });

  test('05. Location-Aware Event Impact (Unaffected Area)', async () => {
    const unaffectedContext = await calendarService.getCalendarContext({
      bookingDate: '2026-09-12',
      bookingTime: '12:00',
      city: 'Delhi',
      pickupLocation: 'Noida Sector 62',
      destinationLocation: 'Greater Noida'
    });

    expect(unaffectedContext.locationAffected).toBe(false);
  });

  test('06. Time-Aware Event Impact (Outside Hours)', async () => {
    const nightContext = await calendarService.getCalendarContext({
      bookingDate: '2026-09-12',
      bookingTime: '23:00',
      city: 'Delhi',
      pickupLocation: 'Central Delhi',
      destinationLocation: 'Central Delhi'
    });

    expect(nightContext.eventPresent).toBe(false);
  });

  test('07. Fair Price Bounded Guards Enforcement', () => {
    const standardPrice = 500;
    const floorPrice = 410;   // 0.82 * 500
    const ceilingPrice = 590; // 1.18 * 500

    // Extreme high demand ratio
    const highResult = calculatePrice({
      standardPrice,
      demandRatio: 2.5,
      floorPrice,
      ceilingPrice
    });

    expect(highResult.finalPrice).toBeLessThanOrEqual(ceilingPrice);

    // Extreme low demand ratio
    const lowResult = calculatePrice({
      standardPrice,
      demandRatio: 0.1,
      floorPrice,
      ceilingPrice
    });

    expect(lowResult.finalPrice).toBeGreaterThanOrEqual(floorPrice);
  });

});
