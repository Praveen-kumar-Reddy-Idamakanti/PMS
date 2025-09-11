const express = require('express');
const router = express.Router();
const { createTaskCalendarEvent } = require('../controllers/taskCalendarController');
const { authenticate } = require('../middleware/auth.middleware'); // Destructure authenticate // Corrected import path

// Route to create a new task calendar event
router.post('/', authenticate, createTaskCalendarEvent);

// You might want to add more routes later for getting, updating, deleting events
// router.get('/:id', authMiddleware, taskCalendarController.getTaskCalendarEventById);
// router.put('/:id', authMiddleware, taskCalendarController.updateTaskCalendarEvent);
// router.delete('/:id', authMiddleware, taskCalendarController.deleteTaskCalendarEvent);

module.exports = router;
