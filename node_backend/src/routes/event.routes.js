
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { checkRole } = require('../middleware/roleCheck');
const eventController = require('../controllers/event.controller');
const upload = require('../middleware/upload');

const { getEvents, getPastEvents, getEvent, createEvent, rsvpEvent, updateEvent, deleteEvent } = eventController;

router.get('/', authenticate, getEvents);
router.get('/history', authenticate, getPastEvents);
router.get('/:id', authenticate, getEvent);
router.post('/', authenticate, upload.single('image'), createEvent);
router.put('/:id', authenticate, checkRole(['super_admin']), upload.single('image'), updateEvent);
router.delete('/:id', authenticate, checkRole(['super_admin']), deleteEvent);
router.post('/:id/rsvp', authenticate, rsvpEvent);

module.exports = router;
