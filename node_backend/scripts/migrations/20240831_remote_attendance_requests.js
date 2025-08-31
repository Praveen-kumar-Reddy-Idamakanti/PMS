const { db, connectDB } = require('../../src/config/db');

async function up() {
  // Ensure database is connected
  await connectDB();
  // Add mode column to attendance table
  await db.run(`
    ALTER TABLE attendance 
    ADD COLUMN mode TEXT CHECK(mode IN ('office', 'remote')) DEFAULT 'office';
  `);

  // Create remote_attendance_requests table
  await db.run(`
    CREATE TABLE IF NOT EXISTS remote_attendance_requests (
      request_id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      request_date DATE NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
      approved_by INTEGER,
      approved_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
      UNIQUE(user_id, request_date)
    );
  `);

  // Create trigger to update updated_at timestamp
  await db.run(`
    CREATE TRIGGER IF NOT EXISTS update_remote_attendance_requests_timestamp
    AFTER UPDATE ON remote_attendance_requests
    FOR EACH ROW
    BEGIN
      UPDATE remote_attendance_requests 
      SET updated_at = CURRENT_TIMESTAMP 
      WHERE request_id = OLD.request_id;
    END;
  `);
}

async function down() {
  // Remove the trigger first
  await db.run('DROP TRIGGER IF EXISTS update_remote_attendance_requests_timestamp');
  
  // Drop the table
  await db.run('DROP TABLE IF EXISTS remote_attendance_requests');
  
  // Remove the mode column (SQLite doesn't support DROP COLUMN directly)
  // We'll create a new table without the column and copy data
  await db.run('PRAGMA foreign_keys=off');
  await db.run('BEGIN TRANSACTION');
  
  // Create a backup of attendance
  await db.run('ALTER TABLE attendance RENAME TO _attendance_old');
  
  // Recreate attendance without the mode column
  await db.run(`
    CREATE TABLE attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('check_in', 'check_out')),
      timestamp TIMESTAMP NOT NULL,
      notes TEXT,
      latitude REAL,
      longitude REAL,
      address TEXT,
      photo TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  
  // Copy data back without the mode column
  await db.run(`
    INSERT INTO attendance 
    (id, user_id, type, timestamp, notes, latitude, longitude, address, photo, created_at, updated_at)
    SELECT id, user_id, type, timestamp, notes, latitude, longitude, address, photo, created_at, updated_at
    FROM _attendance_old
  `);
  
  // Clean up
  await db.run('DROP TABLE _attendance_old');
  await db.run('COMMIT');
  await db.run('PRAGMA foreign_keys=on');
}

module.exports = { up, down };
