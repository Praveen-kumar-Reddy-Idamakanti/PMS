const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const readline = require('readline');

// Path to the database file
const dbPath = path.join(process.cwd(), 'data', 'database.sqlite');

// Create readline interface
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Connect to the database
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to the database:', err.message);
        process.exit(1);
    }
    console.log('Connected to the SQLite database.');
    
    // List all users
    db.all('SELECT id, email, name, role FROM users', [], (err, users) => {
        if (err) {
            console.error('Error fetching users:', err.message);
            db.close();
            return;
        }
        
        if (users.length === 0) {
            console.log('No users found in the database.');
            db.close();
            return;
        }
        
        console.log('\nList of users:');
        console.log('--------------');
        users.forEach((user, index) => {
            console.log(`${index + 1}. ID: ${user.id}, Email: ${user.email}, Name: ${user.name}, Role: ${user.role || 'user'}`);
        });
        
        rl.question('\nEnter the ID of the user to make admin (or press Enter to exit): ', (answer) => {
            if (!answer.trim()) {
                console.log('No user selected. Exiting...');
                db.close();
                rl.close();
                return;
            }
            
            const userId = parseInt(answer.trim());
            const user = users.find(u => u.id === userId);
            
            if (!user) {
                console.log('Invalid user ID. Please try again.');
                db.close();
                rl.close();
                return;
            }
            
            // Update the user's role to admin
            db.run('UPDATE users SET role = ? WHERE id = ?', ['admin', userId], (err) => {
                if (err) {
                    console.error('Error updating user role:', err.message);
                } else {
                    console.log(`\nSuccessfully updated user ${user.email} (ID: ${user.id}) to admin role.`);
                }
                
                db.close();
                rl.close();
            });
        });
    });
});

// Handle errors
db.on('error', (err) => {
    console.error('Database error:', err.message);
});
