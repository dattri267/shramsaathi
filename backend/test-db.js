require('dotenv').config();

const prisma = require('./src/config/db');

async function test() {
  try {
    await prisma.$connect();
    console.log('Database connected successfully');
  } catch (err) {
    console.error('Database connection failed:');
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

test();