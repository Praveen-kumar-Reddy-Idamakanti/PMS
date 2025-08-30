const { run } = require('../../src/config/db');
const logger = require('../../src/utils/logger');

const createActivityLogsTable = async () => {
  try {
    await run(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        action TEXT NOT NULL,
        description TEXT NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        metadata TEXT,
        status TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    
    // Create indexes for better query performance
    await run('CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id)');
    await run('CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action)');
    await run('CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at)');
    
    logger.info('✅ Created activity_logs table and indexes');
  } catch (error) {
    logger.error('❌ Error creating activity_logs table:', error);
    throw error;
  }
};

// Run the migration if this file is executed directly
if (require.main === module) {
  require('../../src/config/db').connectDB()
    .then(createActivityLogsTable)
    .catch(err => {
      logger.error('Migration failed:', err);
      process.exit(1);
    })
    .finally(() => process.exit(0));
}

module.exports = createActivityLogsTable;
