const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const attendanceController = require('../controllers/adminAttendance.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { ROLES } = require('../config/roles');

// Protect all routes with authentication and admin/HR authorization
router.use(authMiddleware.authenticate);
router.use(authMiddleware.authorize([ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.HR]));

// User management routes
router.get('/users', adminController.getAllUsers);
router.post('/users', adminController.createUser);
router.patch('/users/:userId/role', adminController.updateUserRole);
router.delete('/users/:userId', adminController.deleteUser);

// System stats
router.get('/stats', adminController.getSystemStats);

// Attendance management routes
router.get('/attendance', attendanceController.getAllAttendance);
router.get('/attendance/stats', attendanceController.getAttendanceStats);
router.patch('/attendance/:attendanceId', attendanceController.updateAttendanceStatus);
router.post('/attendance/bulk', attendanceController.bulkUpdateAttendance);

module.exports = router;
