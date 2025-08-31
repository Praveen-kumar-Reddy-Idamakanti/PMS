const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const attendanceController = require('../controllers/attendance.controller');
// Import validation middleware
const {
    checkInValidation,
    checkOutValidation,
    getRecordsValidation,
    summaryValidation
} = require('../middleware/attendance.validator');

// Use controller methods directly from the default export
const { 
    checkIn, 
    checkOut, 
    getAttendanceRecords, 
    getTodaysStatus, 
    getAttendanceSummary,
    getMyAttendance 
} = attendanceController;

// Debug middleware for attendance routes
// const debugRoute = (req, res, next) => {
//     console.log('\n=== ATTENDANCE ROUTE DEBUG ===');
//     console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
//     console.log('Route Path:', req.path);
//     console.log('Route Params:', req.params);
//     console.log('Query Params:', req.query);
//     console.log('Request Headers:', req.headers);
//     if (Object.keys(req.body).length > 0) {
//         console.log('Request Body:', req.body);
//     }
//     console.log('==============================\n');
//     next();
// };

// // Apply debug middleware to all attendance routes
// router.use(debugRoute);

/**
 * @swagger
 * tags:
 *   name: Attendance
 *   description: Employee attendance management
 */

/**
 * @swagger
 * /api/attendance/checkin:
 *   post:
 *     summary: Check in for work
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notes:
 *                 type: string
 *                 description: Optional notes for check-in
 *               location:
 *                 type: object
 *                 properties:
 *                   latitude:
 *                     type: number
 *                     format: float
 *                   longitude:
 *                     type: number
 *                     format: float
 *                   address:
 *                     type: string
 *               photo:
 *                 type: string
 *                 format: byte
 *                 description: Base64 encoded photo (optional)
 *     responses:
 *       201:
 *         description: Successfully checked in
 *       400:
 *         description: Validation error or already checked in
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/checkin', authenticate, ...checkInValidation, checkIn);

/**
 * @swagger
 * /api/attendance/checkout:
 *   post:
 *     summary: Check out from work
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notes:
 *                 type: string
 *                 description: Optional notes for check-out
 *               location:
 *                 type: object
 *                 properties:
 *                   latitude:
 *                     type: number
 *                     format: float
 *                   longitude:
 *                     type: number
 *                     format: float
 *                   address:
 *                     type: string
 *               photo:
 *                 type: string
 *                 format: byte
 *                 description: Base64 encoded photo (optional)
 *     responses:
 *       201:
 *         description: Successfully checked out
 *       400:
 *         description: Validation error or not checked in
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/checkout', authenticate, ...checkOutValidation, checkOut);

/**
 * @swagger
 * /api/attendance/records:
 *   get:
 *     summary: Get attendance records
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering records (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering records (YYYY-MM-DD)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Number of records to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of records to skip
 *       - in: query
 *         name: userId
 *         schema:
 *           type: integer
 *         description: User ID to get records for (admin/manager only)
 *     responses:
 *       200:
 *         description: List of attendance records
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/records', authenticate, ...getRecordsValidation, getAttendanceRecords);

/**
 * @swagger
 * /api/attendance/today:
 *   get:
 *     summary: Get today's attendance status
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Today's attendance status
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/today', authenticate, getTodaysStatus);

/**
 * @swagger
 * /api/attendance/summary:
 *   get:
 *     summary: Get attendance summary
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for summary (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *           default: today
 *         description: End date for summary (YYYY-MM-DD)
 *       - in: query
 *         name: userId
 *         schema:
 *           type: integer
 *         description: User ID to get summary for (admin/manager only)
 *     responses:
 *       200:
 *         description: Attendance summary
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/summary', authenticate, summaryValidation, getAttendanceSummary);

/**
 * @swagger
 * /api/attendance/me:
 *   get:
 *     summary: Get current user's attendance records
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering records (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering records (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: List of attendance records
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AttendanceRecord'
 *       401:
 *         description: Unauthorized
 *       400:
 *         description: Invalid date format
 *       500:
 *         description: Server error
 */
router.get('/me', authenticate, getMyAttendance);

module.exports = router;
