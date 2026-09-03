const prisma = require('../config/db');

async function getSkills() {
  return prisma.skills.findMany({
    orderBy: {
      name: 'asc'
    }
  });
}

module.exports = {
  getSkills
};