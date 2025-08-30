const AdminSetting = require('../src/models/adminSetting.model');
const { connectDB, closeDB } = require('../src/config/db');
const logger = require('../src/utils/logger');

// Default admin settings
const DEFAULT_SETTINGS = {
  user_id: 1, // Assuming user with ID 1 is the admin
  company_name: 'Thirdvision labs',
  timezone: 'UTC+00:00',
  location_check_in: true,
  photo_check_in: false
};

async function seedAdminSettings() {
  try {
    logger.info('Starting to seed admin settings...');
    
    // Connect to the database
    await connectDB();
    
    // Check if settings already exist for this user
    const existingSettings = await AdminSetting.getByUserId(DEFAULT_SETTINGS.user_id);
    
    if (existingSettings) {
      logger.info('Admin settings already exist. Updating with default values...');
      // Update existing settings
      const updatedSettings = await AdminSetting.update(existingSettings.id, {
        company_name: DEFAULT_SETTINGS.company_name,
        timezone: DEFAULT_SETTINGS.timezone,
        location_check_in: DEFAULT_SETTINGS.location_check_in,
        photo_check_in: DEFAULT_SETTINGS.photo_check_in
      });
      logger.success('✅ Successfully updated admin settings:', updatedSettings);
    } else {
      // Create new settings
      logger.info('No existing admin settings found. Creating new settings...');
      const newSettings = await AdminSetting.create(DEFAULT_SETTINGS);
      logger.success('✅ Successfully created admin settings:', newSettings);
    }
    
    await closeDB();
    process.exit(0);
  } catch (error) {
    logger.error('Error seeding admin settings:', error);
    await closeDB().catch(e => logger.error('Error closing database:', e));
    process.exit(1);
  }
}

// Run the seed function
seedAdminSettings();
