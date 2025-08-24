const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database configuration
const dbPath = path.join(__dirname, '..', 'data', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// Run the migration
function addRoleColumn() {
  return new Promise((resolve, reject) => {
    // First, check if the role column already exists
    db.all(
      "PRAGMA table_info(users)",
      [],
      function (err, columns) {
        if (err) return reject(err);
        
        const hasRoleColumn = columns.some(col => col.name === 'role');
        
        if (hasRoleColumn) {
          console.log('Role column already exists in users table');
          return resolve();
        }
        
        // Add the role column with a default value of 'user'
        db.run(
          'ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT "user"',
          function (err) {
            if (err) return reject(err);
            console.log('Successfully added role column to users table');
            
            // Update existing users to have the default 'user' role
            db.run(
              'UPDATE users SET role = ? WHERE role IS NULL',
              ['user'],
              function(err) {
                if (err) return reject(err);
                console.log('Updated existing users with default role');
                resolve();
              }
            );
          }
        );
      }
    );
  });
}

// Run the migration
addRoleColumn()
  .then(() => {
    console.log('Migration completed successfully');
    db.close();
  })
  .catch(err => {
    console.error('Migration failed:', err);
    db.close();
  });
