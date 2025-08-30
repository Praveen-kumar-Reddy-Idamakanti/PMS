const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const adminSettingsController = require('../controllers/adminSettings.controller');
const { auth, authorize } = require('../middleware/auth');

// Get admin settings - accessible to all authenticated users
router.get(
  '/',
  auth,
  adminSettingsController.getAdminSettings
);

// Update admin settings - only for super_admins
router.put(
  '/',
  [
    auth,
    authorize('super_admin'),
    check('company_name', 'Company name is required').notEmpty(),
    check('timezone', 'Timezone is required').notEmpty(),
    check('location_check_in', 'Location check-in setting is required').isBoolean(),
    check('photo_check_in', 'Photo check-in setting is required').isBoolean()
  ],
  adminSettingsController.updateAdminSettings
);

module.exports = router;
