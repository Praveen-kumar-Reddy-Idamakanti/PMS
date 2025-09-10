const fs = require('fs');
const path = require('path');
const { sequelize } = require('../src/config/database');
const logger = require('../src/utils/logger');

async function resetDatabase() {
  try {
    logger.info('🔄 Starting database reset...');
    
    // Drop all tables
    await sequelize.drop();
    logger.info('✅ Dropped all tables');
    
    // Recreate database file
    const dbPath = path.join(__dirname, '../data/database.sqlite');
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
      logger.info('✅ Removed existing database file');
    }
    
    // Reconnect to the database
    await sequelize.authenticate();
    
    // Sync all models
    await sequelize.sync({ force: true });
    logger.info('✅ Recreated database schema');
    
    logger.info('✨ Database reset completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Error resetting database:', error);
    process.exit(1);
  }
}

resetDatabase();
