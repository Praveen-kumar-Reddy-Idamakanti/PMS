// models/LeaveRequest.js
const { query, run } = require('../../config/db');
const LeaveBalance = require('./leaveBalance');

// Utility functions
function daysBetweenInclusive(start_date, end_date) {
  const s = new Date(start_date);
  const e = new Date(end_date);
  // simple inclusive days difference (not business days)
  const diff = Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
  return diff > 0 ? diff : 0;
}

function validateLeaveRequest(data) {
  if (!data.user_id) throw new Error('User ID is required');
  if (!data.leave_type_id) throw new Error('Leave type is required');
  if (!data.start_date) throw new Error('Start date is required');
  if (!data.end_date) throw new Error('End date is required');
  
  const startDate = new Date(data.start_date);
  const endDate = new Date(data.end_date);
  
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw new Error('Invalid date format');
  }
  
  if (endDate < startDate) {
    throw new Error('End date cannot be before start date');
  }
  
  return {
    ...data,
    start_date: startDate.toISOString().split('T')[0],
    end_date: endDate.toISOString().split('T')[0]
  };
}

const LeaveRequest = {
  async create(data) {
    const validatedData = validateLeaveRequest(data);
    const days = daysBetweenInclusive(validatedData.start_date, validatedData.end_date);
    const startDate = new Date(validatedData.start_date);
    const year = startDate.getFullYear();
    const month = startDate.getMonth() + 1; // JavaScript months are 0-indexed
    
    // Check if leave type exists
    const [leaveType] = await query('SELECT * FROM leave_types WHERE id = ?', [validatedData.leave_type_id]);
    if (!leaveType) {
      throw new Error('Invalid leave type');
    }
    
    // Check if this is a casual leave (assuming 'Casual' is the name of the leave type)
    if (leaveType.name.toLowerCase() === 'casual') {
      // Check for existing casual leaves in the same month
      const existingCasualLeaves = await query(
        `SELECT lr.* FROM leave_requests lr
         JOIN leave_types lt ON lr.leave_type_id = lt.id
         WHERE lr.user_id = ? 
           AND lt.name = 'Casual'
           AND strftime('%Y', lr.start_date) = ?
           AND strftime('%m', lr.start_date) = ?
           AND lr.status != 'rejected'`, // Don't count rejected leaves
        [validatedData.user_id, year.toString(), month.toString().padStart(2, '0')]
      );
      
      if (existingCasualLeaves.length > 0) {
        throw new Error('Only one casual leave is allowed per month');
      }
    }
    
    // Check leave balance but don't deduct yet
    const balance = await LeaveBalance.get(
      validatedData.user_id,
      validatedData.leave_type_id,
      year
    );
    
    // If no balance record exists, create one with default values
    if (!balance) {
      await LeaveBalance.upsert(
        validatedData.user_id,
        validatedData.leave_type_id,
        year,
        leaveType.yearly_quota || 0
      );
    }
    
    // Check if sufficient balance would exist (without deducting yet)
    const currentBalance = balance ? balance.balance : (leaveType.yearly_quota || 0);
    if (currentBalance < days) {
      throw new Error('Insufficient leave balance');
    }
    
    await run('BEGIN TRANSACTION');
    try {
      const result = await run(
        `INSERT INTO leave_requests (
          user_id, 
          leave_type_id, 
          start_date, 
          end_date, 
          days, 
          reason, 
          status
        ) VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
        [
          validatedData.user_id,
          validatedData.leave_type_id,
          validatedData.start_date,
          validatedData.end_date,
          days,
          validatedData.reason || ''
        ]
      );
      
      const [newRequest] = await query(
        'SELECT * FROM leave_requests WHERE id = ?',
        [result.insertId]
      );
      
      // Don't deduct balance on creation, will be handled on approval
      
      await run('COMMIT');
      return newRequest || { id: result.insertId, days };
    } catch (error) {
      await run('ROLLBACK');
      throw error;
    }
  },

  async getByUser(userId, { status, year, limit = 50, offset = 0 } = {}) {
    const params = [userId];
    let whereClause = 'WHERE lr.user_id = ?';
    
    if (status) {
      whereClause += ' AND lr.status = ?';
      params.push(status);
    }
    
    if (year) {
      whereClause += ' AND strftime("%Y", lr.start_date) = ?';
      params.push(year.toString());
    }
    
    params.push(limit, offset);
    
    return query(
      `SELECT 
        lr.*, 
        lt.name as leave_type 
       FROM leave_requests lr 
       JOIN leave_types lt ON lr.leave_type_id = lt.id 
       ${whereClause}
       ORDER BY lr.created_at DESC
       LIMIT ? OFFSET ?`,
      params
    );
  },

  async getById(id) {
    const [row] = await query(
      'SELECT * FROM leave_requests WHERE id = ?', 
      [id]
    );
    return row || null;
  },

  async getAllWithUserDetails(filters = {}) {
    const {
      status,
      userId,
      leaveTypeId,
      startDate,
      endDate,
      limit = 50,
      offset = 0
    } = filters;
    
    const whereClauses = [];
    const params = [];
    
    if (status) {
      whereClauses.push('lr.status = ?');
      params.push(status);
    }
    
    if (userId) {
      whereClauses.push('lr.user_id = ?');
      params.push(userId);
    }
    
    if (leaveTypeId) {
      whereClauses.push('lr.leave_type_id = ?');
      params.push(leaveTypeId);
    }
    
    if (startDate) {
      whereClauses.push('lr.start_date >= ?');
      params.push(new Date(startDate).toISOString().split('T')[0]);
    }
    
    if (endDate) {
      whereClauses.push('lr.end_date <= ?');
      params.push(new Date(endDate).toISOString().split('T')[0]);
    }
    
    const whereClause = whereClauses.length 
      ? `WHERE ${whereClauses.join(' AND ')}` 
      : '';
    
    return query(
      `SELECT 
        lr.id, 
        lr.user_id as userId,
        u.name as userName,
        u.employee_id as employeeId,
        u.email as userEmail,
        lr.leave_type_id as leaveTypeId,
        lt.name as leaveTypeName,
        lr.start_date as startDate,
        lr.end_date as endDate,
        lr.days,
        lr.reason,
        lr.status,
        lr.approved_by as approvedByUserId,
        ab.name as approvedByUserName,
        lr.created_at as createdAt,
        lr.updated_at as updatedAt
       FROM leave_requests lr
       JOIN users u ON lr.user_id = u.id
       JOIN leave_types lt ON lr.leave_type_id = lt.id
       LEFT JOIN users ab ON lr.approved_by = ab.id
       ${whereClause}
       ORDER BY lr.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
  },

  async updateStatus(id, newStatus, processed_by = null) {
    const validStatuses = ['pending', 'approved', 'rejected', 'cancelled'];
    if (!validStatuses.includes(newStatus)) {
      throw new Error('Invalid status');
    }
    
    const req = await this.getById(id);
    if (!req) throw new Error('Leave request not found');
    
    if (req.status !== 'pending' && newStatus !== 'cancelled') {
      throw new Error('Only pending requests can be updated');
    }

    await run('BEGIN TRANSACTION');
    try {
      const year = new Date(req.start_date).getFullYear();
      
      // Handle status changes
      if (newStatus === 'approved') {
        // Only check and deduct balance when approving
        const balanceRow = await LeaveBalance.get(req.user_id, req.leave_type_id, year);
        const currentBalance = (balanceRow && balanceRow.balance) || 0;
        
        if (currentBalance < req.days) {
          throw new Error('Insufficient leave balance');
        }
        
        // Deduct the days from the balance
        await LeaveBalance.updateBalance(
          req.user_id, 
          req.leave_type_id, 
          year, 
          -req.days
        );
      } else if (req.status === 'approved' && newStatus !== 'approved') {
        // If previously approved and now rejecting/cancelling, add back the days
        await LeaveBalance.updateBalance(
          req.user_id,
          req.leave_type_id,
          year,
          req.days
        );
      }

      await run(
        `UPDATE leave_requests 
         SET status = ?, 
             approved_by = ?, 
             updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [newStatus, processed_by, id]
      );

      await run('COMMIT');
      return { success: true };
    } catch (error) {
      await run('ROLLBACK');
      throw error;
    }
  },
  
  async cancel(id, userId) {
    const request = await this.getById(id);
    if (!request) {
      throw new Error('Leave request not found');
    }
    
    if (request.user_id !== userId) {
      throw new Error('Not authorized to cancel this request');
    }
    
    if (request.status !== 'pending') {
      throw new Error('Only pending requests can be cancelled');
    }
    
    return this.updateStatus(id, 'cancelled', userId);
  },
  
  async getLeaveBalance(userId, year = new Date().getFullYear()) {
    const [result] = await query(
      `SELECT 
        lt.id as leaveTypeId,
        lt.name as leaveTypeName,
        COALESCE(SUM(CASE WHEN lr.status = 'approved' THEN lr.days ELSE 0 END), 0) as usedDays,
        lt.yearly_quota as yearlyQuota
       FROM leave_types lt
       LEFT JOIN leave_requests lr ON lt.id = lr.leave_type_id 
         AND lr.user_id = ? 
         AND strftime('%Y', lr.start_date) = ?
       WHERE lt.is_active = 1
       GROUP BY lt.id, lt.name, lt.yearly_quota`,
      [userId, year.toString()]
    );
    
    return result.map(row => ({
      ...row,
      remainingDays: Math.max(0, row.yearlyQuota - row.usedDays)
    }));
  }
};

module.exports = LeaveRequest;