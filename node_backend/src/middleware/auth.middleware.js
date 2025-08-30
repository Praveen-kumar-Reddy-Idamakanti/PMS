const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const { ROLES } = require('../config/roles');
const logger = require('../utils/logger');

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request object
 */
const authenticate = async (req, res, next) => {
    // Get token from header or Authorization header
    let token = req.header('x-auth-token');
    
    // If no token in x-auth-token, check Authorization header
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
    }

    // Check if no token
    if (!token) {
        console.log('Auth Failed: No token provided');
        return res.status(401).json({ 
            success: false,
            message: 'No authentication token, authorization denied' 
        });
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
        
        // Get user from the database including employee_id
        const [user] = await query('SELECT id, name, email, employee_id, role, is_active FROM users WHERE id = ?', [decoded.user.id]);
        
        if (!user) {
            logger.warn(`Authentication failed: User not found (ID: ${decoded.user.id})`);
            return res.status(401).json({ 
                success: false,
                message: 'User not found or account deactivated' 
            });
        }

        // Check if user account is active
        if (!user.is_active) {
            logger.warn(`Authentication failed: User account deactivated (ID: ${user.id})`);
            return res.status(403).json({
                success: false,
                message: 'Account has been deactivated. Please contact an administrator.'
            });
        }

        // Attach user to request object with role and employeeId
        req.user = {
            id: user.id,
            name: user.name,
            email: user.email,
            employeeId: user.employee_id,
            role: user.role,
            is_active: user.is_active
        };
        
        logger.debug(`Authenticated user: ${user.email} (${user.role})`);
        
        next();
    } catch (err) {
        console.error('\n=== AUTHENTICATION ERROR ===');
        console.error('Error Type:', err.name);
        console.error('Error Message:', err.message);
        console.error('Token:', token ? `${token.substring(0, 20)}...` : 'No token');
        logger.error('Authentication error:', {
            message: err.message,
            name: err.name,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
        
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                success: false,
                message: 'Session expired, please login again' 
            });
        }
        
        return res.status(401).json({ 
            success: false,
            message: 'Invalid authentication token',
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        });
    }
};

/**
 * Authorization middleware
 * Checks if the user has the required role(s)
 * @param {string[]} allowedRoles - Array of allowed roles
 */
const authorize = (allowedRoles = []) => {
    return (req, res, next) => {
        try {
            // Skip authorization if no roles are specified (public route)
            if (!allowedRoles || allowedRoles.length === 0) {
                return next();
            }
            
            // Check if user is authenticated
            if (!req.user) {
                logger.warn('Authorization failed: No user in request');
                return res.status(401).json({
                    success: false,
                    message: 'Not authenticated'
                });
            }
            
            // Check if user has one of the allowed roles
            if (!allowedRoles.includes(req.user.role)) {
                logger.warn(`Authorization failed: User ${req.user.id} does not have required role(s): ${allowedRoles.join(', ')}`);
                return res.status(403).json({
                    success: false,
                    message: 'You do not have permission to access this resource'
                });
            }
            
            logger.debug(`Authorization granted for user ${req.user.id} with role ${req.user.role}`);
            next();
        } catch (error) {
            logger.error('Authorization error:', error);
            return res.status(500).json({
                success: false,
                message: 'An error occurred during authorization'
            });
        }
    };
};

/**
 * Middleware to check if the user is an admin or HR
 * @returns {Function} Express middleware function
 */
const isAdmin = (req, res, next) => {
    return authorize([ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.HR])(req, res, next);
};

/**
 * Middleware to check if the user is a super admin
 * @returns {Function} Express middleware function
 */
const isSuperAdmin = (req, res, next) => {
    return authorize([ROLES.SUPER_ADMIN])(req, res, next);
};

module.exports = {
    // Main authentication middleware
    authenticate,
    
    // Role-based authorization middleware
    authorize,
    
    // Role-specific middleware
    isAdmin,
    isSuperAdmin,
    
    // For backward compatibility (legacy support)
    default: authenticate
};
