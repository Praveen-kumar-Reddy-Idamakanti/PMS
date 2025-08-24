const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Use a relative path that works across different operating systems
const dbPath = path.join(process.cwd(), 'data', 'database.sqlite');

// Ensure the data directory exists
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}
let db;

const connectDB = () => {
    return new Promise((resolve, reject) => {
        db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('Error connecting to the database:', err.message);
                return reject(err);
            }
            console.log('Connected to the SQLite database.');

            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'user'
            )`, (err) => {
                if (err) {
                    console.error('Error creating users table:', err.message);
                    return reject(err);
                }
                resolve(db);
            });
        });
    });
};

const getDB = () => {
    if (!db) {
        throw new Error('Database not connected. Call connectDB first.');
    }
    return db;
};

module.exports = { connectDB, getDB };
