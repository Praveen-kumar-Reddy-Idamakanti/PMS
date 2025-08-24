const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Path to the database file
const dbPath = path.join(process.cwd(), 'data', 'database.sqlite');

// Check if database file exists
if (!fs.existsSync(dbPath)) {
    console.error('Database file not found at path:', dbPath);
    process.exit(1);
}

// Connect to the database
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to the database:', err.message);
        process.exit(1);
    }
    console.log('Connected to the SQLite database.');
});

// Add role column if it doesn't exist
db.serialize(() => {
    // First check if the role column exists
    db.get("PRAGMA table_info(users)", [], (err, rows) => {
        if (err) {
            console.error('Error checking table info:', err.message);
            process.exit(1);
        }
        
        const hasRoleColumn = rows.some(column => column.name === 'role');
        
        if (!hasRoleColumn) {
            console.log('Adding role column to users table...');
            db.run('ALTER TABLE users ADD COLUMN role TEXT DEFAULT "user"', (err) => {
                if (err) {
                    console.error('Error adding role column:', err.message);
                    process.exit(1);
                }
                console.log('Successfully added role column with default value "user"');
                
                // Close the database connection
                db.close((err) => {
                    if (err) {
                        console.error('Error closing database:', err.message);
                        process.exit(1);
                    }
                    console.log('Database connection closed.');
                    process.exit(0);
                });
            });
        } else {
            console.log('Role column already exists in users table');
            // Close the database connection
            db.close((err) => {
                if (err) {
                    console.error('Error closing database:', err.message);
                    process.exit(1);
                }
                console.log('Database connection closed.');
                process.exit(0);
            });
        }
    });
});
