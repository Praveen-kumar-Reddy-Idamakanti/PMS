const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const { auth: authenticate, authorize } = require('../../middleware/auth');

// Import controller
const controller = require('../../controllers/remoteAttendanceController');

// Debug log
console.log('Admin Routes: getPendingRequests exists:', typeof controller.getPendingRequests === 'function');
console.log('Admin Routes: approveRemoteRequest exists:', typeof controller.approveRemoteRequest === 'function');
console.log('Admin Routes: rejectRemoteRequest exists:', typeof controller.rejectRemoteRequest === 'function');

// Admin routes for remote attendance
router.get(
  '/pending',
  [authenticate, authorize(['admin'])],
  controller.getPendingRequests
);

router.post(
  '/:requestId/approve',
  [authenticate, authorize(['admin'])],
  controller.approveRemoteRequest
);

router.post(
  '/:requestId/reject',
  [
    authenticate, 
    authorize(['admin']),
    check('reason', 'Rejection reason is required').notEmpty()
  ],
  controller.rejectRemoteRequest
);

module.exports = router;
