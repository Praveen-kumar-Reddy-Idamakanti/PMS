const { db, connectDB } = require('../src/config/db');
const path = require('path');
const fs = require('fs');

async function runMigration() {
  try {
    // Connect to the database
    await connectDB();
    console.log('Starting remote attendance migration...');
    
    // Import the migration
    const migration = require('./migrations/20240831_remote_attendance_requests');
    
    // Run the migration
    await migration.up();
    
    console.log('✅ Remote attendance migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    // Close the database connection
    if (db) {
      db.close();
    }
  }
}

// Run the migration
runMigration();
