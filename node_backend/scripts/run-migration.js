const { connectDB, getDB } = require('../src/config/db');
const logger = require('../src/utils/logger');
const path = require('path');

async function runMigration() {
  const migrationFileName = process.argv[2]; // Get migration file name from command line argument

  if (!migrationFileName) {
    logger.error('Usage: node scripts/run-migration.js <migration-file-name>');
    process.exit(1);
  }

  try {
    logger.info(`🔄 Running migration: ${migrationFileName}`);
    await connectDB(); // Connect to the database

    const db = getDB(); // Get the sqlite3 database instance

    const migrationPath = path.join(__dirname, '../migrations', migrationFileName);
    const migration = require(migrationPath);

    if (typeof migration.up === 'function') {
      await migration.up(db);
      logger.info(`✅ Migration ${migrationFileName} completed successfully.`);
    } else {
      logger.error(`❌ Migration ${migrationFileName} does not have an 'up' function.`);
    }

    process.exit(0);
  } catch (error) {
    logger.error(`❌ Error running migration ${migrationFileName}:`, error);
    process.exit(1);
  }
}

runMigration();