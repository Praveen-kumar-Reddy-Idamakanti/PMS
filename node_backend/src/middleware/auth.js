const jwt = require('jsonwebtoken');
const { UnauthorizedError } = require('../utils/errors');

/**
 * Authentication middleware to verify JWT token
 */
const auth = (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      throw new UnauthorizedError('No token, authorization denied');
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Add user from payload
    req.user = decoded.user;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      next(new UnauthorizedError('Token is not valid'));
    } else if (err.name === 'TokenExpiredError') {
      next(new UnauthorizedError('Token has expired'));
    } else {
      next(err);
    }
  }
};

/**
 * Role-based authorization middleware
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    console.log('Authorization check - User:', req.user);
    console.log('Required roles:', roles);
    
    if (!req.user) {
      console.error('❌ No user in request');
      return next(new UnauthorizedError('User not authenticated'));
    }

    console.log('User role:', req.user.role);
    
    if (!roles.includes(req.user.role)) {
      console.error(`❌ User role ${req.user.role} not in required roles:`, roles);
      return next(new UnauthorizedError('User not authorized for this action'));
    }

    console.log('✅ User authorized');
    next();
  };
};

module.exports = {
  auth,
  authorize
};
