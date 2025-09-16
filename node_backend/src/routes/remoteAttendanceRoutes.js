const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const { auth: authenticate } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');

// Import controller
const controller = require('../controllers/remoteAttendanceController');

// Debug log

// User routes for remote attendance
router.post(
  '/request',
  [
    authenticate,
    check('request_date', 'Request date is required').isDate(),
    check('reason', 'Reason is required').notEmpty()
  ],
  controller.requestRemoteWork
);

router.get(
  '/my-requests',
  authenticate,
  controller.getUserRemoteRequests
);

// Admin routes for managing remote attendance
router.get(
  '/pending',
  authenticate,
  checkRole(['admin','super_admin']),
  controller.getPendingRequests
);

router.put(
  '/:id/approve',
  authenticate,
  checkRole(['admin', 'super_admin']),
  controller.approveRemoteRequest
);

router.put(
  '/:id/reject',
  authenticate,
  checkRole(['admin', 'super_admin']),
  controller.rejectRemoteRequest
);

module.exports = router;
