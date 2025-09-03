const { query, run } = require('../../config/db');
const { ROLES } = require('../../config/roles');
const { NotFoundError, BadRequestError } = require('../../utils/errors');
const bcrypt = require('bcryptjs');
const LeaveRequest = require('../../models/leaves/leaveRequest'); // Import LeaveRequest model

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
      query('SELECT COUNT(*) as adminUsers FROM users WHERE role IN (?, ?, ?)', [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.HR])
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

// Create a new user (admin only)
const createUser = async (req, res, next) => {
  const { name, email, password, employeeId, role = ROLES.EMPLOYEE } = req.body;
  const currentUserRole = req.user.role;

  try {
    // Validate input
    if (!name || !email || !password || !employeeId) {
      throw new BadRequestError('Name, email, password, and employee ID are required');
    }

    // Validate role
    if (!Object.values(ROLES).includes(role)) {
      throw new BadRequestError(`Invalid role. Must be one of: ${Object.values(ROLES).join(', ')}`);
    }

    // Role-based permission checks
    if (currentUserRole === ROLES.ADMIN && role === ROLES.SUPER_ADMIN) {
      throw new BadRequestError('You do not have permission to create a super admin user');
    }

    if (currentUserRole === ROLES.HR && 
        ![ROLES.TEAM_LEADER, ROLES.EMPLOYEE, ROLES.INTERN].includes(role)) {
      throw new BadRequestError('You can only create team leaders, employees, and interns');
    }

    if (currentUserRole === ROLES.TEAM_LEADER && 
        ![ROLES.EMPLOYEE, ROLES.INTERN].includes(role)) {
      throw new BadRequestError('You can only create employees and interns');
    }

    // Check if email already exists
    const [existingUser] = await query('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) {
      throw new BadRequestError('Email already in use');
    }

    // Check if employee ID already exists
    const [existingEmployee] = await query('SELECT id FROM users WHERE employee_id = ?', [employeeId]);
    if (existingEmployee) {
      throw new BadRequestError('Employee ID already in use');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const now = new Date().toISOString();

    // Create user - let the database handle the auto-increment ID
    const { insertId } = await run(
      `INSERT INTO users (name, email, password, employee_id, role, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
      [name, email, hashedPassword, employeeId, role, now, now]
    );

    // Get the created user (without password)
    const [user] = await query(
      'SELECT id, name, email, role, employee_id as employeeId, is_active as isActive, created_at as createdAt, updated_at as updatedAt FROM users WHERE id = ?',
      [insertId]
    );

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// Get all leave requests (admin only)
const getAllLeaveRequests = async (req, res, next) => {
  try {
    const leaveRequests = await LeaveRequest.getAllWithUserDetails(); // Assuming this method exists
    res.json({
      success: true,
      count: leaveRequests.length,
      data: leaveRequests,
    });
  } catch (error) {
    next(error);
  }
};

// Update leave request status (admin only)
const updateLeaveRequestStatus = async (req, res, next) => {
  const { id } = req.params;
  const { status } = req.body; // 'approved', 'rejected'

  try {
    if (!['approved', 'rejected'].includes(status)) {
      throw new BadRequestError('Invalid status. Must be \'approved\' or \'rejected\'.');
    }

    const processedBy = req.user.id; // Assuming req.user is populated by auth middleware
    const result = await LeaveRequest.updateStatus(id, status, processedBy); // Assuming this method exists

    if (!result) {
      throw new NotFoundError('Leave request not found or status already updated.');
    }

    res.json({
      success: true,
      message: `Leave request ${id} ${status} successfully.`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};


module.exports = {
  getAllUsers,
  createUser,
  updateUserRole,
  deleteUser,
  getSystemStats,
  getUserActivity,
  getAllLeaveRequests, // Export new function
  updateLeaveRequestStatus, // Export new function
  // Export for testing
  _test: {
    dbQuery,
    dbRun
  }
};

