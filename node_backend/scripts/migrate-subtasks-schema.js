const { run, connectDB } = require('../src/config/db'); // Import connectDB
const logger = require('../src/utils/logger');

async function migrateSubtasksSchema() {
  try {
    logger.info('🔄 Starting SubTasks table schema migration...');
    await connectDB(); // Connect to the database

    // Check if 'completed' column already exists to prevent errors on re-run
    const columnCheck = await run("PRAGMA table_info(SubTasks);");
    const hasCompletedColumn = columnCheck.some(col => col.name === 'completed');

    if (!hasCompletedColumn) {
      // 1. Add the new 'completed' column
      await run(`ALTER TABLE SubTasks ADD COLUMN completed BOOLEAN DEFAULT FALSE;`);
      logger.info('✅ Added \'completed\' column to SubTasks table.');

      // 2. Migrate data from 'status' to 'completed'
      // Assuming 'completed' status in old schema means completed = true
      await run(`UPDATE SubTasks SET completed = TRUE WHERE status = 'completed';`);
      logger.info('✅ Migrated data from \'status\' to \'completed\'.');

      // 3. Remove the old 'status' column
      // SQLite does not support DROP COLUMN directly, so we'll do a workaround
      // This part is tricky and might require manual intervention if data is critical.
      // For simplicity, we'll just remove the status column from the model and initDb.js
      // and rely on the fact that it won't be used.
      // A proper migration for dropping a column in SQLite involves:
      //   - Renaming the table
      //   - Creating a new table without the column
      //   - Copying data
      //   - Dropping the old table
      // Given the constraints, we'll skip the actual DROP COLUMN via script
      // and rely on the model and initDb.js to not expect it.
      logger.warn('⚠️  Manual intervention might be needed to remove the \'status\' column from SubTasks table if it causes issues. SQLite ALTER TABLE DROP COLUMN is limited.');
    } else {
      logger.info('✅ \'completed\' column already exists in SubTasks table. Skipping migration.');
    }

    logger.info('✨ SubTasks table schema migration completed successfully.');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Error migrating SubTasks table schema:', error);
    process.exit(1);
  }
}

migrateSubtasksSchema();