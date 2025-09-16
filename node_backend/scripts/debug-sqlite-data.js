const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// SQLite database path
const SQLITE_DB_PATH = path.join(__dirname, '..', 'data', 'database.sqlite');

async function debugSqliteData() {
    const sqliteDb = new sqlite3.Database(SQLITE_DB_PATH);
    
    try {
        console.log('🔌 Connecting to SQLite...');
        console.log('✅ Connected to SQLite');
        
        // Check SubTasks table structure and data
        console.log('\n📋 SubTasks table structure:');
        sqliteDb.all("PRAGMA table_info(SubTasks)", (err, columns) => {
            if (err) {
                console.error('Error getting table info:', err);
                return;
            }
            columns.forEach(col => {
                console.log(`  - ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : 'NULL'}`);
            });
        });
        
        // Get sample data from SubTasks
        console.log('\n📋 SubTasks sample data:');
        sqliteDb.all("SELECT * FROM SubTasks LIMIT 1", (err, rows) => {
            if (err) {
                console.error('Error getting data:', err);
                return;
            }
            if (rows.length > 0) {
                console.log('Sample row columns:', Object.keys(rows[0]));
                console.log('Sample row data:', rows[0]);
            } else {
                console.log('No data found in SubTasks table');
            }
        });
        
        // Check Tasks table structure
        console.log('\n📋 Tasks table structure:');
        sqliteDb.all("PRAGMA table_info(Tasks)", (err, columns) => {
            if (err) {
                console.error('Error getting table info:', err);
                return;
            }
            columns.forEach(col => {
                console.log(`  - ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : 'NULL'}`);
            });
        });
        
        // Check TaskCalendarEvents table structure
        console.log('\n📋 TaskCalendarEvents table structure:');
        sqliteDb.all("PRAGMA table_info(TaskCalendarEvents)", (err, columns) => {
            if (err) {
                console.error('Error getting table info:', err);
                return;
            }
            if (columns.length === 0) {
                console.log('TaskCalendarEvents table does not exist in SQLite');
            } else {
                columns.forEach(col => {
                    console.log(`  - ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : 'NULL'}`);
                });
            }
        });
        
        // Wait a bit for async operations to complete
        setTimeout(() => {
            sqliteDb.close();
            console.log('🔌 SQLite connection closed');
        }, 1000);
        
    } catch (error) {
        console.error('❌ Debug failed:', error.message);
        sqliteDb.close();
    }
}

// Run the debug if this file is executed directly
if (require.main === module) {
    debugSqliteData();
}

module.exports = { debugSqliteData };
