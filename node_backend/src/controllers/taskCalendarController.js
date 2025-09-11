const { run, query } = require('../config/db');
const logger = require('../utils/logger');

const createTaskCalendarEvent = async (req, res) => {
  const { taskId, userId, title, description, dueDate } = req.body;

  if (!taskId || !title || !dueDate) {
    return res.status(400).json({ message: 'Task ID, title, and due date are required.' });
  }

  try {
    const sql = `
      INSERT INTO TaskCalendarEvents (taskId, userId, title, description, dueDate)
      VALUES (?, ?, ?, ?, ?);
    `;
    const params = [taskId, userId || null, title, description || null, dueDate];
    
    const result = await run(sql, params);
    
    res.status(201).json({ 
      message: 'Task calendar event created successfully', 
      event: { 
        id: result.lastID, 
        taskId, 
        userId, 
        title, 
        description, 
        dueDate, 
        status: 'task_due' // Default status
      } 
    });
  } catch (error) {
    logger.error('Error creating task calendar event:', error);
    res.status(500).json({ message: 'Failed to create task calendar event', error: error.message });
  }
};

module.exports = {
  createTaskCalendarEvent,
};
