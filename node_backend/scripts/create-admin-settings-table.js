const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const logger = require('../src/utils/logger');

// Create data directory if it doesn't exist
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// Helper function to run SQL queries with promises
const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

// Helper function to run queries that return data
const query = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
};

async function createAdminSettingsTable() {
  try {
    // Enable foreign key support
    await run('PRAGMA foreign_keys = ON');
    
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
    
    // Close the database connection
    db.close();
  } catch (error) {
    logger.error('Error creating admin_settings table:', error);
    process.exit(1);
  }
}

// Run the migration
createAdminSettingsTable();
