const { run, query, connectDB } = require('../src/config/db');
const logger = require('../src/utils/logger');

async function addCompletedByToSubtasks() {
  try {
    logger.info('🔄 Starting migration: Add completedBy and completedAt to SubTasks table...');
    await connectDB();

    // Add completedBy column if it doesn't exist
    const completedByColumnCheck = await query("PRAGMA table_info(SubTasks);");
    const hasCompletedByColumn = completedByColumnCheck.some(col => col.name === 'completedBy');

    if (!hasCompletedByColumn) {
      await run(`ALTER TABLE SubTasks ADD COLUMN completedBy INTEGER;`);
      logger.info('✅ Added \'completedBy\' column to SubTasks table.');
    } else {
      logger.info('✅ \'completedBy\' column already exists. Skipping addition.');
    }

    // Add completedAt column if it doesn't exist
    const completedAtColumnCheck = await query("PRAGMA table_info(SubTasks);");
    const hasCompletedAtColumn = completedAtColumnCheck.some(col => col.name === 'completedAt');

    if (!hasCompletedAtColumn) {
      await run(`ALTER TABLE SubTasks ADD COLUMN completedAt DATETIME;`);
      logger.info('✅ Added \'completedAt\' column to SubTasks table.');
    } else {
      logger.info('✅ \'completedAt\' column already exists. Skipping addition.');
    }

    logger.info('✨ Migration for completedBy and completedAt completed successfully.');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Error running migration for completedBy and completedAt:', error);
    process.exit(1);
  }
}

addCompletedByToSubtasks();