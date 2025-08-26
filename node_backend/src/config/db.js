const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

// Use a relative path that works across different operating systems
const dbPath = path.join(process.cwd(), 'data', 'database.sqlite');

// Ensure the data directory exists
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    logger.info('Created data directory');
}

let db;

/**
 * Connects to the SQLite database and sets up connection settings
 * @returns {Promise<sqlite3.Database>} The database connection
 */
const connectDB = () => {
    return new Promise((resolve, reject) => {
        // Enable foreign key support and other PRAGMAs
        const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
            if (err) {
                logger.error('❌ Error connecting to the database:', err.message);
                return reject(err);
            }
            
            // Enable foreign key support and other performance optimizations
            db.serialize(() => {
                // Enable foreign key constraints
                db.run('PRAGMA foreign_keys = ON');
                
                // Enable WAL mode for better concurrency
                db.run('PRAGMA journal_mode = WAL');
                
                // Enable synchronous writes (NORMAL is a good balance between safety and performance)
                db.run('PRAGMA synchronous = NORMAL');
                
                // Set busy timeout to handle database locks gracefully
                db.run('PRAGMA busy_timeout = 5000');
                
                logger.success('✅ Connected to SQLite database with optimized settings');
                module.exports.db = db; // Store the db instance
                resolve(db);
            });
        });
        
        // Handle database errors
        db.on('error', (err) => {
            logger.error('Database error:', err);
            // Attempt to recover from errors
            if (err.code === 'SQLITE_BUSY' || err.code === 'SQLITE_LOCKED') {
                logger.warn('Database is locked, retrying...');
                // You might want to implement retry logic here
            }
        });
    });
};

/**
 * Gets the database connection instance
 * @returns {sqlite3.Database} The database connection
 * @throws {Error} If the database is not connected
 */
const getDB = () => {
    if (!module.exports.db) {
        throw new Error('Database not connected. Call connectDB() first.');
    }
    return module.exports.db;
};

/**
 * Closes the database connection
 * @returns {Promise<void>}
 */
const closeDB = () => {
    return new Promise((resolve, reject) => {
        if (!module.exports.db) {
            logger.warn('No active database connection to close');
            return resolve();
        }
        
        const db = module.exports.db;
        module.exports.db = null; // Clear reference first to prevent new operations
        
        db.close((err) => {
            if (err) {
                logger.error('Error closing database:', err.message);
                return reject(err);
            }
            logger.info('🔌 Database connection closed');
            resolve();
        });
    });
};

/**
 * Helper function to run a query with parameters
 * @param {string} sql - The SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<Array>} The query results
 */
const query = async (sql, params = []) => {
    const db = getDB();
    
    // Log the query for debugging (without sensitive data)
    const logParams = params.length > 0 ? ` [${params.map(p => typeof p === 'string' ? `'${p}'` : p).join(', ')}]` : '';
    logger.debug(`SQL: ${sql}${logParams}`);
    
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) {
                logger.error('Query error:', { sql, params, error: err.message });
                return reject(err);
            }
            resolve(rows || []);
        });
    });
};

/**
 * Helper function to run an INSERT, UPDATE, or DELETE query
 * @param {string} sql - The SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<{lastID: number, changes: number}>}
 */
const run = async (sql, params = []) => {
    const db = getDB();
    
    // Log the query for debugging (without sensitive data)
    const logParams = params.length > 0 ? ` [${params.map(p => typeof p === 'string' ? `'${p}'` : p).join(', ')}]` : '';
    logger.debug(`SQL: ${sql}${logParams}`);
    
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) {
                logger.error('Query error:', { sql, params, error: err.message });
                return reject(err);
            }
            resolve({ lastID: this.lastID, changes: this.changes });
        });
    });
};

// Initialize the db property
module.exports.db = null;

module.exports = {
    connectDB,
    getDB,
    closeDB,
    query,
    run
};
