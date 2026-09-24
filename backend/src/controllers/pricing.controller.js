const { calculatePrice } = require('../services/pricing.service');
const { predictDynamicPrice } = require('../services/dynamic-pricing.service');
const calendarService = require('../services/calendar.service');
const weatherService = require('../services/weather.service');

const AI_ENGINE_BASE_URL =
  process.env.AI_ENGINE_BASE_URL || 'http://127.0.0.1:8001';

const SERVICE_BASELINES = {
  electrician: 800,
  plumber: 650,
  carpenter: 900,
  painter: 1000,
  'domestic-helper': 600,
  caregiver: 800,
  drivers: 750,
  gardener: 650,
  cleaner: 700,
  technician: 850
};

const MODEL_CATEGORIES = {
  electrician: 'Electrician',
  plumber: 'Plumber',
  carpenter: 'Carpenter',
  carpentry: 'Carpenter',
  painter: 'Painter',
  'domestic-helper': 'Domestic Helper',
  caregiver: 'Caregiver',
  drivers: 'Drivers',
  driver: 'Drivers',
  gardener: 'Gardener',
  cleaner: 'Cleaner',
  technician: 'Technician'
};

const MODEL_CITIES = [
  'Bengaluru',
  'Mumbai',
  'Delhi',
  'Hyderabad'
];

function normalizeSlug(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeModelCity(value) {
  const input = String(value || '').trim();
  if (!input) return 'Bengaluru';
  return input.charAt(0).toUpperCase() + input.slice(1);
}

async function calculateBookingPrice(req, res) {
  try {
    const {
      standardPrice,
      demandRatio,
      floorPrice,
      ceilingPrice
    } = req.body;

    if (
      standardPrice === undefined ||
      floorPrice === undefined ||
      ceilingPrice === undefined
    ) {
      return res.status(400).json({
        error: 'standardPrice, floorPrice and ceilingPrice are required'
      });
    }

    const result = calculatePrice({
      standardPrice: Number(standardPrice),
      demandRatio:
        demandRatio === undefined ? 1 : Number(demandRatio),
      floorPrice: Number(floorPrice),
      ceilingPrice: Number(ceilingPrice)
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(400).json({
      error: err.message
    });
  }
}

async function predictBookingPrice(req, res) {
  try {
    // For a real booking preview, use the exact same pricing service and
    // booking context as booking.service.js. This prevents the preview
    // price from using a different calculation path than the final price.
    if (
      req.body?.scheduled_start_at &&
      req.body?.service_address &&
      req.body?.latitude !== undefined &&
      req.body?.longitude !== undefined
    ) {
      const skillSlug =
        req.body.skill_slug ||
        req.body.service ||
        req.body.task ||
        req.body.category;

      if (!skillSlug) {
        return res.status(400).json({ error: 'skill_slug is required' });
      }

      const result = await predictDynamicPrice({
        skillSlug,
        subCategory: req.body.subCategory || req.body.sub_category || '',
        serviceAddress: req.body.service_address,
        latitude: Number(req.body.latitude),
        longitude: Number(req.body.longitude),
        city: req.body.city,
        scheduledStartAt: req.body.scheduled_start_at
      });

      return res.json(result);
    }
    const skill = normalizeSlug(
      req.body.task || req.body.skill_slug || req.body.category || req.body.service
    );

    const category = MODEL_CATEGORIES[skill] || req.body.category || 'Electrician';
    const subCategory = req.body.subCategory || req.body.sub_category || '';
    const currentPrice = req.body.currentPrice ? Number(req.body.currentPrice) : (SERVICE_BASELINES[skill] || 800);

    const inputLocation = req.body.location || req.body.service_address || req.body.address || req.body.city || 'Bengaluru';
    const city = normalizeModelCity(req.body.city || inputLocation);
    const date =
      req.body.date ||
      req.body.scheduled_start_at ? new Date(req.body.scheduled_start_at).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
    const time = req.body.time || '12:00';
    const pickupLocation = req.body.pickupLocation || req.body.pickup || inputLocation;
    const destinationLocation = req.body.destinationLocation || req.body.destination || '';

    // Automatic Live Location Weather Resolution via Open-Meteo API
    let weather = req.body.weather;
    let weatherSource = 'User Select';

    if (!weather || weather === 'Auto' || weather === 'Auto (Open-Meteo)') {
      const resolvedWeatherInfo = await weatherService.getWeatherForBooking({
        location: inputLocation,
        city,
        date
      });
      weather = resolvedWeatherInfo.weather;
      weatherSource = resolvedWeatherInfo.source;
    }

    let events = req.body.events || 'Normal day';

    // Get Calendar Context as Single Source of Truth from Node calendar.service
    const calendarContext = await calendarService.getCalendarContext({
      bookingDate: date,
      bookingTime: time,
      city,
      pickupLocation,
      destinationLocation
    });

    if (calendarContext.isHoliday) {
      events = 'Holiday';
    } else if (calendarContext.eventPresent) {
      events = 'Major event';
    }

    let data = null;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const response = await fetch(
        `${AI_ENGINE_BASE_URL}/predict`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            city,
            category,
            subCategory,
            date,
            time,
            pickupLocation,
            destinationLocation,
            currentPrice,
            weather,
            events,
            weatherSource,
            calendarContext
          }),
          signal: controller.signal
        }
      );
      clearTimeout(timeoutId);

      if (response.ok) {
        data = await response.json();
      }
    } catch (e) {
      console.warn(`⚠️ Internal AI pricing call timed out/failed (${e.message}). Using system baseline rate ${currentPrice}.`);
    }

    const suggestedPrice = data?.suggestedPrice ? Number(data.suggestedPrice) : currentPrice;
    const demandRatio = data?.ratio ? Number(data.ratio) : 1.0;

    return res.json({
      task: skill || category,
      location: inputLocation,
      city,
      suggestedPrice: suggestedPrice,
      estimated_price: suggestedPrice,
      standard_baseline_price: currentPrice,
      demand_ratio: demandRatio,
      fair_pricing_guardrails: {
        floor: Number((currentPrice * 0.82).toFixed(2)),
        ceiling: Number((currentPrice * 1.18).toFixed(2))
      },
      weather_context: weather,
      weather_source: weatherSource,
      calendar_context: calendarContext,
      price_source: data ? 'RandomForestRegressor' : 'SystemBaselineGuardrail',
      message: 'Automated dynamic price estimation computed internally based on user location and task.'
    });
  } catch (err) {
    console.error('Automated task price estimation failed:', err);

    const defaultPrice = 800;
    return res.json({
      suggestedPrice: defaultPrice,
      estimated_price: defaultPrice,
      standard_baseline_price: defaultPrice,
      demand_ratio: 1.0,
      fair_pricing_guardrails: { floor: 656, ceiling: 944 },
      price_source: 'SystemDefaultFallback',
      message: 'Baseline price returned.'
    });
  }
}

async function estimateCustomerTaskPrice(req, res) {
  return predictBookingPrice(req, res);
}

module.exports = {
  calculateBookingPrice,
  predictBookingPrice,
  estimateCustomerTaskPrice
};
