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
    console.log('[LeaveRequest.create] Starting leave request creation with data:', JSON.stringify(data, null, 2));
    
    try {
      // First validate the basic data
      const validatedData = validateLeaveRequest(data);
      const days = daysBetweenInclusive(validatedData.start_date, validatedData.end_date);
      const startDate = new Date(validatedData.start_date);
      const year = startDate.getFullYear();
      const month = startDate.getMonth() + 1; // JavaScript months are 0-indexed
      
      console.log(`[LeaveRequest.create] Validated data - Start: ${startDate.toISOString()}, End: ${new Date(validatedData.end_date).toISOString()}, Days: ${days}`);
    
      // Get leave type details
      console.log(`[LeaveRequest.create] Fetching leave type with ID: ${validatedData.leave_type_id}`);
      const [leaveType] = await query('SELECT * FROM leave_types WHERE id = ?', [validatedData.leave_type_id]);
      if (!leaveType) {
        console.error(`[LeaveRequest.create] Error: Invalid leave type ID: ${validatedData.leave_type_id}`);
        throw new Error('Invalid leave type');
      }
      console.log(`[LeaveRequest.create] Found leave type: ${leaveType.name} (ID: ${leaveType.id})`);
      
      // Additional validation for casual leave
      const leaveTypeName = leaveType.name.toLowerCase();
      const startMonth = startDate.getMonth();
      const startYear = startDate.getFullYear();
      const endDate = new Date(validatedData.end_date);
      const endMonth = endDate.getMonth();
      const endYear = endDate.getFullYear();
      
      console.log(`[LeaveRequest.create] Date validation - Start: ${startYear}-${startMonth + 1}, End: ${endYear}-${endMonth + 1}`);
      
      // Check if it's a casual leave spanning months
      if (leaveTypeName.includes('casual') && leaveTypeName.includes('leave')) {
        console.log(`[LeaveRequest.create] Processing casual leave validation`);
        if (startYear !== endYear || startMonth !== endMonth) {
          console.error(`[LeaveRequest.create] Error: Casual leave spans multiple months - Start: ${startYear}-${startMonth + 1}, End: ${endYear}-${endMonth + 1}`);
          throw new Error('Casual leave cannot span more than one month');
        }
        console.log(`[LeaveRequest.create] Casual leave date range is within the same month`);
      }
      
      // Check if this is a casual leave (case-insensitive check)
      if (leaveTypeName.includes('casual')) {
        console.log(`[LeaveRequest.create] Checking for existing casual leaves for user ${validatedData.user_id} in ${year}-${month}`);
        
        // Check for any casual leaves in the same month
        const queryStr = `
          SELECT lr.* FROM leave_requests lr
          JOIN leave_types lt ON lr.leave_type_id = lt.id
          WHERE lr.user_id = ? 
            AND LOWER(lt.name) LIKE '%casual%'
            AND lr.status NOT IN ('rejected', 'cancelled')
            AND strftime('%Y-%m', lr.start_date) = ?`;
        
        const yearMonth = `${year}-${month.toString().padStart(2, '0')}`;
        const queryParams = [validatedData.user_id, yearMonth];
        
        console.log('Checking for existing casual leaves in the same month with params:', {
          userId: validatedData.user_id,
          yearMonth
        });
        
        console.log(`[LeaveRequest.create] Running query:`, queryStr.replace(/\s+/g, ' ').trim());
        console.log(`[LeaveRequest.create] Query params:`, queryParams);
        
        const existingCasualLeaves = await query(queryStr, queryParams);
        
        console.log(`[LeaveRequest.create] Found ${existingCasualLeaves.length} existing casual leaves in month ${yearMonth}`);
        
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
      
      // Check leave balance but don't deduct yet
      console.log(`[LeaveRequest.create] Checking leave balance for user ${validatedData.user_id} in year ${year}`);
      const balance = await this.getLeaveBalance(validatedData.user_id, year);
      console.log(`[LeaveRequest.create] Current leave balance:`, balance);
      
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
        console.error(`[LeaveRequest.create] Error: Insufficient leave balance. Required: ${days}, Available: ${currentBalance}`);
        throw new Error('Insufficient leave balance');
      }
        
      await run('BEGIN TRANSACTION');
      try {
        console.log(`[LeaveRequest.create] Creating new leave request in database`);
        const result = await run(
          'INSERT INTO leave_requests (user_id, leave_type_id, start_date, end_date, reason, status, days) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [validatedData.user_id, validatedData.leave_type_id, validatedData.start_date, validatedData.end_date, validatedData.reason, 'pending', days]
        );

        console.log(`[LeaveRequest.create] Successfully created leave request with ID: ${result.lastID}`);
        
        await run('COMMIT');
        return { ...validatedData, id: result.lastID, status: 'pending', days };
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
    
    if (status) {
      if (Array.isArray(status)) {
        if (status.length > 0) {
          const placeholders = status.map(() => '?').join(',');
          whereClauses.push(`lr.status IN (${placeholders})`);
          params.push(...status);
        }
      } else {
        whereClauses.push('lr.status = ?');
        params.push(status);
      }
    }
    
    if (userId) {
      whereClauses.push('lr.user_id = ?');
      params.push(userId);
    }
    
    if (leaveTypeId) {
      whereClauses.push('lr.leave_type_id = ?');
      params.push(leaveTypeId);
    }
    
    if (year) {
      // Use direct date comparison for better performance and accuracy
      const startDate = month 
        ? `${year}-${month.toString().padStart(2, '0')}-01`
        : `${year}-01-01`;
      const endDate = month
        ? `${year}-${month.toString().padStart(2, '0')}-31`
        : `${year}-12-31`;
        
      whereClauses.push('(lr.start_date BETWEEN ? AND ? OR lr.end_date BETWEEN ? AND ?)');
      params.push(startDate, endDate, startDate, endDate);
      
      console.log('Date range filter:', { startDate, endDate });
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
      LIMIT ? OFFSET ?
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
    const req = await this.getById(id);
    if (!req) throw new Error('Leave request not found');
    
    if (req.user_id !== userId) {
      throw new Error('You can only cancel your own leave requests');
    }

    if (req.status !== 'pending') {
      throw new Error('Only pending leave requests can be cancelled');
    }

    await run(
      'UPDATE leave_requests SET status = ? WHERE id = ?',
      ['cancelled', id]
    );
    
    return { success: true };
  },

  async getLeaveBalance(userId, year = new Date().getFullYear()) {
    const [balance] = await query(
      `SELECT lb.*, lt.name as leave_type_name 
       FROM leave_balances lb
       JOIN leave_types lt ON lb.leave_type_id = lt.id
       WHERE lb.user_id = ? AND lb.year = ?`,
      [userId, year]
    );
    
    return balance || null;
  }
};

module.exports = LeaveRequest;
