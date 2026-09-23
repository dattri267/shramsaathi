const express = require('express');

const router = express.Router();

const {
  getSkills,
  getSkillsWithSubskills
} = require('../controllers/skill.controller');

router.get('/skills/with-subskills', getSkillsWithSubskills);
router.get('/skills', getSkills);
router.get('/v1/skills', getSkills);
router.get('/api/skills', getSkills);
router.get('/api/v1/skills', getSkills);
router.get('/services', getSkills);
router.get('/api/services', getSkills);

module.exports = router;