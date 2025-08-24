// auth.routes.js
const express = require('express');
const router = express.Router();
const { register, login, getCurrentUser, logout } = require('../controllers/auth.controller');
const auth = require('../middleware/auth.middleware');

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes
router.get('/user', auth, getCurrentUser);
router.post('/logout', auth, logout);

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Auth service is running' });
});

module.exports = router;