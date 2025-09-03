const express = require('express');
const router = express.Router();
const activityLogsController = require('../../controllers/activityLogs.controller');
const ActivityLog = require('../../models/activityLog.model');
const authMiddleware = require('../../middleware/auth.middleware');
const { ROLES } = require('../../config/roles');

// Protect all routes with authentication and admin/HR authorization
router.use(authMiddleware.authenticate);
router.use(authMiddleware.authorize([ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.HR]));

/**
 * @swagger
 * /api/admin/activity-logs:
 *   post:
 *     summary: Create a new activity log
 *     tags: [Activity Logs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - activityType
 *             properties:
 *               activityType:
 *                 type: string
 *                 enum: [USER_LOGIN, USER_LOGOUT, USER_CHECKIN, USER_CHECKOUT, USER_CREATE, USER_UPDATE, USER_DELETE, ATTENDANCE_UPDATE, SETTINGS_UPDATE, PASSWORD_CHANGE, PROFILE_UPDATE, ADMIN_ACTION, SYSTEM_EVENT, OTHER]
 *                 description: Type of activity
 *               details:
 *                 type: object
 *                 description: Additional details about the activity
 *               ipAddress:
 *                 type: string
 *                 description: IP address of the user
 *               userAgent:
 *                 type: string
 *                 description: User agent string
 *     responses:
 *       201:
 *         description: Activity log created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/', async (req, res, next) => {
  try {
    const { activityType, details = {}, ipAddress, userAgent } = req.body;
    const userId = req.user.id; // Get user ID from authenticated request

    const activityLog = await ActivityLog.logActivity({
      userId,
      activityType,
      details,
      ipAddress: ipAddress || req.ip,
      userAgent: userAgent || req.get('User-Agent')
    });

    if (!activityLog) {
      return res.status(500).json({ success: false, message: 'Failed to create activity log' });
    }

    res.status(201).json({ success: true, data: activityLog });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/admin/activity-logs:
 *   get:
 *     summary: Get all activity logs with filtering and pagination
 *     tags: [Activity Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of items per page
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: Filter by action type
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter by user ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by end date (YYYY-MM-DD)
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: timestamp
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order (asc/desc)
 *     responses:
 *       200:
 *         description: List of activity logs
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
 *                     $ref: '#/components/schemas/ActivityLog'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/', activityLogsController.getActivityLogs);

/**
 * @swagger
 * /api/admin/activity-logs/{id}:
 *   get:
 *     summary: Get activity log by ID
 *     tags: [Activity Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Activity log ID
 *     responses:
 *       200:
 *         description: Activity log details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/ActivityLog'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/:id', activityLogsController.getActivityLogById);

/**
 * @swagger
 * /api/admin/activity-logs/user/{userId}:
 *   get:
 *     summary: Get activity logs for a specific user
 *     tags: [Activity Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: List of user activity logs
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
 *                     $ref: '#/components/schemas/ActivityLog'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/user/:userId', activityLogsController.getUserActivityLogs);

module.exports = router;
