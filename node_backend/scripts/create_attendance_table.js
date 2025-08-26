const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const dbPath = path.join(process.cwd(), 'data', 'database.sqlite');

console.log('=== Attendance Table Creation Script ===');
console.log(`Database path: ${dbPath}`);

// Check if database file exists
const dbExists = fs.existsSync(dbPath);
console.log(`Database file exists: ${dbExists ? 'Yes' : 'No'}`);

// Connect to the database
console.log('\nConnecting to the database...');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error('❌ Error connecting to the database:', err.message);
        process.exit(1);
    }
    
    console.log('✅ Connected to the SQLite database.');
    
    // Check if users table exists (for foreign key constraint)
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='users'", [], (err, row) => {
        if (err) {
            console.error('❌ Error checking for users table:', err.message);
            db.close();
            process.exit(1);
        }
        
        if (!row) {
            console.error('❌ Error: Users table does not exist. Please create the users table first.');
            db.close();
            process.exit(1);
        }
        
        console.log('✅ Verified users table exists.');
        
        // Check if attendance table already exists
        db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='attendance'", [], (err, row) => {
            if (err) {
                console.error('❌ Error checking for existing attendance table:', err.message);
                db.close();
                process.exit(1);
            }
            
            if (row) {
                console.log('ℹ️  Attendance table already exists. Verifying structure...');
                verifyTableStructure();
            } else {
                console.log('\nCreating attendance table...');
                createAttendanceTable();
            }
        });
    });
});

function createAttendanceTable() {
    const createTableSQL = `
        CREATE TABLE attendance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            type TEXT NOT NULL CHECK (type IN ('checkin', 'checkout')),
            timestamp DATETIME NOT NULL,
            notes TEXT,
            latitude REAL,
            longitude REAL,
            address TEXT,
            photo TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
    `;
    
    db.run(createTableSQL, function(err) {
        if (err) {
            console.error('❌ Error creating attendance table:', err.message);
            db.close();
            process.exit(1);
        }
        
        console.log('✅ Attendance table created successfully.');
        createIndexes();
    });
}

function verifyTableStructure() {
    const expectedColumns = [
        { name: 'id', type: 'INTEGER' },
        { name: 'user_id', type: 'INTEGER' },
        { name: 'type', type: 'TEXT' },
        { name: 'timestamp', type: 'DATETIME' },
        { name: 'created_at', type: 'DATETIME' }
    ];
    
    db.all("PRAGMA table_info(attendance)", [], (err, columns) => {
        if (err) {
            console.error('❌ Error getting table info:', err.message);
            db.close();
            process.exit(1);
        }
        
        console.log('\nTable Structure:');
        console.table(columns.map(col => ({
            'Column Name': col.name,
            'Type': col.type,
            'Not Null': col.notnull ? 'YES' : 'NO',
            'Default Value': col.dflt_value || 'NULL',
            'Primary Key': col.pk ? 'YES' : 'NO'
        })));
        
        // Check for required columns
        const missingColumns = expectedColumns.filter(expCol => 
            !columns.some(col => col.name.toLowerCase() === expCol.name.toLowerCase())
        );
        
        if (missingColumns.length > 0) {
            console.error('❌ Missing required columns:', missingColumns.map(c => c.name).join(', '));
            console.log('\n⚠️  Please drop the existing attendance table and run this script again.');
            db.close();
            process.exit(1);
        }
        
        console.log('✅ Table structure verified.');
        createIndexes();
    });
}

function createIndexes() {
    console.log('\nCreating indexes...');
    
    const indexes = [
        { name: 'idx_attendance_user_id', sql: 'CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON attendance(user_id)' },
        { name: 'idx_attendance_timestamp', sql: 'CREATE INDEX IF NOT EXISTS idx_attendance_timestamp ON attendance(timestamp)' },
        { name: 'idx_attendance_user_date', sql: 'CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON attendance(user_id, date(timestamp))' }
    ];
    
    let completed = 0;
    
    indexes.forEach(index => {
        db.run(index.sql, (err) => {
            if (err) {
                console.error(`❌ Error creating index ${index.name}:`, err.message);
            } else {
                console.log(`✅ Created index: ${index.name}`);
            }
            
            completed++;
            if (completed === indexes.length) {
                db.close((err) => {
                    if (err) {
                        console.error('❌ Error closing the database:', err.message);
                        process.exit(1);
                    }
                    console.log('\n✅ Database connection closed.');
                    console.log('\n=== Attendance table setup completed successfully ===');
                    process.exit(0);
                });
            }
        });
    });
}

// Handle process termination
process.on('SIGINT', () => {
    console.log('\nScript terminated by user');
    db.close();
    process.exit(0);
});
