const fs = require('fs');
const path = require('path');
const { run, query, connectDB, closeDB } = require('../src/config/db');
const logger = require('../src/utils/logger');

// Create migrations table if it doesn't exist
async function ensureMigrationsTable() {
  await run(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      run_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

// Get all completed migrations
async function getCompletedMigrations() {
  const rows = await query('SELECT name FROM migrations');
  return new Set(rows.map(row => row.name));
}

// Find migration files in the migrations directory
function findMigrations() {
  const migrationsDir = path.join(__dirname, 'migrations');
  return fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.js'))
    .sort()
    .map(file => ({
      name: file,
      path: path.join(migrationsDir, file)
    }));
}

// Run a single migration
async function runMigration(migration) {
  const { name, path: filePath } = migration;
  const migrationModule = require(filePath);
  
  logger.info(`Running migration: ${name}`);
  await migrationModule.up();
  
  // Record the migration
  await run('INSERT INTO migrations (name) VALUES (?)', [name]);
  logger.success(`✅ Completed migration: ${name}`);
}

// Main function to run all pending migrations
async function runMigrations() {
  let db;
  try {
    logger.info('Starting database migrations...');
    
    // Connect to the database
    logger.info('Connecting to database...');
    db = await connectDB();
    
    // Ensure migrations table exists
    await ensureMigrationsTable();
    
    // Get completed migrations
    const completedMigrations = await getCompletedMigrations();
    
    // Find all migration files
    const migrations = findMigrations();
    
    // Run pending migrations
    let count = 0;
    for (const migration of migrations) {
      if (!completedMigrations.has(migration.name)) {
        await runMigration(migration);
        count++;
      }
    }
    
    if (count === 0) {
      logger.info('No new migrations to run');
    } else {
      logger.success(`✅ Successfully ran ${count} migration(s)`);
    }
    
    await closeDB();
    process.exit(0);
  } catch (error) {
    logger.error('Migration failed:', error);
    if (db) {
      await closeDB().catch(e => logger.error('Error closing database:', e));
    }
    process.exit(1);
  }
}

// Run the migrations
runMigrations();
