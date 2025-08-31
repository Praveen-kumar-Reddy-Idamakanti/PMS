const { db, connectDB } = require('../src/config/db');

async function checkSchema() {
  try {
    // Connect to the database
    await connectDB();
    
    // Check if remote_attendance_requests table exists
    const tableCheck = await new Promise((resolve, reject) => {
      db.get(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='remote_attendance_requests'",
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
    
    if (!tableCheck) {
      console.error('❌ remote_attendance_requests table does not exist');
      return;
    }
    
    console.log('✅ remote_attendance_requests table exists');
    
    // Get table structure
    console.log('\nTable structure:');
    const tableStructure = await new Promise((resolve, reject) => {
      db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='remote_attendance_requests'", 
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (tableStructure && tableStructure.sql) {
      console.log(tableStructure.sql);
    } else {
      console.log('Could not retrieve table structure');
    }
    
    // Get sample data
    console.log('\nSample data (first 5 rows):');
    const sampleData = await new Promise((resolve, reject) => {
      db.all("SELECT * FROM remote_attendance_requests LIMIT 5", [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    console.log(sampleData || 'No data found');
    
  } catch (error) {
    console.error('Error checking database schema:', error);
  } finally {
    // Close the database connection
    if (db) {
      db.close(err => {
        if (err) console.error('Error closing database:', err);
      });
    }
    process.exit(0);
  }
}

checkSchema();
