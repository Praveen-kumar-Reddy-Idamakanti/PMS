const { run, query, connectDB } = require('../src/config/db'); // Added 'query'
const logger = require('../src/utils/logger');

async function runRawSqliteMigration() {
  try {
    logger.info('🔄 Starting raw SQLite migration for SubTasks table...');
    await connectDB(); // Connect to the database

    // 1. Add 'completed' column if it doesn't exist
    const completedColumnCheck = await query("PRAGMA table_info(SubTasks);"); // Changed 'run' to 'query'
    const hasCompletedColumn = completedColumnCheck.some(col => col.name === 'completed');

    if (!hasCompletedColumn) {
      await run(`ALTER TABLE SubTasks ADD COLUMN completed BOOLEAN DEFAULT FALSE;`);
      logger.info('✅ Added \'completed\' column to SubTasks table.');

      // Migrate data from 'status' to 'completed'
      await run(`UPDATE SubTasks SET completed = TRUE WHERE status = 'completed';`);
      logger.info('✅ Migrated data from \'status\' to \'completed\'.');
    } else {
      logger.info('✅ \'completed\' column already exists. Skipping addition and data migration.');
    }

    // 2. Add 'assignedTo' column if it doesn't exist
    const assignedToColumnCheck = await query("PRAGMA table_info(SubTasks);"); // Changed 'run' to 'query'
    const hasAssignedToColumn = assignedToColumnCheck.some(col => col.name === 'assignedTo');

    if (!hasAssignedToColumn) {
      await run(`ALTER TABLE SubTasks ADD COLUMN assignedTo INTEGER;`);
      logger.info('✅ Added \'assignedTo\' column to SubTasks table.');
    } else {
      logger.info('✅ \'assignedTo\' column already exists. Skipping addition.');
    }

    // 3. Add 'assignedBy' column if it doesn't exist
    const assignedByColumnCheck = await query("PRAGMA table_info(SubTasks);"); // Changed 'run' to 'query'
    const hasAssignedByColumn = assignedByColumnCheck.some(col => col.name === 'assignedBy');

    if (!hasAssignedByColumn) {
      await run(`ALTER TABLE SubTasks ADD COLUMN assignedBy INTEGER;`);
      logger.info('✅ Added \'assignedBy\' column to SubTasks table.');
    } else {
      logger.info('✅ \'assignedBy\' column already exists. Skipping addition.');
    }

    logger.warn('⚠️  The old \'status\' column will remain in the database but will no longer be used by the application. Manual removal might be required if it causes issues.');

    logger.info('✨ Raw SQLite migration for SubTasks table completed successfully.');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Error running raw SQLite migration:', error);
    process.exit(1);
  }
}

runRawSqliteMigration();