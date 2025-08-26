const { query, run } = require('../config/db');
const { ROLES } = require('../config/roles');
const { NotFoundError, BadRequestError } = require('../utils/errors');

// Re-export the query and run functions for backward compatibility
const dbQuery = query;
const dbRun = run;

// Get all users (admin only)
const getAllUsers = async (req, res, next) => {
  try {
    const users = await query(
      'SELECT id, name, email, role, is_active, created_at, updated_at FROM users ORDER BY name ASC'
    );
    
    res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    next(error);
  }
};

// Update user role (admin only)
const updateUserRole = async (req, res, next) => {
  const { userId } = req.params;
  const { role } = req.body;

  try {
    // Validate role
    if (!Object.values(ROLES).includes(role)) {
      throw new BadRequestError(`Invalid role. Must be one of: ${Object.values(ROLES).join(', ')}`);
    }

    // Check if user exists
    const [user] = await query('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Prevent changing own role
    if (user.id === req.user.id) {
      throw new BadRequestError('Cannot change your own role');
    }

    // Prevent changing role of super_admin unless you are super_admin
    if (user.role === ROLES.SUPER_ADMIN && req.user.role !== ROLES.SUPER_ADMIN) {
      throw new BadRequestError('Only super admin can modify other super admins');
    }

    // Prevent promoting to super_admin unless you are super_admin
    if (role === ROLES.SUPER_ADMIN && req.user.role !== ROLES.SUPER_ADMIN) {
      throw new BadRequestError('Only super admin can create other super admins');
    }

    // Update role
    await run('UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [role, userId]);
    
    res.json({ 
      success: true,
      message: 'User role updated successfully',
      data: { userId, role }
    });
  } catch (error) {
    next(error);
  }
};

// Delete user (admin only)
const deleteUser = async (req, res, next) => {
  const { userId } = req.params;

  try {
    // Check if user exists
    const [user] = await query('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Prevent deleting own account
    if (user.id === req.user.id) {
      throw new BadRequestError('Cannot delete your own account');
    }

    // Prevent deleting super_admin unless you are super_admin
    if (user.role === ROLES.SUPER_ADMIN && req.user.role !== ROLES.SUPER_ADMIN) {
      throw new BadRequestError('Only super admin can delete other super admins');
    }

    // Soft delete by setting is_active to false
    await run('UPDATE users SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [userId]);
    
    res.json({ 
      success: true,
      message: 'User deactivated successfully',
      data: { userId }
    });
  } catch (error) {
    next(error);
  }
};

// Get system statistics (admin only)
const getSystemStats = async (req, res, next) => {
  try {
    // Get user statistics
    const [
      { totalUsers },
      { activeUsers },
      { adminUsers },
      { recentUsers },
      { userActivity }
    ] = await Promise.all([
      // Total users
      query('SELECT COUNT(*) as totalUsers FROM users').then(([row]) => row || { totalUsers: 0 }),
      // Active users
      query('SELECT COUNT(*) as activeUsers FROM users WHERE is_active = 1').then(([row]) => row || { activeUsers: 0 }),
      // Admin users
      query('SELECT COUNT(*) as adminUsers FROM users WHERE role IN (?, ?)', [ROLES.ADMIN, ROLES.SUPER_ADMIN])
        .then(([row]) => row || { adminUsers: 0 }),
      // Recent users (last 7 days)
      query(`
        SELECT COUNT(*) as recentUsers 
        FROM users 
        WHERE created_at >= date('now', '-7 days')
      `).then(([row]) => row || { recentUsers: 0 }),
      // User activity (last 30 days)
      query(`
        SELECT 
          strftime('%Y-%m-%d', created_at) as date,
          COUNT(*) as logins
        FROM user_activity
        WHERE activity_type = 'login' 
          AND created_at >= date('now', '-30 days')
        GROUP BY date
        ORDER BY date ASC
      `).then(rows => ({ userActivity: rows || [] }))
    ]);
    
    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          active: activeUsers,
          admins: adminUsers,
          recent: recentUsers
        },
        activity: {
          logins: userActivity
        },
        server: {
          environment: process.env.NODE_ENV || 'development',
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage()
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get user activity logs (admin only)
const getUserActivity = async (req, res, next) => {
  const { userId, limit = 50, offset = 0 } = req.query;
  
  try {
    let queryStr = `
      SELECT 
        ua.id, 
        ua.user_id as userId,
        u.name as userName,
        ua.activity_type as activityType,
        ua.details,
        ua.ip_address as ipAddress,
        ua.user_agent as userAgent,
        ua.created_at as timestamp
      FROM user_activity ua
      JOIN users u ON ua.user_id = u.id
    `;
    
    const params = [];
    
    if (userId) {
      queryStr += ' WHERE ua.user_id = ?';
      params.push(userId);
    }
    
    queryStr += ' ORDER BY ua.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const activities = await query(queryStr, params);
    
    res.json({
      success: true,
      count: activities.length,
      data: activities
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllUsers,
  updateUserRole,
  deleteUser,
  getSystemStats,
  getUserActivity,
  // Export for testing
  _test: {
    dbQuery,
    dbRun
  }
};
