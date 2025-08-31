const { query, run } = require('../config/db');
const { NotFoundError, BadRequestError } = require('../utils/errors');
const Attendance = require('../models/attendance.model');

// Get all attendance records with filtering options
exports.getAllAttendance = async (req, res, next) => {
  try {
    const { startDate, endDate, userId: user_id, status, date } = req.query;
    const currentUserRole = req.user.role;
    
    let sqlQuery = `
      SELECT a.*, u.name, u.email, u.employee_id, u.role 
      FROM attendance a
      JOIN users u ON a.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    // If user is HR or Team Leader, only show their team's attendance
    if (currentUserRole === 'hr' || currentUserRole === 'team_leader') {
      sqlQuery += ' AND u.role IN (?, ?, ?)';
      params.push('team_leader', 'employee', 'intern');
    }
    
    if (startDate) {
      sqlQuery += ' AND timestamp >= ?';
      params.push(new Date(startDate).toISOString());
    }
    
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);  // Set to end of the day
      sqlQuery += ' AND timestamp <= ?';
      params.push(end.toISOString());
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
    
        // First, get all attendance records for the date range
    const attendance = await query(sqlQuery, params);
    
    // Group records by user and date
    const userDateMap = {};
    
    attendance.forEach(record => {
      const date = new Date(record.timestamp).toISOString().split('T')[0];
      const key = `${record.user_id}_${date}`;
      
      if (!userDateMap[key]) {
        userDateMap[key] = {
          user_id: record.user_id,
          name: record.name,
          email: record.email,
          employee_id: record.employee_id,
          date: date,
          checkins: [],
          checkouts: []
        };
      }
      
      if (record.type === 'checkin') {
        userDateMap[key].checkins.push(record.timestamp);
      } else if (record.type === 'checkout') {
        userDateMap[key].checkouts.push(record.timestamp);
      }
    });
    
    // Process each user's daily records
    const processedRecords = Object.values(userDateMap).map(record => {
      // Sort check-ins and check-outs
      const checkins = [...record.checkins].sort();
      const checkouts = [...record.checkouts].sort();
      
      // Pair check-ins with check-outs
      const pairs = [];
      let totalHours = 0;
      
      for (let i = 0; i < Math.max(checkins.length, checkouts.length); i++) {
        const checkin = checkins[i] || null;
        const checkout = checkouts[i] || null;
        
        pairs.push({ checkin, checkout });
        
        // Calculate hours if we have both check-in and check-out
        if (checkin && checkout) {
          const hours = (new Date(checkout) - new Date(checkin)) / (1000 * 60 * 60);
          totalHours += hours;
        }
      }
      
      // Get the first check-in and last check-out if available
      const firstCheckin = checkins.length > 0 ? checkins[0] : null;
      const lastCheckout = checkouts.length > 0 ? checkouts[checkouts.length - 1] : null;
      
      return {
        id: `${record.user_id}_${record.date}`,
        user_id: record.user_id,
        name: record.name,
        email: record.email,
        employee_id: record.employee_id,
        date: record.date,
        checkin_time: firstCheckin,
        checkout_time: lastCheckout,
        total_hours: totalHours,
        status: checkins.length > 0 ? 'present' : 'absent',
        pairs: pairs
      };
    });
    
    res.json({ success: true, data: processedRecords });
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
    
    // Base query to get all users with their check-in/checkout records
    let sqlQuery = `
      WITH user_days AS (
        SELECT 
          u.id as user_id,
          u.name,
          u.email,
          u.role,
          DATE(a.timestamp) as date,
          MAX(CASE WHEN a.type = 'checkin' THEN a.timestamp END) as checkin_time,
          MAX(CASE WHEN a.type = 'checkout' THEN a.timestamp END) as checkout_time
        FROM users u
        LEFT JOIN attendance a ON u.id = a.user_id
        WHERE 1=1
    `;
    
    const params = [];
    
    if (startDate) {
      sqlQuery += ' AND DATE(a.timestamp) >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      sqlQuery += ' AND DATE(a.timestamp) <= ?';
      params.push(endDate);
    }
    
    sqlQuery += `
      GROUP BY u.id, u.name, u.email, u.role, DATE(a.timestamp)
      ORDER BY u.id, date
    )
    SELECT * FROM user_days;
    `;
    
    const attendanceRecords = await query(sqlQuery, params);
    
    // Group attendance by user
    const userStats = {};
    
    attendanceRecords.forEach(row => {
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
      
      const user = userStats[row.user_id];
      user.totalDays++;
      
      // Consider a user present if they have both check-in and check-out
      if (row.checkin_time && row.checkout_time) {
        user.presentDays++;
      } else if (row.checkin_time || row.checkout_time) {
        // Only check-in or check-out counts as half day
        user.halfDays++;
        user.presentDays += 0.5;
      } else {
        user.absentDays++;
      }
    });
    
    // Convert to array and calculate percentages
    const stats = Object.values(userStats).map(user => ({
      ...user,
      // Round to 2 decimal places
      attendancePercentage: user.totalDays > 0 
        ? Math.round((user.presentDays / user.totalDays) * 100 * 100) / 100 
        : 0
    }));
    
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error in getAttendanceStats:', error);
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
