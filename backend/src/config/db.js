require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const dbUrl = process.env.DATABASE_URL || "postgresql://localhost:5432/dummy";

const adapter = new PrismaPg({
  connectionString: dbUrl,
});

const prisma = new PrismaClient({ adapter });

if (!process.env.DATABASE_URL) {
  console.warn('⚠️ DATABASE_URL is missing in backend/.env. Real database operations will fail until configured.');
}

module.exports = prisma;
