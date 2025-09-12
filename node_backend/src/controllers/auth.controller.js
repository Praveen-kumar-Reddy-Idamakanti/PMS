const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const { logActivity } = require('../utils/activityLogger');
const LeaveType = require('../models/leaves/LeaveType');
const LeaveBalance = require('../models/leaves/leaveBalance');

// Helper function to send consistent responses
const sendResponse = (res, status, success, message, data = null) => {
    const response = { success, message };
    if (data) response.data = data;
    return res.status(status).json(response);
};

// Add this new helper function
async function initializeUserLeaveBalances(userId) {
  try {
    const leaveTypes = await LeaveType.getAll();
    const currentYear = new Date().getFullYear();
    
    for (const type of leaveTypes) {
      await LeaveBalance.upsert(
        userId,
        type.id,
        currentYear,
        type.yearly_quota
      );
      console.log(`Initialized ${type.name} for user ${userId} with ${type.yearly_quota} days`);
    }
    return true;
  } catch (error) {
    console.error(`Error initializing leave balances for user ${userId}:`, error);
    return false;
  }
}

/**
 * Register a new user
 * @route POST /api/auth/register
 * @access Public
 */
const register = async (req, res) => {
    const { name, email, password, employeeId, role = 'user' } = req.body; // Default to 'user' role if not provided

    try {
        // Check if user already exists
        let user = await User.findByEmail(email);
        if (user) {
            return res.status(400).json({
                success: false,
                message: 'User already exists'
            });
        }

        // Create new user
        user = await User.create({ name, email, password, employeeId, role });
        if (!user) {
            return res.status(500).json({
                success: false,
                message: 'Failed to create user'
            });
        }

        // Initialize leave balances for the new user
        await initializeUserLeaveBalances(user.id);

        // Log user registration
        await logActivity(user.id, 'USER_CREATE', {
            action: 'user_registered',
            details: { role, email }
        }, req);

        // Log user data to verify role is present
        console.log('Register - User data from DB:', { id: user.id, email: user.email, role: user.role });

        // Create JWT payload with user data including employee ID
        const payload = { 
            user: { 
                id: user.id,
                name: user.name,
                email: user.email,
                employeeId: user.employee_id, // Include employee ID in the token
                role: user.role || 'user' // Ensure role is included with a default
            } 
        };

        // Sign token
        jwt.sign(
            payload,
            process.env.JWT_SECRET || 'your_jwt_secret',
            { expiresIn: '24h' },
            (err, token) => {
                if (err) {
                    console.error('JWT sign error:', err);
                    return sendResponse(res, 500, false, 'Server error during token generation');
                }
                
                // Return the user data in the expected format
                res.status(201).json({
                    success: true,
                    message: 'User registered successfully',
                    user: {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        employeeId: user.employee_id,
                        role: user.role || 'user'
                    },
                    token
                });
            }
        );
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// User login
// @route   POST /api/auth/login
// @access  Public
/**
 * User login
 * @route POST /api/auth/login
 * @access Public
 */
const login = async (req, res) => {
    console.log('Login request received:', {
        body: req.body,
        headers: req.headers
    });
    const { email, employeeId, password } = req.body;
    
    // Validate that either email or employeeId is provided
    if ((!email && !employeeId) || !password) {
        return res.status(400).json({
            success: false,
            message: 'Please provide either email or employee ID and password'
        });
    }

    try {
        let user;
        
        // Find user by email or employee ID
        if (email) {
            console.log('Login attempt with email:', email);
            user = await User.findByEmail(email);
            if (!user) {
                console.log('User not found for email:', email);
                return res.status(400).json({
                    success: false,
                    message: 'Invalid credentials'
                });
            }
        } else if (employeeId) {
            console.log('Login attempt with employee ID:', employeeId);
            user = await User.findByEmployeeId(employeeId);
            if (!user) {
                console.log('User not found for employee ID:', employeeId);
                return res.status(400).json({
                    success: false,
                    message: 'Invalid credentials'
                });
            }
        }
        console.log('User found:', { id: user.id, email: user.email });

        // Check password
        console.log('Comparing password...');
        const isMatch = await User.comparePassword(password, user.password);
        console.log('Password match result:', isMatch);
        
        if (!isMatch) {
            console.log('Invalid password for user:', email);
            
            // Log failed login attempt
            if (user?.id) {
                await logActivity(user.id, 'USER_LOGIN_FAILED', {
                    method: email ? 'email' : 'employee_id',
                    reason: 'invalid_password',
                    ip: req.ip,
                    userAgent: req.get('User-Agent')
                }, req);
            }
            
            return res.status(400).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Log user data to verify role is present
        console.log('User data from DB:', { id: user.id, email: user.email, role: user.role });

        // Log login attempt
        await logActivity(user.id, 'USER_LOGIN', {
            method: email ? 'email' : 'employee_id',
            success: true,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        }, req);

        // Create JWT payload with user data including employee ID
        const payload = { 
            user: { 
                id: user.id,
                name: user.name,
                email: user.email,
                employeeId: user.employee_id, // Include employee ID in the token
                role: user.role || 'user' // Ensure role is included with a default
            } 
        };

        // Sign token
        jwt.sign(
            payload,
            process.env.JWT_SECRET || 'your_jwt_secret',
            { expiresIn: '24h' },
            (err, token) => {
                if (err) {
                    console.error('JWT sign error:', err);
                    return sendResponse(res, 500, false, 'Server error during token generation');
                }
                
                // Log the token payload for debugging
                console.log('Token payload:', payload);
                
                // Send token and user data directly in the response
                res.status(200).json({
                    success: true,
                    message: 'Login successful',
                    token,
                    user: {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        employeeId: user.employee_id, // Include employee ID in the response
                        role: user.role || 'user'  // Ensure role has a default value
                    }
                });
            }
        );
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// Get current user
/**
 * Get current user
 * @route GET /api/auth/user
 * @access Private
 */
const getCurrentUser = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        res.status(200).json({
            success: true,
            message: 'User retrieved successfully',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role || 'user'  // Ensure role has a default value
            }
        });
    } catch (err) {
        console.error('Get current user error:', err);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

/**
 * Logout user (clears client-side token)
 * @route POST /api/auth/logout
 * @access Private
 */
const logout = async (req, res) => {
    try {
        // Log user logout
        if (req.user && req.user.id) {
            await logActivity(req.user.id, 'USER_LOGOUT', {
                action: 'user_logout',
                ip: req.ip
            }, req);
        }
    } catch (error) {
        console.error('Error logging logout activity:', error);
        // Don't fail the logout if logging fails
    }
    
    // Clear the client-side token
    res.status(200).json({
        success: true,
        message: 'Logged out successfully'
    });
};

// Export all controller functions
module.exports = {
    register,
    login,
    getCurrentUser,
    logout
};