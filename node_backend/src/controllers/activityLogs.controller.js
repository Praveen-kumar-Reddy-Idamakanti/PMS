const ActivityLog = require('../models/activityLog.model');
const { ErrorHandler } = require('../utils/errorHandler');
const logger = require('../utils/logger');
const { getDB } = require('../config/db');

/**
 * Get all activity logs with filtering and pagination
 * @route GET /api/admin/activity-logs
 * @access Private/Admin
 */
const getActivityLogs = async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      action, 
      userId, 
      startDate, 
      endDate,
      sortBy = 'created_at',
      sortOrder = 'DESC',
      search
    } = req.query;

    // Call the static findAll method directly on the class
    const result = await ActivityLog.findAll({
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      activityType: action,
      userId,
      startDate,
      endDate,
      sortBy,
      sortOrder
    });

    // The model's findAll already returns properly formatted data
    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  } catch (error) {
    logger.error('Error fetching activity logs:', error);
    next(new ErrorHandler(500, 'Failed to fetch activity logs'));
  }
};

/**
 * Get activity log by ID
 * @route GET /api/admin/activity-logs/:id
 * @access Private/Admin
 */
const getActivityLogById = async (req, res, next) => {
  try {
    const log = await ActivityLog.findById(req.params.id);

    if (!log) {
      return next(new ErrorHandler(404, 'Activity log not found'));
    }

    // Get user details with role
    const user = await getDB().get(
      'SELECT u.id, u.name, u.email, u.employee_id, r.name as role_name ' +
      'FROM users u ' +
      'LEFT JOIN roles r ON u.role_id = r.id ' +
      'WHERE u.id = ?',
      [log.user_id]
    );

    const logData = log.toJSON();
    if (user) {
      logData.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        employeeId: user.employee_id,
        role: user.role_name || 'User'
      };
    }

    res.json({ success: true, data: logData });
  } catch (error) {
    logger.error('Error fetching activity log by ID:', error);
    next(new ErrorHandler(500, 'Failed to fetch activity log'));
  }
};

/**
 * Get activity logs for a specific user
 * @route GET /api/admin/activity-logs/user/:userId
 * @access Private/Admin
 */
const getUserActivityLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = { userId: req.params.userId };

    const result = await ActivityLog.findAll({
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      query
    });

    // Logs already have user details from the model
    const logsWithUserDetails = result.data.map(log => log.toJSON());

    res.json({
      success: true,
      data: logsWithUserDetails,
      pagination: result.pagination
    });
  } catch (error) {
    logger.error('Error fetching user activity logs:', error);
    next(new ErrorHandler(500, 'Failed to fetch user activity logs'));
  }
};

module.exports = {
  getActivityLogs,
  getActivityLogById,
  getUserActivityLogs
};
