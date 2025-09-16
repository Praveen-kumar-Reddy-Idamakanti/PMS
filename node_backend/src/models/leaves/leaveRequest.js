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

  // Check if dates span more than one month
  const startMonth = startDate.getMonth();
  const startYear = startDate.getFullYear();
  const endMonth = endDate.getMonth();
  const endYear = endDate.getFullYear();
  
  // Get leave type name if available in data (case insensitive check)
  const leaveTypeName = (data.leave_type_name || data.leaveTypeName || '').toString().toLowerCase();
  
  // If it's a casual leave request, check if it spans months
  if ((leaveTypeName.includes('casual') && leaveTypeName.includes('leave')) && 
      (startYear !== endYear || startMonth !== endMonth)) {
    throw new Error('Casual leave cannot span more than one month');
  }
  
  return {
    ...data,
    start_date: startDate.toISOString().split('T')[0],
    end_date: endDate.toISOString().split('T')[0]
  };
}

const LeaveRequest = {
  async create(data) {
    
    try {
      // First validate the basic data
      const validatedData = validateLeaveRequest(data);
      const days = daysBetweenInclusive(validatedData.start_date, validatedData.end_date);
      const startDate = new Date(validatedData.start_date);
      const year = startDate.getFullYear();
      const month = startDate.getMonth() + 1; // JavaScript months are 0-indexed
      
      const [leaveType] = await query('SELECT * FROM leave_types WHERE id = $1', [validatedData.leave_type_id]);
      if (!leaveType) {
        console.error(`[LeaveRequest.create] Error: Invalid leave type ID: ${validatedData.leave_type_id}`);
        throw new Error('Invalid leave type');
      }
      
      const leaveTypeName = leaveType.name.toLowerCase();
      const startMonth = startDate.getMonth();
      const startYear = startDate.getFullYear();
      const endDate = new Date(validatedData.end_date);
      const endMonth = endDate.getMonth();
      const endYear = endDate.getFullYear();
      
      if (leaveTypeName.includes('casual') && leaveTypeName.includes('leave')) {
        if (startYear !== endYear || startMonth !== endMonth) {
          console.error(`[LeaveRequest.create] Error: Casual leave spans multiple months - Start: ${startYear}-${startMonth + 1}, End: ${endYear}-${endMonth + 1}`);
          throw new Error('Casual leave cannot span more than one month');
        }
      }
      
      if (leaveTypeName.includes('casual')) {
        const queryStr = `
          SELECT lr.* FROM leave_requests lr
          JOIN leave_types lt ON lr.leave_type_id = lt.id
          WHERE lr.user_id = $1 
            AND LOWER(lt.name) LIKE '%casual%'
            AND lr.status NOT IN ('rejected', 'cancelled')
            AND to_char(lr.start_date, 'YYYY-MM') = $2`;
        
        const yearMonth = `${year}-${month.toString().padStart(2, '0')}`;
        const queryParams = [validatedData.user_id, yearMonth];
        
        const existingCasualLeaves = await query(queryStr, queryParams);
        
        if (existingCasualLeaves.length > 0) {
          const existingLeave = existingCasualLeaves[0];
          const leaveDate = new Date(existingLeave.start_date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long'
          });
          
          throw new Error(`You have already taken a casual leave on ${leaveDate}. Only one casual leave is allowed per month.`);
        }
      }
      
      const balance = await this.getLeaveBalance(validatedData.user_id, year);
      
      if (!balance) {
        await LeaveBalance.upsert(
          validatedData.user_id,
          validatedData.leave_type_id,
          year,
          leaveType.yearly_quota || 0
        );
      }
      
      const currentBalance = balance ? balance.balance : (leaveType.yearly_quota || 0);
      if (currentBalance < days) {
        console.error(`[LeaveRequest.create] Error: Insufficient leave balance. Required: ${days}, Available: ${currentBalance}`);
        throw new Error('Insufficient leave balance');
      }
        
      await run('BEGIN');
      try {
        const result = await run(
          'INSERT INTO leave_requests (user_id, leave_type_id, start_date, end_date, reason, status, days) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
          [validatedData.user_id, validatedData.leave_type_id, validatedData.start_date, validatedData.end_date, validatedData.reason, 'pending', days]
        );

        await run('COMMIT');
        return { ...validatedData, id: result.rows[0].id, status: 'pending', days };
      } catch (error) {
        console.error('[LeaveRequest.create] Database error:', error.message);
        await run('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('[LeaveRequest.create] Error:', error.message);
      throw error;
    }
  },

  async getByUser(userId, { status, year, limit = 50, offset = 0 } = {}) {
    const params = [userId];
    let whereClause = 'WHERE lr.user_id = $1';
    let paramIndex = 1;
    
    if (status) {
      whereClause += ` AND lr.status = $${++paramIndex}`;
      params.push(status);
    }
    
    if (year) {
      whereClause += ` AND EXTRACT(YEAR FROM lr.start_date) = $${++paramIndex}`;
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
       LIMIT $${++paramIndex} OFFSET $${++paramIndex}`,
      params
    );
  },

  async getById(id) {
    const [row] = await query(
      'SELECT * FROM leave_requests WHERE id = $1', 
      [id]
    );
    return row || null;
  },

  async getAll(filters = {}) {
    const {
      status,
      userId,
      leaveTypeId,
      year,
      month,
      limit = 50,
      offset = 0
    } = filters;
    
    const whereClauses = [];
    const params = [];
    let paramIndex = 1;
    
    if (status) {
      if (Array.isArray(status)) {
        if (status.length > 0) {
          const placeholders = status.map(() => `$${paramIndex++}`).join(',');
          whereClauses.push(`lr.status IN (${placeholders})`);
          params.push(...status);
        }
      } else {
        whereClauses.push(`lr.status = $${paramIndex++}`);
        params.push(status);
      }
    }
    
    if (userId) {
      whereClauses.push(`lr.user_id = $${paramIndex++}`);
      params.push(userId);
    }
    
    if (leaveTypeId) {
      whereClauses.push(`lr.leave_type_id = $${paramIndex++}`);
      params.push(leaveTypeId);
    }
    
    if (year) {
      const startDate = month 
        ? `${year}-${month.toString().padStart(2, '0')}-01`
        : `${year}-01-01`;
      const endDate = month
        ? new Date(year, month, 0).toISOString().split('T')[0] // last day of month
        : `${year}-12-31`;
        
      whereClauses.push(`(lr.start_date BETWEEN $${paramIndex++} AND $${paramIndex++} OR lr.end_date BETWEEN $${paramIndex++} AND $${paramIndex++})`);
      params.push(startDate, endDate, startDate, endDate);
    }
    
    const whereClause = whereClauses.length 
      ? `WHERE ${whereClauses.join(' AND ')}` 
      : '';
    
    const queryStr = `
      SELECT lr.*, lt.name as leave_type_name, u.name as user_name
      FROM leave_requests lr
      JOIN leave_types lt ON lr.leave_type_id = lt.id
      JOIN users u ON lr.user_id = u.id
      ${whereClause}
      ORDER BY lr.start_date DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    
    return query(queryStr, [...params, limit, offset]);
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
    let paramIndex = 1;

    if (status) {
      whereClauses.push(`lr.status = $${paramIndex++}`);
      params.push(status);
    }
    
    if (userId) {
      whereClauses.push(`lr.user_id = $${paramIndex++}`);
      params.push(userId);
    }
    
    if (leaveTypeId) {
      whereClauses.push(`lr.leave_type_id = $${paramIndex++}`);
      params.push(leaveTypeId);
    }
    
    if (startDate) {
      whereClauses.push(`lr.start_date >= $${paramIndex++}`);
      params.push(new Date(startDate).toISOString().split('T')[0]);
    }
    
    if (endDate) {
      whereClauses.push(`lr.end_date <= $${paramIndex++}`);
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
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
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

    await run('BEGIN');
    try {
      const year = new Date(req.start_date).getFullYear();
      
      if (newStatus === 'approved') {
        const balanceRow = await LeaveBalance.get(req.user_id, req.leave_type_id, year);
        const currentBalance = (balanceRow && balanceRow.balance) || 0;
        
        if (currentBalance < req.days) {
          throw new Error('Insufficient leave balance');
        }
        
        await LeaveBalance.updateBalance(
          req.user_id, 
          req.leave_type_id, 
          year, 
          -req.days
        );
      } else if (req.status === 'approved' && newStatus !== 'approved') {
        await LeaveBalance.updateBalance(
          req.user_id,
          req.leave_type_id,
          year,
          req.days
        );
      }

      await run(
        `UPDATE leave_requests 
         SET status = $1, 
             approved_by = $2, 
             updated_at = CURRENT_TIMESTAMP 
         WHERE id = $3`,
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
    const req = await this.getById(id);
    if (!req) throw new Error('Leave request not found');
    
    if (req.user_id !== userId) {
      throw new Error('You can only cancel your own leave requests');
    }

    if (req.status !== 'pending') {
      throw new Error('Only pending leave requests can be cancelled');
    }

    await run(
      'UPDATE leave_requests SET status = $1 WHERE id = $2',
      ['cancelled', id]
    );
    
    return { success: true };
  },

  async getLeaveBalance(userId, year = new Date().getFullYear()) {
    const [balance] = await query(
      `SELECT lb.*, lt.name as leave_type_name 
       FROM leave_balances lb
       JOIN leave_types lt ON lb.leave_type_id = lt.id
       WHERE lb.user_id = $1 AND lb.year = $2`,
      [userId, year]
    );
    
    return balance || null;
  }
};

module.exports = LeaveRequest;