const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request object
 */
module.exports = async (req, res, next) => {
    // Get token from header or Authorization header
    let token = req.header('x-auth-token');
    
    // If no token in x-auth-token, check Authorization header
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
    }

    // Check if no token
    if (!token) {
        return res.status(401).json({ 
            success: false,
            message: 'No authentication token, authorization denied' 
        });
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
        
        // Get user from the token
        const user = await User.findById(decoded.user.id);
        
        if (!user) {
            return res.status(401).json({ 
                success: false,
                message: 'User not found' 
            });
        }

        // Attach user to request object
        req.user = {
            id: user.id,
            name: user.name,
            email: user.email
        };
        
        next();
    } catch (err) {
        console.error('Auth middleware error:', err);
        
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                success: false,
                message: 'Session expired, please log in again' 
            });
        }
        
        if (err.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                success: false,
                message: 'Invalid token, please log in again' 
            });
        }
        
        // For any other errors
        res.status(500).json({ 
            success: false,
            message: 'Server error during authentication' 
        });
    }
};
