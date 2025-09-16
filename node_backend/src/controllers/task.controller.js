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
    FROM "Tasks" T
    LEFT JOIN users U1 ON T.assignedto = U1.id
    LEFT JOIN users U2 ON T.assignedby = U2.id
    WHERE T.id = $1`,
    [taskId]
  );

  if (!task || task.length === 0) return null;

  const subtasks = await query(
    'SELECT id, title, completed, "taskId", assignedto, assignedby, completedby, completedat, completiondescription FROM "SubTasks" WHERE "taskId" = $1',
    [taskId]
  );
  
  const tags = await query(
    `SELECT T.id, T.name FROM "Tags" T
     JOIN "TaskTags" TT ON T.id = TT."tagId"
     WHERE TT."taskId" = $1`,
    [taskId]
  );

  const result = task[0];
  result.subtasks = subtasks;
  result.tags = tags;
  result.assignedToUser = result.assignedToUserName ? { id: result.assignedTo, name: result.assignedToUserName, email: result.assignedToUserEmail } : null;
  result.assignedByUser = result.assignedByUserName ? { id: result.assignedBy, name: result.assignedByUserName, email: result.assignedByUserEmail } : null;
  
  delete result.assignedToUserName;
  delete result.assignedToUserEmail;
  delete result.assignedByUserName;
  delete result.assignedByUserEmail;

  logger.debug(`[getTaskWithAssociations] Returning Task with Associations: ${JSON.stringify(result)}`);
  return result;
}

// Create a new task
const createTask = async (req, res) => {
  const { title, description, status, priority, assignedTo, assignedBy, dueDate, progress, tags, subtasks } = req.body;
  const userId = req.user ? req.user.id : assignedBy;
  
  try {
    const result = await run(
        `INSERT INTO "Tasks" (title, description, status, priority, assignedto, assignedby, duedate, progress, createdat, updatedat)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING id`,
      [title, description, status, priority, assignedTo, assignedBy, dueDate, progress]
    );
    const newTaskId = result.rows[0].id;

    await logTaskActivity(userId, newTaskId, ACTIVITY_TYPES.TASK_CREATE, {
      title,
      status,
      priority,
      assignedTo,
      dueDate
    });

    if (assignedTo) {
      await logTaskActivity(userId, newTaskId, ACTIVITY_TYPES.TASK_ASSIGN, {
        assignedTo,
        assignedBy: userId
      });
    }

    if (tags && tags.length > 0) {
      for (const tagName of tags) {
        let tag = await query('SELECT id FROM "Tags" WHERE name = $1', [tagName]);
        let tagId;
        if (tag.length === 0) {
          const newTagResult = await run('INSERT INTO "Tags" (name, createdat, updatedat) VALUES ($1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING id', [tagName]);
          tagId = newTagResult.rows[0].id;
        } else {
          tagId = tag[0].id;
        }
        await run('INSERT INTO "TaskTags" ("taskId", "tagId", "createdAt", "updatedAt") VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)', [newTaskId, tagId]);
      }
    }

    if (subtasks && subtasks.length > 0) {
      for (const subtask of subtasks) {
        await run(
          `INSERT INTO "SubTasks" (title, status, taskId, createdAt, updatedAt)
          VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
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
  let paramIndex = 1;

  if (status) {
    whereClauses.push(`T.status = $${paramIndex++}`);
    params.push(status);
  }
  if (priority) {
    whereClauses.push(`T.priority = $${paramIndex++}`);
    params.push(priority);
  }
  if (assignedTo) {
    whereClauses.push(`T.assignedto = $${paramIndex++}`);
    params.push(assignedTo);
  }
  if (assignedBy) {
    whereClauses.push(`T.assignedby = $${paramIndex++}`);
    params.push(assignedBy);
  }
  if (search) {
    whereClauses.push(`(T.title LIKE $${paramIndex++} OR T.description LIKE $${paramIndex++})`);
    params.push(`%${search}%`, `%${search}%`);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  try {
    const tasks = await query(
      `SELECT 
        T.*, 
        U1.name AS assignedToUserName, U1.email AS assignedToUserEmail, 
        U2.name AS assignedByUserName, U2.email AS assignedByUserEmail
      FROM "Tasks" T
      LEFT JOIN users U1 ON T.assignedto = U1.id
      LEFT JOIN users U2 ON T.assignedby = U2.id
      ${whereSql}
        ORDER BY T.createdat DESC`,
      params
    );

    const tasksWithAssociations = await Promise.all(tasks.map(async (task) => {
      const subtasks = await query('SELECT * FROM "SubTasks" WHERE "taskId" = $1', [task.id]);
      const tags = await query(
        `SELECT T.id, T.name FROM "Tags" T
         JOIN "TaskTags" TT ON T.id = TT."tagId"
         WHERE TT."taskId" = $1`,
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
    const task = await query('SELECT * FROM Tasks WHERE id = $1', [id]);
    if (!task || task.length === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const currentTask = task[0];
    const isStatusChanging = status && currentTask.status !== status;
    const isAssignmentChanging = assignedTo !== undefined && currentTask.assignedTo !== assignedTo;
    
    if (isStatusChanging && (status === 'Completed' || status === 'Done')) {
      await logTaskActivity(userId, id, ACTIVITY_TYPES.TASK_COMPLETE, {
        oldStatus: currentTask.status,
        newStatus: status,
         completedAt: new Date().toISOString()
      });
      
      await run(
        `UPDATE Tasks 
         SET title = $1, description = $2, status = $3, priority = $4, assignedto = $5, duedate = $6, progress = $7, completedat = CURRENT_TIMESTAMP, updatedat = CURRENT_TIMESTAMP 
         WHERE id = $8`,
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
      await run(
        `UPDATE Tasks 
         SET title = $1, description = $2, status = $3, priority = $4, assignedto = $5, duedate = $6, progress = $7, updatedat = CURRENT_TIMESTAMP 
         WHERE id = $8`,
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
      
      if (isStatusChanging) {
        await logTaskActivity(userId, id, ACTIVITY_TYPES.TASK_UPDATE, {
          field: 'status',
          oldValue: currentTask.status,
          newValue: status
        });
      }
      
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
    
    await logTaskActivity(userId, id, ACTIVITY_TYPES.TASK_DELETE, {
      title: task.title,
      status: task.status,
      assignedTo: task.assignedTo
    });
    
    await run('DELETE FROM Tasks WHERE id = $1', [id]);
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
    const [task] = await query(
        'SELECT id, assignedto, assignedby FROM Tasks WHERE id = $1', 
      [taskId]
    );
    
    if (!task) {
      logger.warn(`[createSubtask] Task not found for ID: ${taskId}`);
      return res.status(404).json({ message: 'Task not found' });
    }
    
    if (userId && userId !== task.assignedTo && userId !== task.assignedBy) {
      logger.warn(`[createSubtask] User ${userId} not authorized to create subtasks for task ${taskId}`);
      return res.status(403).json({ 
        message: 'You are not authorized to create subtasks for this task' 
      });
    }
    
    const assignedBy = req.body.assignedBy || userId;
    
    const result = await run(
       `INSERT INTO "SubTasks" (title, completed, taskId, assignedto, assignedby, completiondescription, createdAt, updatedAt)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING id`,
      [
        title, 
        completed || false, 
        parseInt(taskId), 
        assignedTo || null, 
        assignedBy || null, 
        completionDescription || null
      ]
    );
    
    const [newSubtask] = await query(
      `SELECT st.*, 
              u1.name as assignedToName, u1.email as assignedToEmail,
              u2.name as assignedByName, u2.email as assignedByEmail
       FROM "SubTasks" st
       LEFT JOIN users u1 ON st.assignedto = u1.id
       LEFT JOIN users u2 ON st.assignedby = u2.id
       WHERE st.id = $1`, 
      [result.rows[0].id]
    );
    
    logger.debug(`[createSubtask] Response: ${JSON.stringify(newSubtask)}`);
    res.status(201).json(newSubtask);
  } catch (error) {
    logger.error(`[createSubtask] Error: ${error.message}`, error);
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
    const [existingSubtask] = await query(
       `SELECT s.*, t.assignedto as taskAssignedTo, t.assignedby as taskAssignedBy 
        FROM "SubTasks" s 
       JOIN Tasks t ON s."taskId" = t.id 
       WHERE s.id = $1 AND s."taskId" = $2`,
      [subtaskId, taskId]
    );
    
    if (!existingSubtask) {
      logger.warn(`[updateSubtask] Subtask not found or does not belong to task. SubtaskId: ${subtaskId}, TaskId: ${taskId}`);
      return res.status(404).json({ message: 'Subtask not found or does not belong to this task' });
    }
    
    const isSubtaskAssignee = existingSubtask.assignedTo === userId;
    const isSubtaskAssigner = existingSubtask.assignedBy === userId;
    const isTaskAssigner = existingSubtask.taskAssignedBy === userId;
    
    if (!isSubtaskAssignee && !isSubtaskAssigner && !isTaskAssigner) {
      logger.warn(`[updateSubtask] User ${userId} not authorized to update subtask ${subtaskId}`);
      return res.status(403).json({ 
        message: 'You are not authorized to update this subtask' 
      });
    }

    const updatedFields = {
      title: title !== undefined ? title : existingSubtask.title,
      completed: completed !== undefined ? completed : existingSubtask.completed,
      assignedTo: assignedTo !== undefined ? (assignedTo || null) : existingSubtask.assignedTo,
      assignedBy: assignedBy !== undefined ? (assignedBy || null) : existingSubtask.assignedBy,
      completionDescription: completionDescription !== undefined ? (completionDescription || null) : existingSubtask.completionDescription,
      completedBy: existingSubtask.completedBy,
       completedAt: existingSubtask.completedat
    };

    if (!existingSubtask.completed && updatedFields.completed) {
      updatedFields.completedBy = userId;
      updatedFields.completedat = completedAt;
    } else if (existingSubtask.completed && !updatedFields.completed) {
      updatedFields.completedBy = null;
      updatedFields.completedat = null;
      updatedFields.completionDescription = null;
    }

    logger.debug(`[updateSubtask] Updating with fields: ${JSON.stringify(updatedFields)}`);
    
    await run(
      `UPDATE "SubTasks" SET title = $1, completed = $2, assignedto = $3, assignedby = $4, completedby = $5, completedat = $6, completiondescription = $7, updatedAt = CURRENT_TIMESTAMP WHERE id = $8 AND "taskId" = $9`,
      [
        updatedFields.title,
        updatedFields.completed,
        updatedFields.assignedTo,
         updatedFields.assignedBy,
        updatedFields.completedBy,
        updatedFields.completedat,
        updatedFields.completionDescription,
        subtaskId,
        taskId
      ]
    );
    
    const [updatedSubtask] = await query('SELECT * FROM "SubTasks" WHERE id = $1 AND "taskId" = $2', [subtaskId, taskId]);
    logger.debug(`[updateSubtask] Response: ${JSON.stringify(updatedSubtask)}`);
    res.status(200).json(updatedSubtask);
  } catch (error) {
    logger.error(`[updateSubtask] Error: ${error.message}`, error);
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
    const [existingSubtask] = await query(
      `SELECT s.*, t.assignedTo as taskAssignedTo, t.assignedBy as taskAssignedBy 
       FROM "SubTasks" s 
       JOIN Tasks t ON s.taskId = t.id 
       WHERE s.id = $1 AND s.taskId = $2`, 
      [subtaskId, taskId]
    );
    
    if (!existingSubtask) {
      return res.status(404).json({ message: 'Subtask not found or does not belong to this task' });
    }
    
    const isAssignedTo = existingSubtask.assignedTo === userId;
    const isAssignedBy = existingSubtask.assignedBy === userId;
    const isTaskAssignee = existingSubtask.taskAssignedTo === userId;
    const isTaskAssigner = existingSubtask.taskAssignedBy === userId;
    
    if (!isAssignedTo && !isAssignedBy && !isTaskAssignee && !isTaskAssigner) {
      return res.status(403).json({ 
        message: 'You are not authorized to delete this subtask' 
      });
    }
    await run('DELETE FROM "SubTasks" WHERE id = $1 AND "taskId" = $2', [subtaskId, taskId]);
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