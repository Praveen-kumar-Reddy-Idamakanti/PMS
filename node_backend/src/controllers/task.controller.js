const { run, query } = require('../config/db');

// Helper function to fetch a task with its associations
async function getTaskWithAssociations(taskId) {
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

  const subtasks = await query('SELECT * FROM SubTasks WHERE taskId = ?', [taskId]);
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

  return result;
}

// Create a new task
const createTask = async (req, res) => {
  const { title, description, status, priority, assignedTo, assignedBy, dueDate, progress, tags, subtasks } = req.body;
  try {
    const result = await run(
      `INSERT INTO Tasks (title, description, status, priority, assignedTo, assignedBy, dueDate, progress, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [title, description, status, priority, assignedTo, assignedBy, dueDate, progress]
    );
    const newTaskId = result.lastID;

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
  try {
    const task = await getTaskWithAssociations(req.params.id);
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
  const taskId = req.params.id;
  const { title, description, status, priority, assignedTo, assignedBy, dueDate, progress, tags, subtasks } = req.body;
  try {
    const existingTask = await query('SELECT id FROM Tasks WHERE id = ?', [taskId]);
    if (existingTask.length === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }

    await run(
      `UPDATE Tasks SET 
         title = ?, description = ?, status = ?, priority = ?, 
         assignedTo = ?, assignedBy = ?, dueDate = ?, progress = ?, 
         updatedAt = datetime('now')
       WHERE id = ?`,
      [title, description, status, priority, assignedTo, assignedBy, dueDate, progress, taskId]
    );

    // Update tags
    if (tags) {
      await run('DELETE FROM TaskTags WHERE taskId = ?', [taskId]); // Remove existing tags
      for (const tagName of tags) {
        let tag = await query('SELECT id FROM Tags WHERE name = ?', [tagName]);
        let tagId;
        if (tag.length === 0) {
          const newTagResult = await run('INSERT INTO Tags (name, createdAt, updatedAt) VALUES (?, datetime(\'now\'), datetime(\'now\'))', [tagName]);
          tagId = newTagResult.lastID;
        } else {
          tagId = tag[0].id;
        }
        await run('INSERT INTO TaskTags (taskId, tagId, createdAt, updatedAt) VALUES (?, ?, datetime(\'now\'), datetime(\'now\'))', [taskId, tagId]);
      }
    }

    // Update subtasks (simple replacement for now)
    if (subtasks) {
      await run('DELETE FROM SubTasks WHERE taskId = ?', [taskId]); // Remove existing
      for (const subtask of subtasks) {
        await run(
          `INSERT INTO SubTasks (title, status, taskId, createdAt, updatedAt)
           VALUES (?, ?, ?, datetime(\'now\'), datetime(\'now\'))`,
          [subtask.title, subtask.status || 'todo', taskId]
        );
      }
    }

    const updatedTask = await getTaskWithAssociations(taskId);
    res.status(200).json(updatedTask);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ message: 'Error updating task', error: error.message });
  }
};

// Delete a task
const deleteTask = async (req, res) => {
  try {
    const taskId = req.params.id;
    const existingTask = await query('SELECT id FROM Tasks WHERE id = ?', [taskId]);
    if (existingTask.length === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }
    await run('DELETE FROM Tasks WHERE id = ?', [taskId]);
    res.status(204).send(); // No content
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ message: 'Error deleting task', error: error.message });
  }
};

// Create a subtask for a given task
const createSubtask = async (req, res) => {
  const { taskId } = req.params;
  const { title, status } = req.body;
  try {
    const task = await query('SELECT id FROM Tasks WHERE id = ?', [taskId]);
    if (task.length === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }
    const result = await run(
      `INSERT INTO SubTasks (title, status, taskId, createdAt, updatedAt)
       VALUES (?, ?, ?, datetime(\'now\'), datetime(\'now\'))`,
      [title, status || 'todo', parseInt(taskId)]
    );
    const newSubtask = await query('SELECT * FROM SubTasks WHERE id = ?', [result.lastID]);
    res.status(201).json(newSubtask[0]);
  } catch (error) {
    console.error('Error creating subtask:', error);
    res.status(500).json({ message: 'Error creating subtask', error: error.message });
  }
};

// Update a subtask
const updateSubtask = async (req, res) => {
  const { id } = req.params;
  const { title, status } = req.body;
  try {
    const existingSubtask = await query('SELECT id FROM SubTasks WHERE id = ?', [id]);
    if (existingSubtask.length === 0) {
      return res.status(404).json({ message: 'Subtask not found' });
    }
    await run(
      `UPDATE SubTasks SET title = ?, status = ?, updatedAt = datetime(\'now\') WHERE id = ?`,
      [title, status, id]
    );
    const updatedSubtask = await query('SELECT * FROM SubTasks WHERE id = ?', [id]);
    res.status(200).json(updatedSubtask[0]);
  } catch (error) {
    console.error('Error updating subtask:', error);
    res.status(500).json({ message: 'Error updating subtask', error: error.message });
  }
};

// Delete a subtask
const deleteSubtask = async (req, res) => {
  const { id } = req.params;
  try {
    const existingSubtask = await query('SELECT id FROM SubTasks WHERE id = ?', [id]);
    if (existingSubtask.length === 0) {
      return res.status(404).json({ message: 'Subtask not found' });
    }
    await run('DELETE FROM SubTasks WHERE id = ?', [id]);
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