const { run, query, connectDB } = require('../src/config/db');
const logger = require('../src/utils/logger');

async function addCompletionDescriptionToSubtasks() {
  try {
    logger.info('🔄 Starting migration: Add completionDescription to SubTasks table...');
    await connectDB();

    // Add completionDescription column if it doesn't exist
    const columnCheck = await query("PRAGMA table_info(SubTasks);");
    const hasCompletionDescriptionColumn = columnCheck.some(col => col.name === 'completionDescription');

    if (!hasCompletionDescriptionColumn) {
      await run(`ALTER TABLE SubTasks ADD COLUMN completionDescription TEXT;`);
      logger.info('✅ Added completionDescription column to SubTasks table.');
    } else {
      logger.info('✅ completionDescription column already exists. Skipping addition.');
    }
    logger.info('✨ Migration for completionDescription completed successfully.');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Error running migration for completionDescription:', error);
    process.exit(1);
  }
}

addCompletionDescriptionToSubtasks();