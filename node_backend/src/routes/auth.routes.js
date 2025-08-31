// auth.routes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);

// Protected routes
router.get('/user', authMiddleware.authenticate, authController.getCurrentUser);
router.get('/me', authMiddleware.authenticate, authController.getCurrentUser); // Alias for /user
router.post('/logout', authMiddleware.authenticate, authController.logout);

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Auth service is running' });
});

module.exports = router;