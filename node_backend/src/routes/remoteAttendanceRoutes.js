const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const { auth: authenticate } = require('../middleware/auth');

// Import controller
const controller = require('../controllers/remoteAttendanceController');

// Debug log
console.log('Remote Attendance Routes: requestRemoteWork exists:', typeof controller.requestRemoteWork === 'function');
console.log('Remote Attendance Routes: getUserRemoteRequests exists:', typeof controller.getUserRemoteRequests === 'function');

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

module.exports = router;
