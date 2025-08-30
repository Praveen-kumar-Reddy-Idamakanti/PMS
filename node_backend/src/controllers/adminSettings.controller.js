const { validationResult } = require('express-validator');
const AdminSetting = require('../models/adminSetting.model');
const { NotFoundError, BadRequestError } = require('../utils/errors');

// Get or create admin settings for a user
const getAdminSettings = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const settings = await AdminSetting.getOrCreate(userId);

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    next(error);
  }
};

// Update admin settings
const updateAdminSettings = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new BadRequestError('Validation failed', errors.array());
    }

    const userId = req.user.id;
    const { company_name, timezone, location, photo_check_in } = req.body;

    // Get existing settings or create new ones
    let settings = await AdminSetting.getByUserId(userId);
    
    if (!settings) {
      // Create new settings if they don't exist
      settings = await AdminSetting.create({
        user_id: userId,
        company_name,
        timezone,
        location,
        photo_check_in: photo_check_in || false
      });
    } else {
      // Update existing settings
      settings = await AdminSetting.update(settings.id, {
        company_name,
        timezone,
        location,
        photo_check_in
      });
    }
    
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAdminSettings,
  updateAdminSettings
};
