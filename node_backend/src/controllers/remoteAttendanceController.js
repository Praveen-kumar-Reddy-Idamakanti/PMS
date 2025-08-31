const { getDB } = require('../config/db');
const { logActivity } = require('../utils/activityLogger');
const logger = require('../utils/logger');

// Request remote work
const requestRemoteWork = async (req, res) => {
  console.log('=== requestRemoteWork called ===');
  console.log('Request body:', req.body);
  const { request_date, reason } = req.body;
  const userId = req.user ? req.user.id : 'unknown';
  
  console.log('User ID:', userId);
  console.log('Request date:', request_date);
  console.log('Reason:', reason);
  
  try {
    console.log('Getting database instance...');
    const db = getDB();
    if (!db) {
      console.error('❌ Database connection is not available');
      return res.status(500).json({ 
        success: false,
        message: 'Database connection error',
        error: 'Database connection not available'
      });
    }
    console.log('✅ Database connection verified');
    
    // Debug: Check if we can query the database
    try {
      const testQuery = await new Promise((resolve, reject) => {
        db.get('SELECT 1 as test', [], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      console.log('✅ Test query successful:', testQuery);
    } catch (testErr) {
      console.error('❌ Test query failed:', testErr);
      return res.status(500).json({
        success: false,
        message: 'Database test query failed',
        error: testErr.message
      });
    }

    console.log('Checking for existing request...');
    // Check if request already exists for this date
    const existingRequest = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM remote_attendance_requests WHERE user_id = ? AND request_date = ?',
        [userId, request_date],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
    
    if (existingRequest) {
      console.log('❌ Request already exists for this date');
      return res.status(400).json({ 
        success: false,
        message: 'A request already exists for this date',
        existingRequest
      });
    }

    console.log('Creating new remote work request...');
    // Create new request
    try {
      const result = await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO remote_attendance_requests (user_id, request_date, reason) VALUES (?, ?, ?)',
          [userId, request_date, reason],
          function(err) {
            if (err) {
              console.error('❌ Error inserting request:', err);
              reject(err);
            } else {
              console.log('✅ Request created with ID:', this.lastID);
              resolve({ lastID: this.lastID });
            }
          }
        );
      });

      // Log activity
      console.log('Logging activity...');
      try {
        await logActivity(
          userId,
          'remote_request_created',
          { date: request_date },
          req
        );
        console.log('✅ Activity logged successfully');
      } catch (logError) {
        console.error('❌ Failed to log activity (non-critical):', logError);
        // Continue even if activity logging fails
      }

      console.log('✅ Request completed successfully');
      return res.status(201).json({
        success: true,
        message: 'Remote work request submitted successfully',
        requestId: result.lastID
      });
      
    } catch (dbError) {
      console.error('❌ Database error creating request:', dbError);
      return res.status(500).json({
        success: false,
        message: 'Failed to create remote work request',
        error: dbError.message
      });
    }
  } catch (error) {
    console.error('Error creating remote work request:', error);
    res.status(500).json({ message: 'Failed to submit remote work request' });
  }
};

// Approve remote work request (Admin only)
const approveRemoteRequest = async (req, res) => {
  const { requestId } = req.params;
  const adminId = req.user.id;
  const db = getDB();

  try {
    // Start transaction
    await new Promise((resolve, reject) => {
      db.run('BEGIN TRANSACTION', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Get the request
    const request = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM remote_attendance_requests WHERE request_id = ?',
        [requestId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!request) {
      await new Promise((resolve) => {
        db.run('ROLLBACK', (err) => {
          if (err) console.error('Error rolling back transaction:', err);
          resolve();
        });
      });
      return res.status(404).json({ message: 'Request not found' });
    }

    if (request.status !== 'pending') {
      await new Promise((resolve) => {
        db.run('ROLLBACK', (err) => {
          if (err) console.error('Error rolling back transaction:', err);
          resolve();
        });
      });
      return res.status(400).json({ message: 'Request is not in pending status' });
    }

    // Update request status
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE remote_attendance_requests SET status = ?, approved_by = ?, approved_at = CURRENT_TIMESTAMP WHERE request_id = ?',
        ['approved', adminId, requestId],
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Create attendance record
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO attendance (user_id, type, timestamp, mode, created_at, updated_at)
         VALUES (?, 'check_in', datetime(?), 'remote', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [request.user_id, request.request_date + ' 09:00:00'],
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Log activity
    await logActivity(
      adminId,
      'remote_request_approved',
      { 
        targetUserId: request.user_id, 
        date: request.request_date,
        requestId: requestId
      },
      req
    ).catch(err => {
      logger.error('Failed to log remote request approval:', err);
    });

    // Commit the transaction
    await new Promise((resolve, reject) => {
      db.run('COMMIT', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    res.json({ message: 'Remote work request approved successfully' });
  } catch (error) {
    // Rollback in case of error
    await new Promise((resolve) => {
      db.run('ROLLBACK', (err) => {
        if (err) console.error('Error rolling back transaction:', err);
        resolve();
      });
    });
    console.error('Error approving remote work request:', error);
    res.status(500).json({ message: 'Failed to approve remote work request' });
  }
};

// Reject remote work request (Admin only)
const rejectRemoteRequest = async (req, res) => {
  const { requestId } = req.params;
  const { reason: rejectionReason } = req.body;
  const adminId = req.user.id;
  const db = getDB();

  try {
    // Start transaction
    await new Promise((resolve, reject) => {
      db.run('BEGIN TRANSACTION', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Get the request
    const request = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM remote_attendance_requests WHERE request_id = ?',
        [requestId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!request) {
      await new Promise((resolve) => {
        db.run('ROLLBACK', (err) => {
          if (err) console.error('Error rolling back transaction:', err);
          resolve();
        });
      });
      return res.status(404).json({ message: 'Request not found' });
    }

    if (request.status !== 'pending') {
      await new Promise((resolve) => {
        db.run('ROLLBACK', (err) => {
          if (err) console.error('Error rolling back transaction:', err);
          resolve();
        });
      });
      return res.status(400).json({ message: 'Request is not in pending status' });
    }

    // Update request status
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE remote_attendance_requests SET status = ?, rejected_by = ?, rejected_at = CURRENT_TIMESTAMP, rejection_reason = ? WHERE request_id = ?',
        ['rejected', adminId, rejectionReason, requestId],
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Log activity
    await logActivity(
      adminId,
      'remote_request_rejected',
      { 
        targetUserId: request.user_id, 
        date: request.request_date,
        requestId: requestId,
        reason: rejectionReason
      },
      req
    ).catch(err => {
      logger.error('Failed to log remote request rejection:', err);
    });

    // Commit the transaction
    await new Promise((resolve, reject) => {
      db.run('COMMIT', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    res.json({ message: 'Remote work request rejected successfully' });
  } catch (error) {
    // Rollback in case of error
    await new Promise((resolve) => {
      db.run('ROLLBACK', (err) => {
        if (err) console.error('Error rolling back transaction:', err);
        resolve();
      });
    });
    console.error('Error rejecting remote work request:', error);
    res.status(500).json({ message: 'Failed to reject remote work request' });
  }
};

// Get user's remote work requests
const getUserRemoteRequests = async (req, res) => {
  const userId = req.user.id;
  const db = getDB();

  try {
    const { status, startDate, endDate } = req.query;

    let query = `
      SELECT r.*, u1.name as user_name, u2.name as approver_name 
      FROM remote_attendance_requests r
      LEFT JOIN users u1 ON r.user_id = u1.id
      LEFT JOIN users u2 ON r.approved_by = u2.id
      WHERE r.user_id = ?
    `;
    const params = [userId];

    if (status) {
      query += ' AND r.status = ?';
      params.push(status);
    }

    if (startDate) {
      query += ' AND r.request_date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND r.request_date <= ?';
      params.push(endDate);
    }

    query += ' ORDER BY r.request_date DESC';

    const requests = await new Promise((resolve, reject) => {
      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    res.json(requests);
  } catch (error) {
    console.error('Error fetching remote work requests:', error);
    res.status(500).json({ message: 'Failed to fetch remote work requests' });
  }
};

// Get all pending requests (Admin only)
const getPendingRequests = async (req, res) => {
  const db = getDB();
  
  try {
    const requests = await new Promise((resolve, reject) => {
      db.all(
        'SELECT r.*, u.name as user_name, u.email as user_email ' +
        'FROM remote_attendance_requests r ' +
        'JOIN users u ON r.user_id = u.id ' +
        'WHERE r.status = ? ' +
        'ORDER BY r.request_date DESC',
        ['pending'],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

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

// Debug log
console.log('Controller exports:');
console.log('- requestRemoteWork:', typeof requestRemoteWork === 'function' ? '✅' : '❌');
console.log('- approveRemoteRequest:', typeof approveRemoteRequest === 'function' ? '✅' : '❌');
console.log('- rejectRemoteRequest:', typeof rejectRemoteRequest === 'function' ? '✅' : '❌');
console.log('- getUserRemoteRequests:', typeof getUserRemoteRequests === 'function' ? '✅' : '❌');
console.log('- getPendingRequests:', typeof getPendingRequests === 'function' ? '✅' : '❌');
