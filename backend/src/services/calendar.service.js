/**
 * Calendar & Event Context Layer — Single Source of Truth
 * 
 * Pipeline Architecture:
 * Admin Event Facts -> Location Normalization -> Holiday Provider -> Rule-Based Classification -> Rule-Based Impact Estimation -> Context Resolution
 */

const { holidayProvider } = require('./providers/holiday.provider');

let prisma = null;
try {
  if (process.env.DATABASE_URL) {
    prisma = require('../config/db');
  }
} catch (e) {
  prisma = null;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Representative Event Centers Coordinates (for Haversine GPS proximity matching)
const EVENT_CENTER_COORDS = {
  'central delhi': { lat: 28.6139, lon: 77.2090, radiusKm: 12 },
  'south delhi': { lat: 28.5355, lon: 77.2610, radiusKm: 10 },
  'bandra mumbai': { lat: 19.0596, lon: 72.8295, radiusKm: 10 },
  'mg road bengaluru': { lat: 12.9756, lon: 77.6066, radiusKm: 10 },
  'hitech city hyderabad': { lat: 17.4435, lon: 78.3772, radiusKm: 10 },
  'noida sector 62': { lat: 28.6280, lon: 77.3649, radiusKm: 10 }
};

// In-memory event store fallback
let inMemoryEvents = [
  {
    id: 'demo-brics-2026',
    name: 'BRICS Summit 2026',
    type: 'MAJOR_EVENT',
    startDate: '2026-09-11',
    endDate: '2026-09-13',
    startTime: '08:00',
    endTime: '20:00',
    city: 'Delhi',
    state: 'Delhi',
    affectedArea: 'Central Delhi',
    impactLevel: 'HIGH',
    demandImpact: 1.35,
    availabilityImpact: 0.70,
    trafficImpact: 1.45,
    description: 'International summit causing major road closures and heightened security in Central Delhi.',
    source: 'ADMIN',
    status: 'ACTIVE',
    analysisReasons: [
      'Rule-based: Major international summit event scale',
      'Rule-based: Targeted high-density area (Central Delhi)',
      'Rule-based: Peak operating hours (08:00 - 20:00)'
    ],
    active: true
  }
];

function normalizeStr(str) {
  return String(str || '').trim().toLowerCase();
}

function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function parseDate(dateStr) {
  if (!dateStr) return new Date();
  const parts = String(dateStr).split('-');
  if (parts.length === 3) {
    const yr = parseInt(parts[0], 10);
    const mo = parseInt(parts[1], 10) - 1;
    const dy = parseInt(parts[2], 10);
    return new Date(yr, mo, dy);
  }
  return new Date(dateStr);
}

function checkTimeRange(bookingTimeStr, startTimeStr, endTimeStr) {
  if (!startTimeStr || !endTimeStr) return true;
  if (!bookingTimeStr) return true;

  const toMins = (tStr) => {
    const [h, m] = String(tStr).split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const bMins = toMins(bookingTimeStr);
  const sMins = toMins(startTimeStr);
  const eMins = toMins(endTimeStr);

  if (sMins <= eMins) {
    return bMins >= sMins && bMins <= eMins;
  } else {
    return bMins >= sMins || bMins <= eMins;
  }
}

/**
 * Granular Rule-Based Event Classification Engine
 * Carefully categorizes event facts based on keywords and context.
 */
function classifyEvent(eventFacts) {
  const text = normalizeStr(`${eventFacts.name || ''} ${eventFacts.description || ''} ${eventFacts.affectedArea || ''}`);

  if (text.includes('summit') || text.includes('conference') || text.includes('expo') || text.includes('convention') || text.includes('g20') || text.includes('brics')) {
    return 'MAJOR_EVENT';
  }
  if (text.includes('marathon') || text.includes('match') || text.includes('tournament') || text.includes('stadium') || text.includes('sports') || text.includes('ipl') || text.includes('trophy')) {
    return 'SPORTS_EVENT'; // Marathon is explicitly classified as SPORTS_EVENT
  }
  if (text.includes('concert') || text.includes('music show') || text.includes('live show') || text.includes('gig') || text.includes('performance')) {
    return 'CONCERT';
  }
  if (text.includes('festival') || text.includes('mela') || text.includes('puja') || text.includes('celebration') || text.includes('fair') || text.includes('carnival')) {
    return 'FESTIVAL';
  }
  if (text.includes('strike') || text.includes('bandh') || text.includes('protest') || text.includes('rally') || text.includes('dharna')) {
    return 'STRIKE';
  }
  if (text.includes('road closure') || text.includes('construction') || text.includes('flyover work') || text.includes('metro work')) {
    return 'ROAD_DISRUPTION';
  }
  if (text.includes('traffic restriction') || text.includes('vehicle restriction') || text.includes('vip movement') || text.includes('diversion')) {
    return 'TRAFFIC_RESTRICTION';
  }

  return 'LOCAL_EVENT';
}

/**
 * Rule-Based Impact Estimation Layer
 * Calculates deterministic multipliers and explainable reasons based on facts & classification.
 */
function estimateEventImpact(eventFacts) {
  const type = classifyEvent(eventFacts);
  const text = normalizeStr(`${eventFacts.name || ''} ${eventFacts.description || ''} ${eventFacts.affectedArea || ''}`);

  let demandImpact = 1.0;
  let availabilityImpact = 1.0;
  let trafficImpact = 1.0;
  let impactLevel = 'MEDIUM';
  const reasons = [];

  reasons.push(`Rule-based classification: ${type}`);

  switch (type) {
    case 'MAJOR_EVENT':
      demandImpact = 1.35;
      availabilityImpact = 0.70;
      trafficImpact = 1.45;
      impactLevel = 'HIGH';
      reasons.push('Rule-based: High expected international/national attendance scale');
      break;

    case 'SPORTS_EVENT':
      demandImpact = 1.25;
      availabilityImpact = 0.80;
      trafficImpact = 1.35;
      impactLevel = 'MEDIUM';
      reasons.push('Rule-based: Sports/Marathon crowd gathering and localized venue congestion');
      break;

    case 'CONCERT':
      demandImpact = 1.28;
      availabilityImpact = 0.78;
      trafficImpact = 1.30;
      impactLevel = 'MEDIUM';
      reasons.push('Rule-based: Evening entertainment footfall and localized transport demand');
      break;

    case 'FESTIVAL':
      demandImpact = 1.30;
      availabilityImpact = 0.65;
      trafficImpact = 1.25;
      impactLevel = 'HIGH';
      reasons.push('Rule-based: High widespread holiday demand and reduced worker availability');
      break;

    case 'STRIKE':
      demandImpact = 0.90;
      availabilityImpact = 0.50;
      trafficImpact = 1.50;
      impactLevel = 'HIGH';
      reasons.push('Rule-based: Severe transport disruption and restricted mobility');
      break;

    case 'ROAD_DISRUPTION':
    case 'TRAFFIC_RESTRICTION':
      demandImpact = 1.05;
      availabilityImpact = 0.85;
      trafficImpact = 1.40;
      impactLevel = 'MEDIUM';
      reasons.push('Rule-based: Area road closures increase worker travel times');
      break;

    default:
      demandImpact = 1.15;
      availabilityImpact = 0.88;
      trafficImpact = 1.15;
      impactLevel = 'LOW';
      reasons.push('Rule-based: Moderate localized event activity');
      break;
  }

  // Duration & Area Refinements
  const area = normalizeStr(eventFacts.affectedArea);
  if (area && area !== 'all' && area !== 'entire city') {
    reasons.push(`Rule-based: Impact targeted to specific area (${eventFacts.affectedArea})`);
  } else {
    trafficImpact *= 1.05;
    reasons.push('Rule-based: City-wide event coverage');
  }

  if (text.includes('vip') || text.includes('security')) {
    trafficImpact *= 1.10;
    impactLevel = 'HIGH';
    reasons.push('Rule-based: VIP movement & heightened security protocol');
  }

  return {
    type,
    impactLevel,
    demandImpact: Number(demandImpact.toFixed(2)),
    availabilityImpact: Number(availabilityImpact.toFixed(2)),
    trafficImpact: Number(trafficImpact.toFixed(2)),
    analysisReasons: reasons
  };
}

function checkLocationMatch({ eventCity, affectedArea, bookingCity, pickupLocation, destinationLocation, latitude, longitude }) {
  const normEventCity = normalizeStr(eventCity);
  const normBookingCity = normalizeStr(bookingCity);

  if (normEventCity && normBookingCity && normEventCity !== normBookingCity && !normBookingCity.includes(normEventCity) && !normEventCity.includes(normBookingCity)) {
    return { matches: false, locationAffected: false };
  }

  const normArea = normalizeStr(affectedArea);
  if (!normArea || normArea === 'all' || normArea === 'entire city') {
    return { matches: true, locationAffected: true };
  }

  if (latitude !== undefined && longitude !== undefined && !isNaN(Number(latitude)) && !isNaN(Number(longitude))) {
    const center = EVENT_CENTER_COORDS[normArea];
    if (center) {
      const dist = haversineDistanceKm(Number(latitude), Number(longitude), center.lat, center.lon);
      if (dist <= center.radiusKm) {
        return { matches: true, locationAffected: true, distanceKm: Math.round(dist * 10) / 10 };
      } else {
        return { matches: false, locationAffected: false, distanceKm: Math.round(dist * 10) / 10 };
      }
    }
  }

  const normPickup = normalizeStr(pickupLocation);
  const normDest = normalizeStr(destinationLocation);

  const isPickupAffected = normPickup.includes(normArea);
  const isDestAffected = normDest.includes(normArea);

  if (isPickupAffected || isDestAffected) {
    return { matches: true, locationAffected: true };
  }

  if (normPickup || normDest) {
    return { matches: false, locationAffected: false };
  }

  return { matches: true, locationAffected: false };
}

/**
 * Context Resolver — Merges System Context, HolidayProvider, and Admin Events
 */
async function getCalendarContext({
  bookingDate,
  bookingTime = '12:00',
  city = 'Delhi',
  pickupLocation = '',
  destinationLocation = '',
  latitude,
  longitude
}) {
  const d = parseDate(bookingDate);
  const yr = String(d.getFullYear()).padStart(4, '0');
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const dy = String(d.getDate()).padStart(2, '0');
  const dateStr = `${yr}-${mo}-${dy}`;
  const dayOfWeekNum = d.getDay();
  const dayOfWeek = DAY_NAMES[dayOfWeekNum];
  const isWeekend = dayOfWeekNum === 0 || dayOfWeekNum === 6;

  // 1. Resolve Holiday Context via Multi-Tiered HolidayProvider
  const holidayMatch = await holidayProvider.resolveHolidayContext(dateStr);
  const isHoliday = Boolean(holidayMatch);
  const holidayName = holidayMatch ? holidayMatch.name : null;
  const holidayType = holidayMatch ? holidayMatch.type : null;

  // 2. Fetch Active Events from DB (or in-memory fallback)
  let dbEvents = [];
  if (prisma && prisma.calendar_events) {
    try {
      dbEvents = await prisma.calendar_events.findMany({
        where: { active: true }
      });
    } catch (e) {
      dbEvents = [];
    }
  }

  const allEvents = dbEvents.length > 0 ? dbEvents : inMemoryEvents;

  // 3. Filter Active Events by Date, Time, and Location
  const activeEvents = [];
  let aggregateDemandImpact = 1.0;
  let aggregateAvailabilityImpact = 1.0;
  let aggregateTrafficImpact = 1.0;
  let locationAffectedAny = false;

  if (isWeekend) {
    aggregateAvailabilityImpact *= 0.88;
    aggregateDemandImpact *= 1.10;
  }

  if (isHoliday && holidayMatch) {
    aggregateAvailabilityImpact *= holidayMatch.availabilityImpact || 0.75;
    aggregateDemandImpact *= holidayMatch.demandImpact || 1.20;
    aggregateTrafficImpact *= holidayMatch.trafficImpact || 1.15;
  }

  for (const ev of allEvents) {
    const evStartDate = ev.start_date || ev.startDate;
    const evEndDate = ev.end_date || ev.endDate;

    if (dateStr >= evStartDate && dateStr <= evEndDate) {
      const timeMatch = checkTimeRange(bookingTime, ev.start_time || ev.startTime, ev.end_time || ev.endTime);
      if (timeMatch) {
        const locCheck = checkLocationMatch({
          eventCity: ev.city,
          affectedArea: ev.affected_area || ev.affectedArea,
          bookingCity: city,
          pickupLocation,
          destinationLocation,
          latitude,
          longitude
        });

        if (locCheck.matches) {
          const dImp = Number(ev.demand_impact || ev.demandImpact || 1.0);
          const aImp = Number(ev.availability_impact || ev.availabilityImpact || 1.0);
          const tImp = Number(ev.traffic_impact || ev.trafficImpact || 1.0);

          aggregateDemandImpact *= dImp;
          aggregateAvailabilityImpact *= aImp;
          aggregateTrafficImpact *= tImp;

          if (locCheck.locationAffected) {
            locationAffectedAny = true;
          }

          activeEvents.push({
            id: ev.id,
            name: ev.name,
            type: ev.type,
            city: ev.city,
            state: ev.state || '',
            affectedArea: ev.affected_area || ev.affectedArea,
            impactLevel: ev.impact_level || ev.impactLevel || 'MEDIUM',
            demandImpact: dImp,
            availabilityImpact: aImp,
            trafficImpact: tImp,
            source: ev.source || 'ADMIN',
            analysisReasons: ev.analysis_reasons || ev.analysisReasons || [],
            locationAffected: locCheck.locationAffected
          });
        }
      }
    }
  }

  const eventImpactScore = Math.max(0, aggregateDemandImpact * aggregateTrafficImpact / aggregateAvailabilityImpact - 1.0);

  return {
    bookingDate: dateStr,
    bookingTime,
    city,
    pickupLocation,
    destinationLocation,
    latitude,
    longitude,
    dayOfWeek,
    isWeekend,
    isHoliday,
    holidayName,
    holidayType,
    holidaySource: holidayMatch ? (holidayMatch.source || holidayMatch.datasetSource) : null,
    activeEvents,
    eventPresent: activeEvents.length > 0,
    eventImpact: Number(eventImpactScore.toFixed(3)),
    demandImpact: Number(aggregateDemandImpact.toFixed(3)),
    availabilityImpact: Number(aggregateAvailabilityImpact.toFixed(3)),
    trafficImpact: Number(aggregateTrafficImpact.toFixed(3)),
    locationAffected: locationAffectedAny
  };
}

// Event CRUD Methods — System derives classification & impact factors automatically from Admin Facts
async function getAllEvents() {
  if (prisma && prisma.calendar_events) {
    try {
      const events = await prisma.calendar_events.findMany({
        orderBy: { start_date: 'asc' }
      });
      if (events.length > 0) return events;
    } catch (e) {
      // Fallback
    }
  }
  return inMemoryEvents;
}

async function createEvent(data) {
  // Facts provided by Admin
  const facts = {
    name: data.name,
    city: data.city || 'Delhi',
    state: data.state || '',
    affectedArea: data.affectedArea || data.affected_area || '',
    startDate: data.startDate || data.start_date,
    endDate: data.endDate || data.end_date,
    startTime: data.startTime || data.start_time || '08:00',
    endTime: data.endTime || data.end_time || '20:00',
    description: data.description || ''
  };

  // Rule-Based Event Classification and Impact Estimation (Admin cannot manually override derived impact values)
  const estimation = estimateEventImpact(facts);

  const newEv = {
    id: data.id || `ev-${Date.now()}`,
    name: facts.name,
    type: estimation.type,
    start_date: facts.startDate,
    end_date: facts.endDate,
    start_time: facts.startTime,
    end_time: facts.endTime,
    city: facts.city,
    state: facts.state,
    affected_area: facts.affectedArea,
    impact_level: estimation.impactLevel,
    demand_impact: estimation.demandImpact,
    availability_impact: estimation.availabilityImpact,
    traffic_impact: estimation.trafficImpact,
    description: facts.description,
    source: 'ADMIN',
    status: 'ACTIVE',
    analysis_reasons: estimation.analysisReasons,
    active: true
  };

  if (prisma && prisma.calendar_events) {
    try {
      const created = await prisma.calendar_events.create({
        data: {
          name: newEv.name,
          type: newEv.type,
          start_date: newEv.start_date,
          end_date: newEv.end_date,
          start_time: newEv.start_time,
          end_time: newEv.end_time,
          city: newEv.city,
          state: newEv.state,
          affected_area: newEv.affected_area,
          impact_level: newEv.impact_level,
          demand_impact: newEv.demand_impact,
          availability_impact: newEv.availability_impact,
          traffic_impact: newEv.traffic_impact,
          description: newEv.description,
          source: newEv.source,
          status: newEv.status,
          analysis_reasons: newEv.analysis_reasons,
          active: newEv.active
        }
      });
      return created;
    } catch (e) {
      console.warn('Prisma create event failed, storing in-memory:', e.message);
    }
  }

  inMemoryEvents.push({
    ...newEv,
    startDate: newEv.start_date,
    endDate: newEv.end_date,
    startTime: newEv.start_time,
    endTime: newEv.end_time,
    affectedArea: newEv.affected_area,
    impactLevel: newEv.impact_level,
    demandImpact: newEv.demand_impact,
    availabilityImpact: newEv.availability_impact,
    trafficImpact: newEv.traffic_impact,
    analysisReasons: newEv.analysis_reasons
  });

  return newEv;
}

async function updateEvent(id, data) {
  const facts = {
    name: data.name,
    city: data.city,
    state: data.state,
    affectedArea: data.affectedArea || data.affected_area,
    startDate: data.startDate || data.start_date,
    endDate: data.endDate || data.end_date,
    startTime: data.startTime || data.start_time,
    endTime: data.endTime || data.end_time,
    description: data.description
  };

  const estimation = estimateEventImpact(facts);

  if (prisma && prisma.calendar_events) {
    try {
      const updated = await prisma.calendar_events.update({
        where: { id },
        data: {
          name: facts.name,
          type: estimation.type,
          start_date: facts.startDate,
          end_date: facts.endDate,
          start_time: facts.startTime,
          end_time: facts.endTime,
          city: facts.city,
          state: facts.state,
          affected_area: facts.affectedArea,
          impact_level: estimation.impactLevel,
          demand_impact: estimation.demandImpact,
          availability_impact: estimation.availabilityImpact,
          traffic_impact: estimation.trafficImpact,
          description: facts.description,
          analysis_reasons: estimation.analysisReasons,
          active: data.active !== undefined ? Boolean(data.active) : undefined
        }
      });
      return updated;
    } catch (e) {
      console.warn('Prisma update event failed, using in-memory update:', e.message);
    }
  }

  const idx = inMemoryEvents.findIndex(e => e.id === id);
  if (idx !== -1) {
    inMemoryEvents[idx] = {
      ...inMemoryEvents[idx],
      ...facts,
      type: estimation.type,
      impactLevel: estimation.impactLevel,
      demandImpact: estimation.demandImpact,
      availabilityImpact: estimation.availabilityImpact,
      trafficImpact: estimation.trafficImpact,
      analysisReasons: estimation.analysisReasons
    };
    return inMemoryEvents[idx];
  }
  return null;
}

async function deleteEvent(id) {
  if (prisma && prisma.calendar_events) {
    try {
      await prisma.calendar_events.delete({ where: { id } });
      return true;
    } catch (e) {
      // Fallback
    }
  }

  const idx = inMemoryEvents.findIndex(e => e.id === id);
  if (idx !== -1) {
    inMemoryEvents.splice(idx, 1);
    return true;
  }
  return false;
}

module.exports = {
  getCalendarContext,
  getAllEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  classifyEvent,
  estimateEventImpact,
  haversineDistanceKm
};
