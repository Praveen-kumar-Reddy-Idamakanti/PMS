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
        console.log('Connecting to database...');
        // Close existing connection if any
        if (dbInstance) {
            console.log('Closing existing database connection...');
            dbInstance.close();
        }
        
        // Create new connection
        console.log(`Creating new database connection to: ${dbPath}`);
        dbInstance = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
            if (err) {
                logger.error('❌ Error connecting to the database:', err.message);
                return reject(err);
            }
            
            // Enable foreign key support and other performance optimizations
            dbInstance.serialize(() => {
                // Enable foreign key constraints
                dbInstance.run('PRAGMA foreign_keys = ON');
                
                // Set journal mode to WAL for better concurrency
                dbInstance.run('PRAGMA journal_mode = WAL');
                
                // Set synchronous to NORMAL for better performance
                dbInstance.run('PRAGMA synchronous = NORMAL');
                
                // Set cache size (in pages, 1 page = 4KB)
                dbInstance.run('PRAGMA cache_size = -2000'); // 8MB cache
                
                // Set busy timeout to 5 seconds
                dbInstance.run('PRAGMA busy_timeout = 5000');
                
                // Set the global db reference
                db = dbInstance;
                
                logger.info('✅ Connected to SQLite database with optimized settings');
                resolve(dbInstance);
            });
        });
        
        // Handle database errors
        dbInstance.on('error', (err) => {
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
    console.log('Getting database instance...');
    if (!dbInstance) {
        console.error('Database not connected. Call connectDB() first.');
        throw new Error('Database not connected. Call connectDB() first.');
    }
    console.log('Database instance retrieved successfully');
    return dbInstance;
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

// Initialize the db instance
let dbInstance = null;

// Export the functions
module.exports = {
    connectDB,
    getDB,
    closeDB,
    query,
    run
};
