const { Client } = require('pg');
const logger = require('../utils/logger');

// PostgreSQL configuration
const config = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'pms_database',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'superuser', // Change this
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

let client = null;

/**
 * Connects to the PostgreSQL database
 * @returns {Promise<Client>} The database client
 */
const connectDB = async () => {
    try {
        if (client) {
            return client;
        }

        client = new Client(config);
        await client.connect();
        
        logger.info('✅ Connected to PostgreSQL database');
        return client;
    } catch (error) {
        logger.error('❌ Error connecting to PostgreSQL:', error.message);
        throw error;
    }
};

/**
 * Gets the database client instance
 * @returns {Client} The database client
 * @throws {Error} If the database is not connected
 */
const getDB = () => {
    if (!client) {
        throw new Error('Database not connected. Call connectDB() first.');
    }
    return client;
};

/**
 * Closes the database connection
 * @returns {Promise<void>}
 */
const closeDB = async () => {
    try {
        if (client) {
            await client.end();
            client = null;
            logger.info('🔌 PostgreSQL connection closed');
        }
    } catch (error) {
        logger.error('Error closing PostgreSQL connection:', error.message);
        throw error;
    }
};

/**
 * Helper function to run a query with parameters
 * @param {string} sql - The SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<Array>} The query results
 */
const query = async (sql, params = []) => {
    try {
        const startTime = Date.now();
        const result = await client.query(sql, params);
        const duration = Date.now() - startTime;
        
        logger.debug(`SQL Query: ${sql} | Duration: ${duration}ms | Rows: ${result.rows.length}`);
        return result.rows;
    } catch (error) {
        logger.error('❌ Query error:', {
            sql,
            params,
            error: error.message
        });
        throw error;
    }
};

/**
 * Helper function to run an INSERT, UPDATE, or DELETE query
 * @param {string} sql - The SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<{rowCount: number, rows: Array}>}
 */
const run = async (sql, params = []) => {
    try {
        const startTime = Date.now();
        const result = await client.query(sql, params);
        const duration = Date.now() - startTime;
        
        logger.debug(`SQL Run: ${sql} | Duration: ${duration}ms | RowCount: ${result.rowCount}`);
        return {
            rowCount: result.rowCount,
            rows: result.rows,
            lastID: result.rows[0]?.id // For compatibility with SQLite
        };
    } catch (error) {
        logger.error('❌ Query error:', {
            sql,
            params,
            error: error.message
        });
        throw error;
    }
};

module.exports = {
    connectDB,
    getDB,
    closeDB,
    query,
    run,
    config
};
