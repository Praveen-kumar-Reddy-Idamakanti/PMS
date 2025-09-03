// routes/leaveRequests.js
const express = require('express');
const { auth } = require('../../middleware/auth');
const LeaveRequest = require('../../models/leaves/leaveRequest');
const router = express.Router();

/**
 * @route   GET /api/leave-requests/user/:userId
 * @desc    Get leave requests for a specific user
 * @access  Private (user can view their own requests, team leaders can view their team's requests)
 */
router.get('/user/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, year } = req.query;
    
    // Check if user is viewing their own requests or is a team leader
    const isViewingOwnRequests = req.user.id.toString() === userId;
    const isTeamLeader = req.user.role === 'team_leader' || req.user.role === 'admin' || req.user.role === 'super_admin';
    
    // If not viewing own requests and not a team leader, deny access
    if (!isViewingOwnRequests && !isTeamLeader) {
      return res.status(403).json({ 
        success: false, 
        error: 'Not authorized to view these leave requests' 
      });
    }
    
    const rows = await LeaveRequest.getByUser(userId, { status, year });
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error fetching leave requests:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Server error while fetching leave requests' 
    });
  }
});

// Apply auth middleware to all write operations
router.use(auth);

/**
 * @route   POST /api/leave-requests
 * @desc    Create a new leave request
 * @access  Private
 */
router.post('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const { typeId, startDate, endDate, reason = '' } = req.body;
    
    // Input validation
    if (!typeId || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'typeId, startDate and endDate are required'
      });
    }
    
    // Create the leave request
    const created = await LeaveRequest.create({
      user_id: userId,
      leave_type_id: typeId,
      start_date: startDate,
      end_date: endDate,
      reason
    });
    
    res.status(201).json({ 
      success: true, 
      data: created 
    });
    
  } catch (err) {
    console.error('Error creating leave request:', err);
    const status = err.statusCode || 500;
    res.status(status).json({
      success: false,
      error: err.message || 'Error creating leave request'
    });
  }
});

/**
 * @route   PUT /api/leave-requests/:id/status
 * @desc    Update leave request status (approve/reject/cancel)
 * @access  Private (Super Admin only)
 */
router.put('/:id/status', async (req, res) => {
  try {
    // Only allow super admins to update status
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Only super administrators are authorized to update leave request status'
      });
    }
    
    const { id } = req.params;
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required'
      });
    }
    
    const result = await LeaveRequest.updateStatus(
      id, 
      status, 
      req.user.id // processed_by
    );
    
    res.json({ 
      success: true, 
      data: result 
    });
    
  } catch (err) {
    console.error('Error updating leave request status:', err);
    const status = err.statusCode || 500;
    res.status(status).json({
      success: false,
      error: err.message || 'Error updating leave request status'
    });
  }
});

module.exports = router;
