
const express = require('express');
const router = express.Router();
const taskController = require('../controllers/task.controller');
const { authenticate } = require('../middleware/auth.middleware'); // Assuming you have this middleware

// Task Routes
router.post('/', authenticate, taskController.createTask);
router.get('/', authenticate, taskController.getAllTasks);
router.get('/:id', authenticate, taskController.getTaskById);
router.put('/:id', authenticate, taskController.updateTask);
router.delete('/:id', authenticate, taskController.deleteTask);

// Subtask Routes
router.post('/:taskId/subtasks', authenticate, taskController.createSubtask);
router.put('/:taskId/subtasks/:subtaskId', authenticate, taskController.updateSubtask);
router.delete('/:taskId/subtasks/:subtaskId', authenticate, taskController.deleteSubtask);

module.exports = router;
