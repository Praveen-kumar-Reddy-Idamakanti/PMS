const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const logger = require('../../src/utils/logger');

// Database configuration
const dbPath = path.join(process.cwd(), 'data', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// Helper function to run queries with promises
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

async function up() {
  try {
    // Create admin_settings table
    await run(`
      CREATE TABLE IF NOT EXISTS admin_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        company_name TEXT NOT NULL DEFAULT 'My Company',
        timezone TEXT NOT NULL DEFAULT 'UTC+00:00',
        location_check_in BOOLEAN NOT NULL DEFAULT 0,
        photo_check_in BOOLEAN NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id)
      )
    `);

    // Create index on user_id for faster lookups
    await run('CREATE INDEX IF NOT EXISTS idx_admin_settings_user_id ON admin_settings(user_id)');
    
    logger.success('✅ Created admin_settings table');
  } catch (error) {
    logger.error('Error creating admin_settings table:', error);
    throw error;
  }
}

async function down() {
  // Close the database connection when done
  db.close();
  try {
    await run('DROP TABLE IF EXISTS admin_settings');
    logger.info('Dropped admin_settings table');
  } catch (error) {
    logger.error('Error dropping admin_settings table:', error);
    throw error;
  }
}

module.exports = { up, down };
