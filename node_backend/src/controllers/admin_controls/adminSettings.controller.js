const { validationResult } = require('express-validator');
const { query } = require('../../config/db');
const AdminSetting = require('../../models/adminSetting.model');
const { NotFoundError, BadRequestError } = require('../../utils/errors');

// Get admin settings
const getAdminSettings = async (req, res, next) => {
  try {
    console.log('getAdminSettings - User:', req.user);
    
    // First try to get any existing settings
    const sql = 'SELECT * FROM admin_settings LIMIT 1';
    console.log('Executing SQL:', sql);
    
    const rows = await query(sql);
    console.log('Query result:', rows);
    
    let settings = rows[0];
    
    // If no settings exist, create default settings
    if (!settings) {
      console.log('No settings found, creating default settings');
      try {
        // Use current user ID if available, otherwise use system default (1)
        const userId = req.user?.id || 1;
        settings = await AdminSetting.create({
          user_id: userId,
          company_name: 'My Company',
          timezone: 'UTC+00:00',
          photo_check_in: false,
          location_check_in: false
        });
        console.log('Created default settings:', settings);
      } catch (createError) {
        console.error('Error creating default settings:', createError);
        // Even if we can't create default settings, continue with empty settings
        settings = {
          company_name: 'My Company',
          timezone: 'UTC+00:00',
          photo_check_in: false,
          location_check_in: false
        };
      }
    }

    console.log('Returning settings:', settings);
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error in getAdminSettings:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      sql: error.sql,
      sqlMessage: error.sqlMessage
    });
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
