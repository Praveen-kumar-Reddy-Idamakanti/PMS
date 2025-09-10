const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Protected route to get all users
router.get('/', authMiddleware.authenticate, userController.getAllUsers);

module.exports = router;