const calendarService = require('../services/calendar.service');

async function getEvents(req, res) {
  try {
    const events = await calendarService.getAllEvents();
    res.json(events);
  } catch (err) {
    console.error('Error fetching calendar events:', err);
    res.status(500).json({ error: 'Failed to fetch calendar events' });
  }
}

async function getEventsByDate(req, res) {
  try {
    const { date } = req.params;
    const context = await calendarService.getCalendarContext({ bookingDate: date });
    res.json(context);
  } catch (err) {
    console.error('Error fetching events by date:', err);
    res.status(500).json({ error: 'Failed to fetch events for date' });
  }
}

async function createEvent(req, res) {
  try {
    const { name, startDate, endDate } = req.body;
    if (!name || (!startDate && !req.body.start_date)) {
      return res.status(400).json({ error: 'Event name and start date are required' });
    }
    const event = await calendarService.createEvent(req.body);
    res.status(201).json(event);
  } catch (err) {
    console.error('Error creating calendar event:', err);
    res.status(500).json({ error: 'Failed to create calendar event' });
  }
}

async function updateEvent(req, res) {
  try {
    const { id } = req.params;
    const updated = await calendarService.updateEvent(id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json(updated);
  } catch (err) {
    console.error('Error updating calendar event:', err);
    res.status(500).json({ error: 'Failed to update calendar event' });
  }
}

async function deleteEvent(req, res) {
  try {
    const { id } = req.params;
    const success = await calendarService.deleteEvent(id);
    if (!success) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json({ message: 'Event deleted successfully' });
  } catch (err) {
    console.error('Error deleting calendar event:', err);
    res.status(500).json({ error: 'Failed to delete calendar event' });
  }
}

async function getCalendarContext(req, res) {
  try {
    const params = req.method === 'POST' ? req.body : req.query;
    const context = await calendarService.getCalendarContext({
      bookingDate: params.bookingDate || params.date,
      bookingTime: params.bookingTime || params.time || '12:00',
      city: params.city,
      pickupLocation: params.pickupLocation || params.pickup,
      destinationLocation: params.destinationLocation || params.destination
    });
    res.json(context);
  } catch (err) {
    console.error('Error generating calendar context:', err);
    res.status(500).json({ error: 'Failed to generate calendar context' });
  }
}

module.exports = {
  getEvents,
  getEventsByDate,
  createEvent,
  updateEvent,
  deleteEvent,
  getCalendarContext
};
