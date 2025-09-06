
const Event = require('../models/event.model');
const Rsvp = require('../models/rsvp.model');

exports.getEvents = async (req, res) => {
    try {
        const events = await Event.findAll();
        res.json({ success: true, data: events });
    } catch (err) {
        console.error('getEvents:', err);
        res.status(500).json({ success: false, error: err.message || 'Server error' });
    }
};

exports.getPastEvents = async (req, res) => {
    try {
        const events = await Event.findPast();
        res.json({ success: true, data: events });
    } catch (err) {
        console.error('getPastEvents:', err);
        res.status(500).json({ success: false, error: err.message || 'Server error' });
    }
};

exports.getEvent = async (req, res) => {
    try {
        const { id } = req.params;
        const event = await Event.findById(id);
        if (!event) {
            return res.status(404).json({ success: false, error: 'Event not found' });
        }
        const rsvps = await Rsvp.findByEventId(id);
        res.json({ success: true, data: { ...event, rsvps } });
    } catch (err) {
        console.error('getEvent:', err);
        res.status(500).json({ success: false, error: err.message || 'Server error' });
    }
};

exports.createEvent = async (req, res) => {
    try {
        const { title, description, date_time, location } = req.body;
        const created_by = req.user.id;
        const image_url = req.file ? `/uploads/${req.file.filename}` : null;

        if (!title || !date_time) {
            return res.status(400).json({ success: false, error: 'Title and date_time are required' });
        }

        const newEvent = await Event.create({ title, description, date_time, location, created_by, image_url });
        res.status(201).json({ success: true, data: newEvent });
    } catch (err) {
        console.error('createEvent:', err);
        res.status(500).json({ success: false, error: err.message || 'Server error' });
    }
};

exports.rsvpEvent = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const user_id = req.user.id;

        if (!status || !['going', 'interested'].includes(status)) {
            return res.status(400).json({ success: false, error: 'Invalid status' });
        }

        const event = await Event.findById(id);
        if (!event) {
            return res.status(404).json({ success: false, error: 'Event not found' });
        }

        const newRsvp = await Rsvp.create({ user_id, event_id: id, status });
        res.status(201).json({ success: true, data: newRsvp });
    } catch (err) {
        console.error('rsvpEvent:', err);
        res.status(500).json({ success: false, error: err.message || 'Server error' });
    }
};

exports.updateEvent = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, date_time, location } = req.body;
        const image_url = req.file ? `/uploads/${req.file.filename}` : req.body.image_url;

        const updatedEvent = await Event.update(id, { title, description, date_time, location, image_url });
        res.json({ success: true, data: updatedEvent });
    } catch (err) {
        console.error('updateEvent:', err);
        res.status(500).json({ success: false, error: err.message || 'Server error' });
    }
};

exports.deleteEvent = async (req, res) => {
    try {
        const { id } = req.params;
        await Event.delete(id);
        res.json({ success: true, message: 'Event deleted successfully' });
    } catch (err) {
        console.error('deleteEvent:', err);
        res.status(500).json({ success: false, error: err.message || 'Server error' });
    }
};
