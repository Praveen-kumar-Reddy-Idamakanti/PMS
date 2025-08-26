const { query, run } = require('../config/db');
const { NotFoundError, BadRequestError } = require('../utils/errors');

// Get all attendance records with filtering options
exports.getAllAttendance = async (req, res, next) => {
  try {
    const { startDate, endDate, userId: user_id, status, date } = req.query;
    
    let sqlQuery = `
      SELECT a.*, u.name, u.email, u.employee_id, u.role 
      FROM attendance a
      JOIN users u ON a.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    
    if (startDate) {
      sqlQuery += ' AND timestamp >= ?';
      params.push(new Date(startDate).toISOString());
    }
    
    if (endDate) {
      sqlQuery += ' AND timestamp <= ?';
      params.push(new Date(endDate).toISOString());
    }
    
    if (user_id) {
      sqlQuery += ' AND a.user_id = ?';
      params.push(user_id);
    }
    
    if (status) {
      sqlQuery += ' AND status = ?';
      params.push(status);
    }
    
    // If specific date is provided, filter by that date
    if (date) {
      sqlQuery += ' AND DATE(a.timestamp) = ?';
      params.push(date);
    }
    
    sqlQuery += ' ORDER BY a.timestamp DESC';
    
    const attendance = await query(sqlQuery, params);
    res.json({ success: true, data: attendance });
  } catch (error) {
    next(error);
  }
};

// Update attendance status (admin only)
exports.updateAttendanceStatus = async (req, res, next) => {
  try {
    const { attendanceId } = req.params;
    const { status, notes } = req.body;
    
    // Validate status if provided
    if (status) {
      const validStatuses = ['present', 'absent', 'half-day', 'on-leave'];
      if (!validStatuses.includes(status)) {
        throw new BadRequestError('Invalid attendance status');
      }
    }
    
    // Check if attendance record exists
    const [attendance] = await query(
      `SELECT a.*, u.name, u.email 
       FROM attendance a
       JOIN users u ON a.user_id = u.id
       WHERE a.id = ?`, 
      [attendanceId]
    );
    
    if (!attendance) {
      throw new NotFoundError('Attendance record not found');
    }
    
    // Build update query
    const updates = [];
    const params = [];
    
    if (status) {
      updates.push('status = ?');
      params.push(status);
    }
    
    if (notes !== undefined) {
      updates.push('notes = ?');
      params.push(notes);
    }
    
    if (updates.length > 0) {
      params.push(attendanceId);
      await run(
        `UPDATE attendance SET ${updates.join(', ')} WHERE id = ?`,
        params
      );
      
      // Get updated record
      const [updated] = await query(
        `SELECT a.*, u.name, u.email 
         FROM attendance a
         JOIN users u ON a.user_id = u.id
         WHERE a.id = ?`,
        [attendanceId]
      );
      
      return res.json({
        success: true,
        message: 'Attendance updated successfully',
        data: updated
      });
    }
    
    // No updates provided
    res.json({
      success: true,
      message: 'No changes made',
      data: attendance
    });
  } catch (error) {
    next(error);
  }
};

// Get attendance statistics
exports.getAttendanceStats = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Base query to get all users with their attendance
    let query = `
      SELECT 
        u.id as user_id,
        u.name,
        u.email,
        u.role,
        a.status,
        a.date
      FROM users u
      LEFT JOIN attendance a ON u.id = a.user_id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (startDate) {
      query += ' AND a.date >= ?';
      params.push(new Date(startDate).toISOString());
    }
    
    if (endDate) {
      query += ' AND a.date <= ?';
      params.push(new Date(endDate).toISOString());
    }
    
    const userAttendances = await query(query, params);
    
    // Group attendance by user
    const userStats = {};
    
    userAttendances.forEach(row => {
      if (!userStats[row.user_id]) {
        userStats[row.user_id] = {
          user_id: row.user_id,
          name: row.name,
          email: row.email,
          role: row.role,
          totalDays: 0,
          presentDays: 0,
          absentDays: 0,
          halfDays: 0,
          leaveDays: 0
        };
      }
      
      if (row.status) {
        const user = userStats[row.user_id];
        user.totalDays++;
        
        if (row.status === 'present' || row.status === 'half-day') {
          user.presentDays++;
        }
        
        if (row.status === 'absent') user.absentDays++;
        if (row.status === 'half-day') user.halfDays++;
        if (row.status === 'on-leave') user.leaveDays++;
      }
    });
    
    // Convert to array and calculate percentages
    const stats = Object.values(userStats).map(user => ({
      ...user,
      attendancePercentage: user.totalDays > 0 
        ? Math.round((user.presentDays / user.totalDays) * 100) 
        : 0
    }));
    
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};

// Bulk update attendance
exports.bulkUpdateAttendance = async (req, res, next) => {
  const db = getDB();
  
  try {
    const { date, updates } = req.body;
    
    if (!date || !updates || !Array.isArray(updates)) {
      throw new BadRequestError('Invalid request data');
    }
    
    const attendanceDate = new Date(date).toISOString();
    const results = [];
    
    // Start transaction
    await run('BEGIN TRANSACTION');
    
    for (const update of updates) {
      try {
        // Check if record exists
        const [existing] = await query(
          'SELECT * FROM attendance WHERE user_id = ? AND date = ?',
          [update.userId, attendanceDate]
        );
        
        if (existing) {
          // Update existing record
          const updateFields = [];
          const params = [];
          
          if (update.status) {
            updateFields.push('status = ?');
            params.push(update.status);
          }
          
          if (update.notes !== undefined) {
            updateFields.push('notes = ?');
            params.push(update.notes);
          }
          
          if (updateFields.length > 0) {
            params.push(update.userId, attendanceDate);
            await run(
              `UPDATE attendance SET ${updateFields.join(', ')} WHERE user_id = ? AND date = ?`,
              params
            );
          }
        } else {
          // Insert new record
          await run(
            'INSERT INTO attendance (user_id, date, status, notes) VALUES (?, ?, ?, ?)',
            [
              update.userId,
              attendanceDate,
              update.status || 'absent',
              update.notes || ''
            ]
          );
        }
        
        // Get the updated/inserted record
        const [record] = await query(
          `SELECT a.*, u.name, u.email 
           FROM attendance a 
           JOIN users u ON a.user_id = u.id 
           WHERE user_id = ? AND date = ?`,
          [update.userId, attendanceDate]
        );
        
        results.push({
          userId: update.userId,
          success: true,
          data: record
        });
      } catch (error) {
        results.push({
          userId: update.userId,
          success: false,
          error: error.message
        });
      }
    }
    
    // Commit transaction
    await db.run('COMMIT');
    
    res.json({
      success: true,
      message: 'Bulk update completed',
      results
    });
  } catch (error) {
    // Rollback on error
    await db.run('ROLLBACK');
    next(error);
  }
};
