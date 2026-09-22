const express = require('express');
const router = express.Router();
const calendarController = require('../controllers/calendar.controller');

// Event endpoints
router.get('/events', calendarController.getEvents);
router.get('/events/:date', calendarController.getEventsByDate);
router.post('/events', calendarController.createEvent);
router.put('/events/:id', calendarController.updateEvent);
router.delete('/events/:id', calendarController.deleteEvent);

// Context endpoints
router.all('/calendar/context', calendarController.getCalendarContext);

module.exports = router;
