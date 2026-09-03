const skillService = require('../services/skill.service');

async function getSkills(req, res, next) {
  try {
    const skills = await skillService.getSkills();

    res.json({
      skills
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getSkills
};