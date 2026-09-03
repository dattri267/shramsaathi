const express = require('express');

const router = express.Router();

const {
  getSkills
} = require('../controllers/skill.controller');

router.get(
  '/skills',
  getSkills
);

module.exports = router;