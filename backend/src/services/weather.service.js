/**
 * Automated Live Weather Service via Open-Meteo API
 * Accepts exact Latitude & Longitude or City/Address string
 * Zero API keys required - No expiration risk - Includes seasonal fallback
 */

const CITY_COORDINATES = {
  delhi: { lat: 28.6139, lon: 77.2090, name: 'Delhi' },
  mumbai: { lat: 19.0760, lon: 72.8777, name: 'Mumbai' },
  bengaluru: { lat: 12.9716, lon: 77.5946, name: 'Bengaluru' },
  bangalore: { lat: 12.9716, lon: 77.5946, name: 'Bengaluru' },
  hyderabad: { lat: 17.3850, lon: 78.4867, name: 'Hyderabad' },
  noida: { lat: 28.5355, lon: 77.3910, name: 'Noida' },
  gurgaon: { lat: 28.4595, lon: 77.0266, name: 'Gurgaon' },
  gurugram: { lat: 28.4595, lon: 77.0266, name: 'Gurgaon' },
  pune: { lat: 18.5204, lon: 73.8567, name: 'Pune' },
  kolkata: { lat: 22.5726, lon: 88.3639, name: 'Kolkata' },
  chennai: { lat: 13.0827, lon: 80.2707, name: 'Chennai' },
  jaipur: { lat: 26.9124, lon: 75.7873, name: 'Jaipur' },
  ahmedabad: { lat: 23.0225, lon: 72.5714, name: 'Ahmedabad' }
};

function normalizeStr(str) {
  return String(str || '').trim().toLowerCase();
}

function resolveCoords(latitude, longitude, locationStr, cityStr) {
  if (latitude !== undefined && longitude !== undefined && !isNaN(Number(latitude)) && !isNaN(Number(longitude))) {
    return { lat: Number(latitude), lon: Number(longitude), name: `GPS (${latitude}, ${longitude})` };
  }

  const normLoc = normalizeStr(locationStr);
  const normCity = normalizeStr(cityStr);

  for (const [key, coords] of Object.entries(CITY_COORDINATES)) {
    if (normLoc.includes(key) || normCity.includes(key)) {
      return coords;
    }
  }

  // Default to Delhi if location is unlisted
  return CITY_COORDINATES.delhi;
}

/**
 * Maps WMO weather code & temperature to ShramSaathi weather categories:
 * "Clear", "Rain", or "Extreme heat"
 */
function mapWMOToWeatherCategory(weatherCode, maxTemp) {
  if (maxTemp >= 40.0) return 'Extreme heat';
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(weatherCode)) {
    return 'Rain';
  }
  return 'Clear';
}

function getSeasonalFallbackWeather(locationStr, dateStr) {
  let month = new Date().getMonth() + 1;
  if (dateStr) {
    const parts = String(dateStr).split('-');
    if (parts.length >= 2) {
      month = parseInt(parts[1], 10) || month;
    }
  }

  if ([6, 7, 8, 9].includes(month)) return 'Rain';
  if ([4, 5].includes(month)) return 'Extreme heat';
  return 'Clear';
}

/**
 * Main Weather Resolver - Accepts exact Lat/Lon or City/Address string
 */
async function getWeatherForBooking({ latitude, longitude, location, city, date }) {
  const coords = resolveCoords(latitude, longitude, location, city);
  const dateVal = date || new Date().toISOString().slice(0, 10);

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&daily=weathercode,temperature_2m_max&timezone=auto`;
    const response = await fetch(url, { signal: AbortSignal.timeout(3000) });

    if (response.ok) {
      const data = await response.json();
      const code = data.daily?.weathercode?.[0] ?? 0;
      const maxTemp = data.daily?.temperature_2m_max?.[0] ?? 32.0;
      const resolvedCategory = mapWMOToWeatherCategory(code, maxTemp);

      return {
        weather: resolvedCategory,
        source: `Open-Meteo Live API (${coords.name})`,
        cityMatched: coords.name,
        maxTemp,
        weatherCode: code
      };
    }
  } catch (err) {
    console.warn(`[weather.service] Open-Meteo API unreachable (${err.message}). Using seasonal fallback.`);
  }

  const fallbackCategory = getSeasonalFallbackWeather(location || city, dateVal);
  return {
    weather: fallbackCategory,
    source: 'Seasonal Fallback Engine',
    cityMatched: coords.name,
    maxTemp: fallbackCategory === 'Extreme heat' ? 41 : (fallbackCategory === 'Rain' ? 28 : 32),
    weatherCode: 0
  };
}

module.exports = {
  getWeatherForBooking,
  CITY_COORDINATES
};
