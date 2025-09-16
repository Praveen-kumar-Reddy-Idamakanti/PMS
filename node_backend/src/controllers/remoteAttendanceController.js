const { query, run } = require('../config/db');
const { logActivity } = require('../utils/activityLogger');
const logger = require('../utils/logger');

// Request remote work
const requestRemoteWork = async (req, res) => {
  const { request_date, reason } = req.body;
  const userId = req.user ? req.user.id : 'unknown';
  
  console.log(`[DEBUG] Remote work request - userId: ${userId}, request_date: ${request_date}, type: ${typeof request_date}`);
  console.log(`[DEBUG] Request body:`, req.body);
  
  try {
    // Check if request already exists for this date
    const existingRequest = await query(
        'SELECT * FROM remote_attendance_requests WHERE user_id = $1 AND request_date::date = $2::date',
        [userId, request_date]
    );
    
    if (existingRequest.length > 0) {
      return res.status(400).json({ 
        success: false,
        message: 'A request already exists for this date',
        existingRequest: existingRequest[0]
      });
    }

    // Create new request - ensure we store the date correctly
    // The request_date comes as "YYYY-MM-DD" from frontend, we need to store it as a proper date
    // Use the date string directly as a DATE type in PostgreSQL
    console.log(`[DEBUG] Storing date: ${request_date} (as string for PostgreSQL DATE type)`);
    
    const result = await run(
      'INSERT INTO remote_attendance_requests (user_id, request_date, reason) VALUES ($1, $2::date, $3) RETURNING request_id',
      [userId, request_date, reason]
    );
    const newRequestId = result.rows[0].request_id;

    // Log activity
    await logActivity(
      userId,
      'ADMIN_ACTION',
      { 
        action: 'remote_request_created',
        request_date: request_date,
        request_id: newRequestId
      },
      req
    ).catch(logError => {
        logger.error('Failed to log remote request creation:', logError);
    });

    return res.status(201).json({
      success: true,
      message: 'Remote work request submitted successfully',
      requestId: newRequestId
    });
      
  } catch (error) {
    console.error('Error creating remote work request:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint
    });
    res.status(500).json({ 
      message: 'Failed to submit remote work request',
      error: error.message
    });
  }
};

// Approve remote work request (Admin only)
const approveRemoteRequest = async (req, res) => {
  const { id: requestId } = req.params;
  const adminId = req.user.id;

  try {
    await run('BEGIN');

    const requests = await query(
        'SELECT * FROM remote_attendance_requests WHERE request_id = $1',
        [requestId]
    );
    const request = requests[0];

    if (!request) {
      await run('ROLLBACK');
      return res.status(404).json({ message: 'Request not found' });
    }

    if (request.status !== 'pending') {
      await run('ROLLBACK');
      return res.status(400).json({ message: 'Request is not in pending status' });
    }

    await run(
      'UPDATE remote_attendance_requests SET status = $1, approved_by = $2, approved_at = CURRENT_TIMESTAMP WHERE request_id = $3',
      ['approved', adminId, requestId]
    );

    // Set checkin time to 10:00 AM UTC for remote workers
    console.log(`[DEBUG] Original request_date: ${request.request_date}, type: ${typeof request.request_date}`);
    console.log(`[DEBUG] Request date as string: ${request.request_date.toString()}`);
    console.log(`[DEBUG] Request date as ISO: ${request.request_date instanceof Date ? request.request_date.toISOString() : 'N/A'}`);
    
    // Handle the date properly - we need to use the original request date, not the stored date
    // The stored date might have timezone conversion issues, so we'll use the date from the request
    let attendanceDate;
    
    // Extract the date part from the original request_date (which should be the correct date)
    let requestDateStr;
    
    if (request.request_date instanceof Date) {
      // If it's a Date object, use local date methods to avoid timezone conversion
      // The date object should represent the original request date
      const year = request.request_date.getFullYear();
      const month = String(request.request_date.getMonth() + 1).padStart(2, '0');
      const day = String(request.request_date.getDate()).padStart(2, '0');
      requestDateStr = `${year}-${month}-${day}`;
    } else if (typeof request.request_date === 'string') {
      // If it's a string, extract the date part
      requestDateStr = request.request_date.split('T')[0];
    } else {
      throw new Error(`Unexpected request_date format: ${typeof request.request_date}`);
    }
    
    console.log(`[DEBUG] Extracted date string: ${requestDateStr}`);
    
    // Create attendance date for the correct date at 10:00 AM UTC
    attendanceDate = new Date(requestDateStr + 'T10:00:00.000Z');
    
    console.log(`[DEBUG] Created date: ${attendanceDate}`);
    console.log(`[DEBUG] UTC Hours: ${attendanceDate.getUTCHours()}`);
    console.log(`[DEBUG] Date part: ${attendanceDate.toISOString().split('T')[0]}`);
    
    // Validate the date
    if (isNaN(attendanceDate.getTime())) {
      throw new Error(`Invalid date format: ${request.request_date}`);
    }
    
    const timestamp = attendanceDate.toISOString();
    console.log(`[DEBUG] Final timestamp: ${timestamp}`);
    
    await run(
      `INSERT INTO attendance (user_id, type, timestamp, mode, created_at)
       VALUES ($1, 'checkin', $2, 'remote', CURRENT_TIMESTAMP)`,
      [request.user_id, timestamp]
    );

    await logActivity(
      adminId,
      'ADMIN_ACTION',
      { 
        action: 'remote_request_approved',
        targetUserId: request.user_id, 
        date: request.request_date,
        requestId: requestId
      },
      req
    ).catch(err => {
      logger.error('Failed to log remote request approval:', err);
    });

    await run('COMMIT');

    res.json({ message: 'Remote work request approved successfully' });
  } catch (error) {
    await run('ROLLBACK');
    console.error('Error approving remote work request:', error);
    res.status(500).json({ message: 'Failed to approve remote work request' });
  }
};

// Reject remote work request (Admin only)
const rejectRemoteRequest = async (req, res) => {
  const { id: requestId } = req.params;
  const { comments: rejectionReason } = req.body;
  const adminId = req.user.id;

  if (!requestId) {
    return res.status(400).json({ message: 'Request ID is required' });
  }

  if (!rejectionReason) {
    return res.status(400).json({ message: 'Rejection reason is required' });
  }

  try {
    await run('BEGIN');

    const requests = await query(
        'SELECT * FROM remote_attendance_requests WHERE request_id = $1',
        [requestId]
    );
    const request = requests[0];

    if (!request) {
      await run('ROLLBACK');
      return res.status(404).json({ message: 'Request not found' });
    }

    if (request.status !== 'pending') {
      await run('ROLLBACK');
      return res.status(400).json({ message: 'Request is not in pending status' });
    }

    await run(
      'UPDATE remote_attendance_requests SET status = $1, rejected_by = $2, rejected_at = CURRENT_TIMESTAMP, rejection_reason = $3 WHERE request_id = $4',
      ['rejected', adminId, rejectionReason, requestId]
    );

    await logActivity(
      adminId,
      'ADMIN_ACTION',
      { 
        action: 'remote_request_rejected',
        targetUserId: request.user_id, 
        date: request.request_date,
        requestId: requestId,
        reason: rejectionReason
      },
      req
    ).catch(err => {
      logger.error('Failed to log remote request rejection:', err);
    });

    await run('COMMIT');

    res.json({ message: 'Remote work request rejected successfully' });
  } catch (error) {
    await run('ROLLBACK');
    console.error('Error rejecting remote work request:', error);
    res.status(500).json({ message: 'Failed to reject remote work request' });
  }
};

// Get user's remote work requests
const getUserRemoteRequests = async (req, res) => {
  const userId = req.user.id;

  try {
    const { status, startDate, endDate } = req.query;
    
    console.log(`[DEBUG] getUserRemoteRequests - userId: ${userId}, status: ${status}, startDate: ${startDate}, endDate: ${endDate}`);

    let sql = `
      SELECT r.*, u1.name as user_name, u2.name as approver_name 
      FROM remote_attendance_requests r
      LEFT JOIN users u1 ON r.user_id = u1.id
      LEFT JOIN users u2 ON r.approved_by = u2.id
      WHERE r.user_id = $1
    `;
    const params = [userId];
    let paramIndex = 1;

    if (status) {
      sql += ` AND r.status = $${++paramIndex}`;
      params.push(status);
    }

    if (startDate) {
      sql += ` AND r.request_date::date >= $${++paramIndex}::date`;
      params.push(startDate);
    }

    if (endDate) {
      sql += ` AND r.request_date::date <= $${++paramIndex}::date`;
      params.push(endDate);
    }

    sql += ' ORDER BY r.request_date DESC';

    console.log(`[DEBUG] Executing SQL: ${sql}`);
    console.log(`[DEBUG] With params:`, params);

    const requests = await query(sql, params);
    
    console.log(`[DEBUG] Found ${requests.length} remote requests:`, requests);

    res.json(requests);
  } catch (error) {
    console.error('Error fetching remote work requests:', error);
    res.status(500).json({ message: 'Failed to fetch remote work requests' });
  }
};

// Get all pending requests (Admin only)
const getPendingRequests = async (req, res) => {
  try {
    const requests = await query(
        'SELECT r.*, u.name as user_name, u.email as user_email ' +
        'FROM remote_attendance_requests r ' +
        'JOIN users u ON r.user_id = u.id ' +
        'WHERE r.status = $1 ' +
        'ORDER BY r.request_date DESC',
        ['pending']
    );

    res.json(requests);
  } catch (error) {
    console.error('Error fetching pending remote work requests:', error);
    res.status(500).json({ 
      message: 'Failed to fetch pending remote work requests',
      error: error.message 
    });
  }
};

// Export all functions as a single object
module.exports = {
  requestRemoteWork,
  approveRemoteRequest,
  rejectRemoteRequest,
  getUserRemoteRequests,
  getPendingRequests
};