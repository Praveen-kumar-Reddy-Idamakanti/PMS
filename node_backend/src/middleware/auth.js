const jwt = require('jsonwebtoken');
const { UnauthorizedError } = require('../utils/errors');

/**
 * Authentication middleware to verify JWT token
 */
const auth = (req, res, next) => {
  try {
    console.log('Auth middleware - Headers:', req.headers);
    
    // Get token from header
    const authHeader = req.header('Authorization');
    console.log('Auth header:', authHeader);
    
    if (!authHeader) {
      console.error('No Authorization header found');
      throw new UnauthorizedError('No token, authorization denied');
    }

    // Check if it's a Bearer token
    if (!authHeader.startsWith('Bearer ')) {
      console.error('Invalid token format - missing Bearer prefix');
      throw new UnauthorizedError('Invalid token format');
    }

    const token = authHeader.replace('Bearer ', '').trim();
    console.log('Extracted token:', token ? '***token-present***' : 'empty-token');
    
    if (!token) {
      console.error('No token found in Authorization header');
      throw new UnauthorizedError('No token, authorization denied');
    }

    try {
      // Verify token
      console.log('Verifying token...');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Token decoded successfully:', { 
        userId: decoded.user?.id,
        role: decoded.user?.role,
        exp: decoded.exp ? new Date(decoded.exp * 1000).toISOString() : null
      });
      
      // Add user from payload
      req.user = decoded.user;
      next();
    } catch (verifyError) {
      console.error('Token verification failed:', {
        name: verifyError.name,
        message: verifyError.message,
        expiredAt: verifyError.expiredAt,
        stack: verifyError.stack
      });
      
      if (verifyError.name === 'JsonWebTokenError') {
        throw new UnauthorizedError('Token is not valid');
      } else if (verifyError.name === 'TokenExpiredError') {
        throw new UnauthorizedError('Token has expired');
      }
      throw verifyError;
    }
  } catch (err) {
    console.error('Auth middleware error:', {
      name: err.name,
      message: err.message,
      stack: err.stack
    });
    next(err);
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
