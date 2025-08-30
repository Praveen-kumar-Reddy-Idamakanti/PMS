const ActivityLog = require('../models/activityLog.model');

/**
 * Logs an activity
 * @param {number} userId - ID of the user performing the action
 * @param {string} activityType - Type of activity (from ACTIVITY_TYPES)
 * @param {Object} user - User object (optional)
 * @param {Object} details - Additional details about the activity
 * @param {Object} req - Express request object (optional)
 * @returns {Promise<Object>} The created activity log
 */
/**
 * Logs an activity
 * @param {number} userId - ID of the user performing the action
 * @param {string} activityType - Type of activity (from ACTIVITY_TYPES)
 * @param {Object} details - Additional details about the activity
 * @param {Object} req - Express request object (optional)
 * @returns {Promise<Object>} The created activity log
 */
const logActivity = async (userId, activityType, details = {}, req = null) => {
  try {
    if (!userId) {
      console.warn('Cannot log activity: User ID is required');
      return null;
    }

    const ipAddress = req?.ip || req?.connection?.remoteAddress || null;
    const userAgent = req?.get('User-Agent') || null;
    
    console.log('Logging activity:', {
      userId,
      activityType,
      ipAddress,
      userAgent,
      details
    });
    
    const activityLog = await ActivityLog.logActivity({
      userId,
      activityType,
      details,
      ipAddress,
      userAgent
    });

    if (!activityLog) {
      console.warn('Failed to log activity: No activity log was created');
    }

    return activityLog;
  } catch (error) {
    console.error('Activity logging failed:', error);
    // Don't throw to avoid breaking the main operation
    return null;
  }
};

module.exports = { logActivity };
