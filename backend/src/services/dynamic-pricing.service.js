const calendarService = require('./calendar.service');
const weatherService = require('./weather.service');

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
  'Hyderabad',
  'Kolkata',
  'Chennai',
  'Pune',
  'Jaipur',
  'Ahmedabad',
  'Noida',
  'Gurgaon'
];

function normalizeSlug(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeModelCity(value) {
  const input = String(value || '').trim().toLowerCase();
  return MODEL_CITIES.find(city => city.toLowerCase() === input) ||
    (input ? input.charAt(0).toUpperCase() + input.slice(1) : 'Bengaluru');
}

function extractDateTime({ date, time, scheduledStartAt }) {
  if (scheduledStartAt) {
    const scheduled = new Date(scheduledStartAt);
    if (!Number.isNaN(scheduled.getTime())) {
      const localHours = String(scheduled.getHours()).padStart(2, '0');
      const localMinutes = String(scheduled.getMinutes()).padStart(2, '0');
      return {
        date: scheduled.toISOString().slice(0, 10),
        time: `${localHours}:${localMinutes}`
      };
    }
  }

  return {
    date: date || new Date().toISOString().slice(0, 10),
    time: time || '12:00'
  };
}

async function predictDynamicPrice({
  skillSlug,
  subCategory = '',
  serviceAddress = '',
  latitude,
  longitude,
  city,
  date,
  time,
  scheduledStartAt
}) {
  const skill = normalizeSlug(skillSlug);
  const category = MODEL_CATEGORIES[skill] || 'Electrician';
  const currentPrice = SERVICE_BASELINES[skill] || 800;
  const inputLocation =
    typeof serviceAddress === 'string'
      ? serviceAddress
      : JSON.stringify(serviceAddress || {});

  const resolvedCity = normalizeModelCity(city || inputLocation);
  const resolvedDateTime = extractDateTime({ date, time, scheduledStartAt });

  const weatherInfo = await weatherService.getWeatherForBooking({
    latitude,
    longitude,
    location: inputLocation,
    city: resolvedCity,
    date: resolvedDateTime.date
  });

  const calendarContext = await calendarService.getCalendarContext({
    bookingDate: resolvedDateTime.date,
    bookingTime: resolvedDateTime.time,
    city: resolvedCity,
    pickupLocation: inputLocation,
    destinationLocation: '',
    latitude,
    longitude
  });

  let events = 'Normal day';
  if (calendarContext.isHoliday) {
    events = 'Holiday';
  } else if (calendarContext.eventPresent) {
    events = 'Major event';
  }

  const payload = {
    city: resolvedCity,
    category,
    subCategory,
    date: resolvedDateTime.date,
    time: resolvedDateTime.time,
    pickupLocation: inputLocation,
    destinationLocation: '',
    currentPrice,
    weather: weatherInfo.weather,
    events,
    weatherSource: weatherInfo.source,
    calendarContext
  };

  let data = null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(`${AI_ENGINE_BASE_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      data = await response.json();
    } else {
      console.warn(`AI pricing engine returned HTTP ${response.status}`);
    }
  } catch (err) {
    console.warn(`AI pricing engine request failed (${err.message}). Using service baseline.`);
  }

  const suggestedPrice = Number(data?.suggestedPrice);
  const finalPrice = Number.isFinite(suggestedPrice) && suggestedPrice > 0
    ? suggestedPrice
    : currentPrice;

  return {
    suggestedPrice: finalPrice,
    estimated_price: finalPrice,
    standard_baseline_price: currentPrice,
    demand_ratio: Number.isFinite(Number(data?.ratio)) ? Number(data.ratio) : 1,
    weather_context: weatherInfo.weather,
    weather_source: weatherInfo.source,
    calendar_context: calendarContext,
    price_source: data ? 'RandomForestRegressor' : 'ServiceBaselineFallback',
    model_version: data?.modelVersion || null
  };
}

module.exports = {
  predictDynamicPrice,
  SERVICE_BASELINES,
  MODEL_CATEGORIES
};
