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
const logActivity = async (userId, activityType, user = null, details = {}, req = null) => {
  try {
    const ipAddress = req?.ip || null;
    const userAgent = req?.get('User-Agent') || null;
    
    const activityLog = await ActivityLog.logActivity({
      userId,
      activityType,
      user,
      details,
      ipAddress,
      userAgent
    });

    return activityLog;
  } catch (error) {
    console.error('Activity logging failed:', error);
    // Don't throw to avoid breaking the main operation
    return null;
  }
};

module.exports = { logActivity };
