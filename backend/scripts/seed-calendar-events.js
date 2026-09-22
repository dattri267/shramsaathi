const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const SAMPLE_EVENTS = [
  {
    name: 'BRICS Summit 2026',
    type: 'MAJOR_EVENT',
    start_date: '2026-09-11',
    end_date: '2026-09-13',
    start_time: '08:00',
    end_time: '20:00',
    city: 'Delhi',
    affected_area: 'Central Delhi',
    impact_level: 'HIGH',
    demand_impact: 1.35,
    availability_impact: 0.70,
    traffic_impact: 1.45,
    description: 'International summit causing traffic restrictions and high security protocols in Central Delhi.',
    active: true
  },
  {
    name: 'Republic Day Parade & Security Bounds',
    type: 'GOVERNMENT_HOLIDAY',
    start_date: '2026-01-26',
    end_date: '2026-01-26',
    start_time: '06:00',
    end_time: '18:00',
    city: 'Delhi',
    affected_area: 'Central Delhi',
    impact_level: 'HIGH',
    demand_impact: 1.15,
    availability_impact: 0.80,
    traffic_impact: 1.35,
    description: 'National holiday with ceremonial parade and traffic diversions around Central Delhi.',
    active: true
  },
  {
    name: 'Diwali Festival Period',
    type: 'FESTIVAL',
    start_date: '2026-11-07',
    end_date: '2026-11-09',
    start_time: '00:00',
    end_time: '23:59',
    city: 'Delhi',
    affected_area: 'entire city',
    impact_level: 'VERY_HIGH',
    demand_impact: 1.40,
    availability_impact: 0.55,
    traffic_impact: 1.30,
    description: 'Major festival period causing peak home service demand and lower worker availability.',
    active: true
  },
  {
    name: 'Holi Celebrations',
    type: 'FESTIVAL',
    start_date: '2026-03-14',
    end_date: '2026-03-14',
    start_time: '08:00',
    end_time: '18:00',
    city: 'Mumbai',
    affected_area: 'entire city',
    impact_level: 'HIGH',
    demand_impact: 1.25,
    availability_impact: 0.60,
    traffic_impact: 1.20,
    description: 'Festival of colors leading to lower worker availability during morning hours.',
    active: true
  },
  {
    name: 'Independence Day',
    type: 'GOVERNMENT_HOLIDAY',
    start_date: '2026-08-15',
    end_date: '2026-08-15',
    start_time: '00:00',
    end_time: '23:59',
    city: 'Bengaluru',
    affected_area: 'entire city',
    impact_level: 'MEDIUM',
    demand_impact: 1.15,
    availability_impact: 0.82,
    traffic_impact: 1.10,
    description: 'National government holiday.',
    active: true
  }
];

async function main() {
  console.log('Seeding calendar events...');
  for (const event of SAMPLE_EVENTS) {
    try {
      const existing = await prisma.calendar_events.findFirst({
        where: { name: event.name }
      });

      if (!existing) {
        await prisma.calendar_events.create({ data: event });
        console.log(`Created event: ${event.name}`);
      } else {
        console.log(`Event already exists: ${event.name}`);
      }
    } catch (e) {
      console.warn(`Could not seed event ${event.name} into database:`, e.message);
    }
  }
  console.log('Seeding finished.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
