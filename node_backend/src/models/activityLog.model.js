const { getDB, run, query } = require('../config/db');
const logger = require('../utils/logger');

// Activity types that map to activity_type in the database
const ACTIVITY_TYPES = {
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',
  USER_CHECKIN: 'USER_CHECKIN',
  USER_CHECKOUT: 'USER_CHECKOUT',
  USER_CREATE: 'USER_CREATE',
  USER_UPDATE: 'USER_UPDATE',
  USER_DELETE: 'USER_DELETE',
  ATTENDANCE_UPDATE: 'ATTENDANCE_UPDATE',
  SETTINGS_UPDATE: 'SETTINGS_UPDATE',
  PASSWORD_CHANGE: 'PASSWORD_CHANGE',
  PROFILE_UPDATE: 'PROFILE_UPDATE',
  ADMIN_ACTION: 'ADMIN_ACTION',
  SYSTEM_EVENT: 'SYSTEM_EVENT',
  OTHER: 'OTHER'
};

class ActivityLog {
  constructor(data) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.activity_type = data.activity_type || ACTIVITY_TYPES.OTHER;
    this.details = typeof data.details === 'string' 
      ? JSON.parse(data.details) 
      : (data.details || {});
    this.ip_address = data.ip_address || null;
    this.user_agent = data.user_agent || null;
    this.created_at = data.created_at ? new Date(data.created_at) : new Date();
  }

  // Convert to JSON format
  toJSON() {
    return {
      id: this.id,
      userId: this.user_id,
      activityType: this.activity_type,
      details: this.details,
      ipAddress: this.ip_address,
      userAgent: this.user_agent,
      timestamp: this.created_at
    };
  }

  // Save the activity log to the database
  static async logActivity(activityData) {
    try {
      const { 
        userId, 
        activityType = ACTIVITY_TYPES.OTHER, 
        details = {},
        ipAddress = null, 
        userAgent = null 
      } = activityData;
      
      if (!userId) {
        throw new Error('User ID is required');
      }
      
      // Validate activity type
      if (!Object.values(ACTIVITY_TYPES).includes(activityType)) {
        throw new Error(`Invalid activity type. Must be one of: ${Object.values(ACTIVITY_TYPES).join(', ')}`);
      }
      
      const result = await run(
        `INSERT INTO user_activity 
         (user_id, activity_type, details, ip_address, user_agent, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          userId,
          activityType,
          typeof details === 'string' ? details : JSON.stringify(details),
          ipAddress,
          userAgent,
          new Date().toISOString()
        ]
      );
      
      return await this.findById(result.lastID);
    } catch (error) {
      logger.error('Error logging activity:', error);
      // Don't throw to avoid breaking the main operation
      return null;
    }
  }

  // Find activity log by ID with user details
  static async findById(id) {
    try {
      const row = await query(
        `SELECT 
          ua.*, 
          u.name as user_name, 
          u.email as user_email,
          u.role as user_role
        FROM user_activity ua
        LEFT JOIN users u ON ua.user_id = u.id
        WHERE ua.id = ?`,
        [id]
      );
      
      if (!row) return null;
      
      // Include user details in the response
      const activityLog = new ActivityLog(row);
      if (row.user_id) {
        activityLog.user = {
          id: row.user_id,
          name: row.user_name,
          email: row.user_email,
          role: row.user_role || 'member'  // Default to 'member' if role is not set
        };
      }
      
      return activityLog;
    } catch (error) {
      logger.error('Error finding activity log by ID:', error);
      throw error;
    }
  }

  // Find all activity logs with pagination and filters
  static async findAll({ 
    page = 1, 
    limit = 10, 
    activityType, 
    userId, 
    startDate, 
    endDate, 
    sortBy = 'created_at', 
    sortOrder = 'DESC' 
  } = {}) {
    try {
      const offset = (page - 1) * limit;
      const whereClauses = [];
      const params = [];
      
      if (activityType) {
        whereClauses.push('activity_type = ?');
        params.push(activityType);
      }
      
      if (userId) {
        whereClauses.push('user_id = ?');
        params.push(userId);
      }
      
      if (startDate) {
        whereClauses.push('created_at >= ?');
        params.push(new Date(startDate).toISOString());
      }
      
      if (endDate) {
        whereClauses.push('created_at <= ?');
        params.push(new Date(endDate).toISOString());
      }
      
      const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
      
      // Get total count
      const countResult = await query(
        `SELECT COUNT(*) as total FROM user_activity ${whereClause}`, 
        params
      );
      const total = countResult ? countResult.total : 0;
      
      // Validate sort column to prevent SQL injection
      const validSortColumns = ['id', 'user_id', 'activity_type', 'created_at'];
      const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
      const sortDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      
      // Get paginated results with user details
      const rows = await query(
        `SELECT 
          ua.*, 
          u.name as user_name, 
          u.email as user_email,
          u.role as user_role
        FROM user_activity ua
        LEFT JOIN users u ON ua.user_id = u.id
        ${whereClause} 
        ORDER BY ua.${sortColumn} ${sortDirection}
        LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      // Process rows to include user details in the response
      const processedRows = rows.map(row => ({
        ...row,
        user: row.user_id ? {
          id: row.user_id,
          name: row.user_name,
          email: row.user_email,
          role: row.user_role || 'member'  // Default to 'member' if role is not set
        } : null
      }));
      
      return {
        data: Array.isArray(rows) ? processedRows.map(row => new ActivityLog(row)) : [],
        pagination: {
          total: parseInt(total, 10),
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          totalPages: Math.ceil(parseInt(total, 10) / parseInt(limit, 10))
        }
      };
    } catch (error) {
      logger.error('Error finding activity logs:', error);
      throw error;
    }
  }
  
  // Find activity logs by user ID
  static async findByUserId(userId, { page = 1, limit = 10 } = {}) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }
      
      return this.findAll({
        userId,
        page,
        limit,
        sortBy: 'created_at',
        sortOrder: 'DESC'
      });
    } catch (error) {
      logger.error('Error finding activity logs by user ID:', error);
      throw error;
    }
  }
}

module.exports = ActivityLog;
