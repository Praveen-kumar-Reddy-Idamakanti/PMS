const { run, query } = require('../config/db');
const logger = require('../utils/logger');
const { ACTIVITY_TYPES } = require('../models/activityLog.model');
const ActivityLog = require('../models/activityLog.model');

// Helper function to log task activities
async function logTaskActivity(userId, taskId, activityType, details = {}) {
  try {
    await ActivityLog.logActivity({
      userId,
      activityType,
      details: {
        taskId,
        ...details
      }
    });
  } catch (error) {
    logger.error('Error logging task activity:', error);
    // Don't throw to avoid breaking the main operation
  }
}

// Helper function to fetch a task with its associations
async function getTaskWithAssociations(taskId, userId = null) {
  const task = await query(
    `SELECT 
      T.*, 
      U1.name AS assignedToUserName, U1.email AS assignedToUserEmail, 
      U2.name AS assignedByUserName, U2.email AS assignedByUserEmail
    FROM Tasks T
    LEFT JOIN users U1 ON T.assignedTo = U1.id
    LEFT JOIN users U2 ON T.assignedBy = U2.id
    WHERE T.id = ?`,
    [taskId]
  );

  if (!task || task.length === 0) return null;

  // Get all subtasks for the task
  const subtasks = await query(
    'SELECT id, title, completed, taskId, assignedTo, assignedBy, completedBy, completedAt, completionDescription FROM SubTasks WHERE taskId = ?',
    [taskId]
  );
  
  // Note: We're no longer filtering subtasks here as we want to show all subtasks
  // The frontend will handle access control for modifying them
  
  const tags = await query(
    `SELECT T.id, T.name FROM Tags T
     JOIN TaskTags TT ON T.id = TT.tagId
     WHERE TT.taskId = ?`,
    [taskId]
  );

  const result = task[0];
  result.subtasks = subtasks;
  result.tags = tags;
  result.assignedToUser = result.assignedToUserName ? { id: result.assignedTo, name: result.assignedToUserName, email: result.assignedToUserEmail } : null;
  result.assignedByUser = result.assignedByUserName ? { id: result.assignedBy, name: result.assignedByUserName, email: result.assignedByUserEmail } : null;
  
  // Clean up redundant fields
  delete result.assignedToUserName;
  delete result.assignedToUserEmail;
  delete result.assignedByUserName;
  delete result.assignedByUserEmail;

  logger.debug(`[getTaskWithAssociations] Returning Task with Associations: ${JSON.stringify(result)}`); // Debug log
  return result;
}

// Create a new task
const createTask = async (req, res) => {
  const { title, description, status, priority, assignedTo, assignedBy, dueDate, progress, tags, subtasks } = req.body;
  const userId = req.user ? req.user.id : assignedBy; // Use authenticated user ID or fallback to assignedBy
  
  try {
    console.log("createTask", req.body);
    const result = await run(
      `INSERT INTO Tasks (title, description, status, priority, assignedTo, assignedBy, dueDate, progress, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [title, description, status, priority, assignedTo, assignedBy, dueDate, progress]
    );
    const newTaskId = result.lastID;

    // Log task creation
    await logTaskActivity(userId, newTaskId, ACTIVITY_TYPES.TASK_CREATE, {
      title,
      status,
      priority,
      assignedTo,
      dueDate
    });

    // Log task assignment if assigned to someone
    if (assignedTo) {
      await logTaskActivity(userId, newTaskId, ACTIVITY_TYPES.TASK_ASSIGN, {
        assignedTo,
        assignedBy: userId
      });
    }

    if (tags && tags.length > 0) {
      for (const tagName of tags) {
        let tag = await query('SELECT id FROM Tags WHERE name = ?', [tagName]);
        let tagId;
        if (tag.length === 0) {
          const newTagResult = await run('INSERT INTO Tags (name, createdAt, updatedAt) VALUES (?, datetime(\'now\'), datetime(\'now\'))', [tagName]);
          tagId = newTagResult.lastID;
        } else {
          tagId = tag[0].id;
        }
        await run('INSERT INTO TaskTags (taskId, tagId, createdAt, updatedAt) VALUES (?, ?, datetime(\'now\'), datetime(\'now\'))', [newTaskId, tagId]);
      }
    }

    if (subtasks && subtasks.length > 0) {
      for (const subtask of subtasks) {
        await run(
          `INSERT INTO SubTasks (title, status, taskId, createdAt, updatedAt)
           VALUES (?, ?, ?, datetime(\'now\'), datetime(\'now\'))`,
          [subtask.title, subtask.status || 'todo', newTaskId]
        );
      }
    }

    const taskWithAssociations = await getTaskWithAssociations(newTaskId);
    res.status(201).json(taskWithAssociations);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ message: 'Error creating task', error: error.message });
  }
};

// Get all tasks
const getAllTasks = async (req, res) => {
  const { status, priority, assignedTo, assignedBy, search } = req.query;
  let whereClauses = [];
  let params = [];

  if (status) {
    whereClauses.push('T.status = ?');
    params.push(status);
  }
  if (priority) {
    whereClauses.push('T.priority = ?');
    params.push(priority);
  }
  if (assignedTo) {
    whereClauses.push('T.assignedTo = ?');
    params.push(assignedTo);
  }
  if (assignedBy) {
    whereClauses.push('T.assignedBy = ?');
    params.push(assignedBy);
  }
  if (search) {
    whereClauses.push('(T.title LIKE ? OR T.description LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  try {
    const tasks = await query(
      `SELECT 
        T.*, 
        U1.name AS assignedToUserName, U1.email AS assignedToUserEmail, 
        U2.name AS assignedByUserName, U2.email AS assignedByUserEmail
      FROM Tasks T
      LEFT JOIN users U1 ON T.assignedTo = U1.id
      LEFT JOIN users U2 ON T.assignedBy = U2.id
      ${whereSql}
      ORDER BY T.createdAt DESC`,
      params
    );

    // Manually fetch subtasks and tags for each task
    const tasksWithAssociations = await Promise.all(tasks.map(async (task) => {
      const subtasks = await query('SELECT * FROM SubTasks WHERE taskId = ?', [task.id]);
      const tags = await query(
        `SELECT T.id, T.name FROM Tags T
         JOIN TaskTags TT ON T.id = TT.tagId
         WHERE TT.taskId = ?`,
        [task.id]
      );
      task.subtasks = subtasks;
      task.tags = tags;
      task.assignedToUser = task.assignedToUserName ? { id: task.assignedTo, name: task.assignedToUserName, email: task.assignedToUserEmail } : null;
      task.assignedByUser = task.assignedByUserName ? { id: task.assignedBy, name: task.assignedByUserName, email: task.assignedByUserEmail } : null;
      
      delete task.assignedToUserName;
      delete task.assignedToUserEmail;
      delete task.assignedByUserName;
      delete task.assignedByUserEmail;

      return task;
    }));

    res.status(200).json(tasksWithAssociations);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ message: 'Error fetching tasks', error: error.message });
  }
};

// Get a single task by ID
const getTaskById = async (req, res) => {
  const { id } = req.params;
  const userId = req.user ? req.user.id : null;
  try {
    const task = await getTaskWithAssociations(id, userId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    res.status(200).json(task);
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ message: 'Error fetching task', error: error.message });
  }
};

// Update a task
const updateTask = async (req, res) => {
  const { id } = req.params;
  const { title, description, status, priority, assignedTo, dueDate, progress } = req.body;
  const userId = req.user ? req.user.id : null;
  
  try {
    const task = await query('SELECT * FROM Tasks WHERE id = ?', [id]);
    if (!task || task.length === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const currentTask = task[0];
    const isStatusChanging = status && currentTask.status !== status;
    const isAssignmentChanging = assignedTo !== undefined && currentTask.assignedTo !== assignedTo;
    
    // Check if status is being updated to 'Completed' or 'Done'
    if (isStatusChanging && (status === 'Completed' || status === 'Done')) {
      // Log task completion
      await logTaskActivity(userId, id, ACTIVITY_TYPES.TASK_COMPLETE, {
        oldStatus: currentTask.status,
        newStatus: status,
        completedAt: new Date().toISOString()
      });
      
      // Update task with completedAt
      await run(
        `UPDATE Tasks 
         SET title = ?, description = ?, status = ?, priority = ?, assignedTo = ?, dueDate = ?, progress = ?, completedAt = datetime('now'), updatedAt = datetime('now') 
         WHERE id = ?`,
        [
          title || currentTask.title,
          description !== undefined ? description : currentTask.description,
          status,
          priority || currentTask.priority,
          assignedTo !== undefined ? assignedTo : currentTask.assignedTo,
          dueDate || currentTask.dueDate,
          progress !== undefined ? progress : currentTask.progress,
          id
        ]
      );
    } else {
      // For any other update
      await run(
        `UPDATE Tasks 
         SET title = ?, description = ?, status = ?, priority = ?, assignedTo = ?, dueDate = ?, progress = ?, updatedAt = datetime('now') 
         WHERE id = ?`,
        [
          title || currentTask.title,
          description !== undefined ? description : currentTask.description,
          status || currentTask.status,
          priority || currentTask.priority,
          assignedTo !== undefined ? assignedTo : currentTask.assignedTo,
          dueDate || currentTask.dueDate,
          progress !== undefined ? progress : currentTask.progress,
          id
        ]
      );
      
      // Log status change if applicable
      if (isStatusChanging) {
        await logTaskActivity(userId, id, ACTIVITY_TYPES.TASK_UPDATE, {
          field: 'status',
          oldValue: currentTask.status,
          newValue: status
        });
      }
      
      // Log assignment change if applicable
      if (isAssignmentChanging) {
        await logTaskActivity(userId, id, ACTIVITY_TYPES.TASK_ASSIGN, {
          assignedTo,
          assignedBy: userId
        });
      }
    }

    const updatedTask = await getTaskWithAssociations(id);
    res.status(200).json(updatedTask);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ message: 'Error updating task', error: error.message });
  }
};

// Delete a task
const deleteTask = async (req, res) => {
  const { id } = req.params;
  const userId = req.user ? req.user.id : null;
  
  try {
    const task = await getTaskWithAssociations(id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    // Log task deletion
    await logTaskActivity(userId, id, ACTIVITY_TYPES.TASK_DELETE, {
      title: task.title,
      status: task.status,
      assignedTo: task.assignedTo
    });
    
    await run('DELETE FROM Tasks WHERE id = ?', [id]);
    res.status(200).json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ message: 'Error deleting task', error: error.message });
  }
};

// Create a subtask for a given task
const createSubtask = async (req, res) => {
  const { taskId } = req.params;
  const { title, completed, assignedTo, completionDescription } = req.body;
  const userId = req.user ? req.user.id : null;
  
  logger.debug(`[createSubtask] Request Body: ${JSON.stringify(req.body)}`);
  
  try {
    // Get the task with assignee and assigner information
    const [task] = await query(
      'SELECT id, assignedTo, assignedBy FROM Tasks WHERE id = ?', 
      [taskId]
    );
    
    if (!task) {
      logger.warn(`[createSubtask] Task not found for ID: ${taskId}`);
      return res.status(404).json({ message: 'Task not found' });
    }
    
    // Check if the user is authorized (either the assignee or assigner of the main task)
    if (userId && userId !== task.assignedTo && userId !== task.assignedBy) {
      logger.warn(`[createSubtask] User ${userId} not authorized to create subtasks for task ${taskId}`);
      return res.status(403).json({ 
        message: 'You are not authorized to create subtasks for this task' 
      });
    }
    
    // Set assignedBy to the current user if not provided
    const assignedBy = req.body.assignedBy || userId;
    
    const result = await run(
      `INSERT INTO SubTasks (title, completed, taskId, assignedTo, assignedBy, completionDescription, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [
        title, 
        completed || false, 
        parseInt(taskId), 
        assignedTo || null, 
        assignedBy || null, 
        completionDescription || null
      ]
    );
    
    // Fetch the newly created subtask with user details
    const [newSubtask] = await query(
      `SELECT st.*, 
              u1.name as assignedToName, u1.email as assignedToEmail,
              u2.name as assignedByName, u2.email as assignedByEmail
       FROM SubTasks st
       LEFT JOIN Users u1 ON st.assignedTo = u1.id
       LEFT JOIN Users u2 ON st.assignedBy = u2.id
       WHERE st.id = ?`, 
      [result.lastID]
    );
    
    logger.debug(`[createSubtask] Response: ${JSON.stringify(newSubtask)}`);
    res.status(201).json(newSubtask);
  } catch (error) {
    logger.error(`[createSubtask] Error: ${error.message}`, error); // Debug log
    res.status(500).json({ message: 'Error creating subtask', error: error.message });
  }
};


// Update a subtask
const updateSubtask = async (req, res) => {
  const { taskId, subtaskId } = req.params;
  const { title, completed, assignedTo, assignedBy, completionDescription } = req.body;
  const userId = req.user ? req.user.id : null;
  const completedAt = completed ? new Date().toISOString() : null;
  
  if (!userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  logger.debug(`[updateSubtask] Request Params: ${JSON.stringify(req.params)}, Request Body: ${JSON.stringify(req.body)}, User ID: ${userId}`);
  try {
    // Get the subtask with task information
    const [existingSubtask] = await query(
      `SELECT s.*, t.assignedTo as taskAssignedTo, t.assignedBy as taskAssignedBy 
       FROM SubTasks s 
       JOIN Tasks t ON s.taskId = t.id 
       WHERE s.id = ? AND s.taskId = ?`, 
      [subtaskId, taskId]
    );
    
    if (!existingSubtask) {
      logger.warn(`[updateSubtask] Subtask not found or does not belong to task. SubtaskId: ${subtaskId}, TaskId: ${taskId}`);
      return res.status(404).json({ message: 'Subtask not found or does not belong to this task' });
    }
    
    // Check if the user is authorized to update the subtask
    const isSubtaskAssignee = existingSubtask.assignedTo === userId;
    const isSubtaskAssigner = existingSubtask.assignedBy === userId;
    const isTaskAssigner = existingSubtask.taskAssignedBy === userId;
    
    // Allow subtask assignee, subtask assigner, or task assigner to modify
    if (!isSubtaskAssignee && !isSubtaskAssigner && !isTaskAssigner) {
      logger.warn(`[updateSubtask] User ${userId} not authorized to update subtask ${subtaskId}`);
      return res.status(403).json({ 
        message: 'You are not authorized to update this subtask' 
      });
    }

    // Merge existing values with updates from req.body
    const updatedFields = {
      title: title !== undefined ? title : existingSubtask.title,
      completed: completed !== undefined ? completed : existingSubtask.completed,
      assignedTo: assignedTo !== undefined ? (assignedTo || null) : existingSubtask.assignedTo,
      assignedBy: assignedBy !== undefined ? (assignedBy || null) : existingSubtask.assignedBy,
      completionDescription: completionDescription !== undefined ? (completionDescription || null) : existingSubtask.completionDescription,
      completedBy: existingSubtask.completedBy, // Initialize with existing
      completedAt: existingSubtask.completedAt // Initialize with existing
    };

    // Logic to set/clear completedBy and completedAt based on 'completed' status change
    if (!existingSubtask.completed && updatedFields.completed) { // Changed from oldCompletedStatus to existingSubtask.completed
      updatedFields.completedBy = userId;
      updatedFields.completedAt = completedAt;
    } else if (existingSubtask.completed && !updatedFields.completed) { // Changed from oldCompletedStatus to existingSubtask.completed
      updatedFields.completedBy = null;
      updatedFields.completedAt = null;
      updatedFields.completionDescription = null; // Clear description when uncompleted
    }

    logger.debug(`[updateSubtask] Updating with fields: ${JSON.stringify(updatedFields)}`);
    
    await run(
      `UPDATE SubTasks SET title = ?, completed = ?, assignedTo = ?, assignedBy = ?, completedBy = ?, completedAt = ?, completionDescription = ?, updatedAt = datetime('now') WHERE id = ? AND taskId = ?`,
      [
        updatedFields.title,
        updatedFields.completed,
        updatedFields.assignedTo,
        updatedFields.assignedBy,
        updatedFields.completedBy,
        updatedFields.completedAt,
        updatedFields.completionDescription,
        subtaskId,
        taskId
      ]
    );
    
    const [updatedSubtask] = await query('SELECT * FROM SubTasks WHERE id = ? AND taskId = ?', [subtaskId, taskId]);
    logger.debug(`[updateSubtask] Response: ${JSON.stringify(updatedSubtask)}`);
    res.status(200).json(updatedSubtask);
  } catch (error) {
    logger.error(`[updateSubtask] Error: ${error.message}`, error); // Debug log
    res.status(500).json({ message: 'Error updating subtask', error: error.message });
  }
};



// Delete a subtask
const deleteSubtask = async (req, res) => {
  const { taskId, subtaskId } = req.params;
  const userId = req.user ? req.user.id : null;
  
  if (!userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  try {
    // Get the subtask with task information
    const [existingSubtask] = await query(
      `SELECT s.*, t.assignedTo as taskAssignedTo, t.assignedBy as taskAssignedBy 
       FROM SubTasks s 
       JOIN Tasks t ON s.taskId = t.id 
       WHERE s.id = ? AND s.taskId = ?`, 
      [subtaskId, taskId]
    );
    
    if (!existingSubtask) {
      return res.status(404).json({ message: 'Subtask not found or does not belong to this task' });
    }
    
    // Check if the user is authorized (either the assignee or assigner of the subtask, or the task)
    const isAssignedTo = existingSubtask.assignedTo === userId;
    const isAssignedBy = existingSubtask.assignedBy === userId;
    const isTaskAssignee = existingSubtask.taskAssignedTo === userId;
    const isTaskAssigner = existingSubtask.taskAssignedBy === userId;
    
    if (!isAssignedTo && !isAssignedBy && !isTaskAssignee && !isTaskAssigner) {
      return res.status(403).json({ 
        message: 'You are not authorized to delete this subtask' 
      });
    }
    await run('DELETE FROM SubTasks WHERE id = ? AND taskId = ?', [subtaskId, taskId]); // Delete scoped to taskId
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting subtask:', error);
    res.status(500).json({ message: 'Error deleting subtask', error: error.message });
  }
};

module.exports = {
  createTask,
  getAllTasks,
  getTaskById,
  updateTask,
  deleteTask,
  createSubtask,
  updateSubtask,
  deleteSubtask,
};