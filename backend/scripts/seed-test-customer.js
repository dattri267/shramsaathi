// backend/scripts/seed-test-customer.js
const prisma = require('../src/config/db');

const TEST_USER_ID = 'PASTE_THE_ID_FROM_STEP_1_RESPONSE';

async function main() {
  const profile = await prisma.profiles.upsert({
    where: { id: TEST_USER_ID },
    update: {},
    create: {
      id: TEST_USER_ID,
      role: 'customer',
      full_name: 'Test Customer',
    }
  });
  console.log('Profile:', profile);

  const customerProfile = await prisma.customer_profiles.upsert({
    where: { user_id: TEST_USER_ID },
    update: {},
    create: {
      user_id: TEST_USER_ID,
    }
  });
  console.log('Customer Profile:', customerProfile);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());