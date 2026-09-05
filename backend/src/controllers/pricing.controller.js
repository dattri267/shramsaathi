const { calculatePrice } = require('../services/pricing.service');

const AI_ENGINE_BASE_URL =
  process.env.AI_ENGINE_BASE_URL || 'http://127.0.0.1:8001';

const SERVICE_BASELINES = {
  electrician: 800,
  plumber: 650,
  carpenter: 900,
  painter: 1000,
  'domestic-helper': 600,
  caregiver: 800,
  technician: 850
};

const MODEL_CATEGORIES = {
  electrician: 'Electrician',
  plumber: 'Plumber',
  carpenter: 'Carpenter',
  painter: 'Painter',
  'domestic-helper': 'Domestic Helper',
  caregiver: 'Caregiver',
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
  const input = String(value || '').trim().toLowerCase();

  return (
    MODEL_CITIES.find(
      city => city.toLowerCase() === input
    ) || 'Bengaluru'
  );
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
    const skill = normalizeSlug(
      req.body.skill_slug || req.body.category
    );

    const category = MODEL_CATEGORIES[skill];
    const currentPrice = SERVICE_BASELINES[skill];

    if (!category || currentPrice === undefined) {
      return res.status(400).json({
        error:
          `Unsupported service category: ` +
          `${req.body.skill_slug || req.body.category || ''}`
      });
    }

    const city = normalizeModelCity(req.body.city);
    const date =
      req.body.date ||
      new Date().toISOString().slice(0, 10);
    const weather = req.body.weather || 'Clear';
    const events = req.body.events || 'Normal day';

    const response = await fetch(
      `${AI_ENGINE_BASE_URL}/predict`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          city,
          category,
          date,
          currentPrice,
          weather,
          events
        })
      }
    );

    let data = null;

    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      return res.status(502).json({
        error:
          data?.detail ||
          data?.error ||
          `AI engine returned ${response.status}`
      });
    }

    res.json({
      ...data,
      serviceSlug: skill,
      cityUsedByModel: city,
      priceSource: 'RandomForestRegressor'
    });
  } catch (err) {
    console.error('AI price prediction failed:', err);

    res.status(502).json({
      error:
        'Unable to get the service price from the AI pricing model. ' +
        'Make sure the AI engine is running on port 8001.'
    });
  }
}

module.exports = {
  calculateBookingPrice,
  predictBookingPrice
};
