#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { connectDB, closeDB } = require('../src/config/db');
const logger = require('../src/utils/logger');

// Get command line arguments
const command = process.argv[2]; // 'up' or 'down'
const migrationName = process.argv[3]; // Optional: specific migration to run

// Directory containing migration files
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

// Track which migrations have been run
const MIGRATIONS_TABLE = 'migrations';

/**
 * Creates the migrations table if it doesn't exist
 */
async function ensureMigrationsTable() {
  await run(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      run_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

/**
 * Get all migration files from the migrations directory
 */
function getMigrationFiles() {
  return fs.readdirSync(MIGRATIONS_DIR)
    .filter(file => file.endsWith('.js') && file !== 'index.js')
    .sort();
}

/**
 * Get all migrations that have already been run
 */
async function getCompletedMigrations() {
  try {
    await ensureMigrationsTable();
    const rows = await query(`SELECT name FROM ${MIGRATIONS_TABLE} ORDER BY name`);
    return rows.map(row => row.name);
  } catch (error) {
    logger.error('Error getting completed migrations:', error);
    throw error;
  }
}

/**
 * Mark a migration as completed
 */
async function markMigrationComplete(name) {
  await run(`INSERT INTO ${MIGRATIONS_TABLE} (name) VALUES (?)`, [name]);
  logger.success(`✅ Migration completed: ${name}`);
}

/**
 * Mark a migration as rolled back
 */
async function markMigrationRolledBack(name) {
  await run(`DELETE FROM ${MIGRATIONS_TABLE} WHERE name = ?`, [name]);
  logger.info(`↩️  Rolled back migration: ${name}`);
}

/**
 * Run all pending migrations
 */
async function runMigrations() {
  const migrationFiles = getMigrationFiles();
  const completedMigrations = await getCompletedMigrations();
  
  // Filter out completed migrations
  const pendingMigrations = migrationFiles.filter(
    file => !completedMigrations.includes(file.replace('.js', ''))
  );
  
  if (pendingMigrations.length === 0) {
    logger.info('✅ No pending migrations');
    return;
  }
  
  logger.info(`🚀 Found ${pendingMigrations.length} pending migration(s)`);
  
  for (const file of pendingMigrations) {
    try {
      const migration = require(path.join(MIGRATIONS_DIR, file));
      logger.info(`🔄 Running migration: ${file}`);
      
      if (typeof migration.up === 'function') {
        await migration.up();
        await markMigrationComplete(file.replace('.js', ''));
      } else {
        logger.warn(`Skipping ${file}: No 'up' function found`);
      }
    } catch (error) {
      logger.error(`❌ Migration failed: ${file}`, error);
      throw error;
    }
  }
}

/**
 * Rollback the most recent migration
 */
async function rollbackMigration() {
  const migrationFiles = getMigrationFiles();
  const completedMigrations = await getCompletedMigrations();
  
  if (completedMigrations.length === 0) {
    logger.info('No migrations to rollback');
    return;
  }
  
  // Get the last completed migration
  const lastMigration = completedMigrations[completedMigrations.length - 1];
  const migrationFile = `${lastMigration}.js`;
  
  if (!migrationFiles.includes(migrationFile)) {
    logger.warn(`Migration file not found: ${migrationFile}`);
    return;
  }
  
  try {
    const migration = require(path.join(MIGRATIONS_DIR, migrationFile));
    logger.info(`↩️  Rolling back migration: ${migrationFile}`);
    
    if (typeof migration.down === 'function') {
      await migration.down();
      await markMigrationRolledBack(lastMigration);
    } else {
      logger.warn(`Skipping ${migrationFile}: No 'down' function found`);
    }
  } catch (error) {
    logger.error(`❌ Rollback failed: ${migrationFile}`, error);
    throw error;
  }
}

/**
 * Run a specific migration by name
 */
async function runMigrationByName(name, direction = 'up') {
  const migrationFile = `${name}.js`;
  const migrationPath = path.join(MIGRATIONS_DIR, migrationFile);
  
  if (!fs.existsSync(migrationPath)) {
    throw new Error(`Migration not found: ${migrationFile}`);
  }
  
  const migration = require(migrationPath);
  const action = direction === 'up' ? 'Running' : 'Rolling back';
  logger.info(`🔄 ${action} migration: ${migrationFile}`);
  
  const method = direction === 'up' ? 'up' : 'down';
  if (typeof migration[method] === 'function') {
    await migration[method]();
    
    if (direction === 'up') {
      await markMigrationComplete(name);
    } else {
      await markMigrationRolledBack(name);
    }
  } else {
    logger.warn(`Skipping ${migrationFile}: No '${method}' function found`);
  }
}

// Main function
async function main() {
  try {
    await connectDB();
    
    switch (command) {
      case 'up':
        if (migrationName) {
          await runMigrationByName(migrationName, 'up');
        } else {
          await runMigrations();
        }
        break;
        
      case 'down':
        if (migrationName) {
          await runMigrationByName(migrationName, 'down');
        } else {
          await rollbackMigration();
        }
        break;
        
      case 'list':
        const completed = await getCompletedMigrations();
        const allMigrations = getMigrationFiles().map(f => f.replace('.js', ''));
        
        logger.info('\n=== Migrations ===');
        allMigrations.forEach(migration => {
          const status = completed.includes(migration) ? '✅' : '❌';
          console.log(`${status} ${migration}`);
        });
        break;
        
      default:
        console.log('Usage:');
        console.log('  node scripts/run-migration up           - Run all pending migrations');
        console.log('  node scripts/run-migration up <name>    - Run a specific migration');
        console.log('  node scripts/run-migration down         - Rollback the last migration');
        console.log('  node scripts/run-migration down <name>  - Rollback a specific migration');
        console.log('  node scripts/run-migration list         - List all migrations and their status');
        process.exit(1);
    }
    
    await closeDB();
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  }
}

// Make sure we have a command
if (!command) {
  console.error('Error: No command specified');
  console.log('\nAvailable commands:');
  console.log('  up     - Run pending migrations');
  console.log('  down   - Rollback the last migration');
  console.log('  list   - List all migrations and their status');
  process.exit(1);
}

// Run the migration runner
main();
