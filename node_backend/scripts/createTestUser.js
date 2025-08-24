const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('Created data directory:', dataDir);
}

const dbPath = path.join(dataDir, 'database.sqlite');
console.log('Using database at:', dbPath);

// Open database connection with error handling
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        process.exit(1);
    }
    console.log('Connected to the SQLite database.');
});

// Create users table if it doesn't exist
function initializeDatabase() {
    return new Promise((resolve, reject) => {
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) {
                console.error('Error creating users table:', err);
                return reject(err);
            }
            console.log('Verified/Created users table');
            resolve();
        });
    });
}

async function createTestUser() {
    const email = 'test@example.com';
    const password = 'password123';
    const name = 'Test User';

    try {
        // Initialize database and ensure table exists
        await initializeDatabase();
        // Check if user already exists
        const user = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (user) {
            console.log('User already exists:', user);
            process.exit(0);
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Insert user
        await new Promise((resolve, reject) => {
            db.run(
                'INSERT INTO users (name, email, password, created_at, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
                [name, email, hashedPassword],
                function(err) {
                    if (err) {
                        console.error('Error inserting user:', err);
                        return reject(err);
                    }
                    console.log(`User created with ID: ${this.lastID}`);
                    resolve();
                }
            );
        });

        console.log('✅ Test user created successfully!');
        console.log('Email: test@example.com');
        console.log('Password: Test@123');
    } catch (error) {
        console.error('Error creating test user:', error);
    } finally {
        db.close();
    }
}

createTestUser();
