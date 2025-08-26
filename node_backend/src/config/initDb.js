const { run, query } = require('./db');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Number of salt rounds for password hashing
const SALT_ROUNDS = 10;

/**
 * Initializes the database by creating all required tables and indexes
 * @returns {Promise<void>}
 */
const initDatabase = async () => {
  try {
    logger.info('🔨 Initializing database...');
    
    // Create logs directory if it doesn't exist
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
      logger.info('📁 Created logs directory');
    }
    
    // Create users table if not exists
    await run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        employee_id TEXT UNIQUE,
        role TEXT NOT NULL DEFAULT 'member',
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create attendance table if not exists
    await run(`
      CREATE TABLE IF NOT EXISTS attendance (
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
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create user_activity table if not exists
    await run(`
      CREATE TABLE IF NOT EXISTS user_activity (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        activity_type TEXT NOT NULL,
        details TEXT,
        ip_address TEXT,
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    
    // Create indexes for better query performance
    await run('CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON attendance(user_id)');
    await run('CREATE INDEX IF NOT EXISTS idx_attendance_timestamp ON attendance(timestamp)');
    // Create indexes for users table
    await run('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
    await run('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)');
    await run('CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active)');
    
    // Check if admin user exists, if not create one
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123'; // Default password should be strong
    
    try {
      const [admin] = await query('SELECT * FROM users WHERE email = ?', [adminEmail]);
      
      if (!admin) {
        logger.info('👑 Creating default admin user...');
        
        // Hash the password
        const hashedPassword = await bcrypt.hash(adminPassword, SALT_ROUNDS);
        
        await run(
          'INSERT INTO users (name, email, password, role, is_active) VALUES (?, ?, ?, ?, ?)',
          ['Admin', adminEmail, hashedPassword, 'admin', 1]
        );
        
        logger.success('✅ Default admin user created');
        logger.info(`   Email: ${adminEmail}`);
        logger.info(`   Password: ${adminPassword}`);
        logger.warn('⚠️  Please change the default admin password immediately!');
      } else {
        logger.info('👑 Admin user already exists');
      }
    } catch (error) {
      logger.error('Error creating admin user:', error);
      throw error;
    }
    
    logger.info('✅ Database initialized successfully');
  } catch (error) {
    logger.error('❌ Failed to initialize database:', error);
    throw error;
  }
};

/**
 * Checks if the database is properly set up
 * @returns {Promise<{isValid: boolean, missingTables: string[], error?: string}>} Database status
 */
const checkDatabase = async () => {
  try {
    const requiredTables = ['users', 'attendance'];
    const results = await query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name IN (?, ?)",
      requiredTables
    );
    
    const existingTables = results.map(row => row.name);
    const missingTables = requiredTables.filter(table => !existingTables.includes(table));
    
    return {
      isValid: missingTables.length === 0,
      missingTables,
      existingTables,
      message: missingTables.length > 0 
        ? `Missing tables: ${missingTables.join(', ')}`
        : 'All required tables exist'
    };
  } catch (error) {
    const errorMsg = `Error checking database: ${error.message}`;
    logger.error(errorMsg);
    return {
      isValid: false,
      missingTables: [],
      error: errorMsg
    };
  }
};

/**
 * Drops all tables (for testing/development only)
 * @returns {Promise<void>}
 */
const resetDatabase = async () => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Database reset is not allowed in production');
  }
  
  logger.warn('⚠️  Resetting database...');
  
  try {
    // Disable foreign keys temporarily
    await run('PRAGMA foreign_keys = OFF');
    
    // Get all tables
    const tables = await query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    );
    
    // Drop all tables
    for (const table of tables) {
      logger.debug(`Dropping table: ${table.name}`);
      await run(`DROP TABLE IF EXISTS ${table.name}`);
    }
    
    // Re-enable foreign keys
    await run('PRAGMA foreign_keys = ON');
    
    logger.success('✅ Database reset successfully');
    
    // Re-initialize the database
    await initDatabase();
  } catch (error) {
    // Make sure to re-enable foreign keys even if there's an error
    await run('PRAGMA foreign_keys = ON');
    logger.error('Error resetting database:', error);
    throw error;
  }
};

module.exports = { 
  initDatabase, 
  checkDatabase,
  resetDatabase
};
