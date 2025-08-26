const { run } = require('../../src/config/db');
const logger = require('../../src/utils/logger');

/**
 * Creates the user_activity table for tracking user actions
 */
const up = async () => {
  try {
    logger.info('🔄 Creating user_activity table...');
    
    await run(`
      CREATE TABLE IF NOT EXISTS user_activity (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        activity_type TEXT NOT NULL,
        details TEXT,
        ip_address TEXT,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);
    
    // Add index for better query performance
    await run('CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity(user_id)');
    await run('CREATE INDEX IF NOT EXISTS idx_user_activity_created_at ON user_activity(created_at)');
    
    logger.success('✅ Created user_activity table');
  } catch (error) {
    logger.error('❌ Failed to create user_activity table:', error);
    throw error;
  }
};

/**
 * Drops the user_activity table (for rollback)
 */
const down = async () => {
  try {
    logger.info('🔄 Dropping user_activity table...');
    await run('DROP TABLE IF EXISTS user_activity');
    logger.success('✅ Dropped user_activity table');
  } catch (error) {
    logger.error('❌ Failed to drop user_activity table:', error);
    throw error;
  }
};

module.exports = { up, down };

// Run the migration if this script is called directly
if (require.main === module) {
  const { connectDB, closeDB } = require('../../src/config/db');
  
  (async () => {
    try {
      await connectDB();
      await up();
      await closeDB();
      process.exit(0);
    } catch (error) {
      console.error('Migration failed:', error);
      process.exit(1);
    }
  })();
}
