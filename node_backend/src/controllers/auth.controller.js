const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

// Helper function to send consistent responses
const sendResponse = (res, status, success, message, data = null) => {
    const response = { success, message };
    if (data) response.data = data;
    return res.status(status).json(response);
};

/**
 * Register a new user
 * @route POST /api/auth/register
 * @access Public
 */
const register = async (req, res) => {
    const { name, email, password, role = 'user' } = req.body; // Default to 'user' role if not provided

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
        user = await User.create({ name, email, password, role });
        if (!user) {
            return res.status(500).json({
                success: false,
                message: 'Failed to create user'
            });
        }

        // Create JWT payload
        const payload = { 
            user: { 
                id: user.id,
                name: user.name,
                email: user.email
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
                
                res.status(201).json({
                    success: true,
                    message: 'User registered successfully',
                    token,
                    user: {
                        id: user.id,
                        name: user.name,
                        email: user.email
                    }
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
    const { email, password } = req.body;
    console.log('Login attempt for email:', email);

    try {
        // Find user by email
        const user = await User.findByEmail(email);
        if (!user) {
            console.log('User not found for email:', email);
            return res.status(400).json({
                success: false,
                message: 'Invalid credentials'
            });
        }
        console.log('User found:', { id: user.id, email: user.email });

        // Check password
        console.log('Comparing password...');
        const isMatch = await User.comparePassword(password, user.password);
        console.log('Password match result:', isMatch);
        
        if (!isMatch) {
            console.log('Invalid password for user:', email);
            return res.status(400).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Create JWT payload
        const payload = { 
            user: { 
                id: user.id,
                name: user.name,
                email: user.email
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
                
                // Send token and user data directly in the response
                res.status(200).json({
                    success: true,
                    message: 'Login successful',
                    token,
                    user: {
                        id: user.id,
                        name: user.name,
                        email: user.email,
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
const logout = (req, res) => {
    // Since JWT is stateless, the client should just remove the token
    // Clear the token cookie
    res.clearCookie('token');
    
    // Return success response
    return res.status(200).json({ 
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