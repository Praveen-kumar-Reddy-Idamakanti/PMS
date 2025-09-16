const bcrypt = require('bcryptjs');
const { getDB, query, run } = require('../config/db');
const logger = require('../utils/logger');

class User {
    static async create(userData) {
        const { name, email, password, employeeId, role = 'user' } = userData; // Default role to 'user' if not provided

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        try {
            const result = await run(
                'INSERT INTO users (name, email, password, employee_id, role) VALUES ($1, $2, $3, $4, $5)',
                [name, email, hashedPassword, employeeId, role]
            );
            
            return { 
                id: result.lastID || result.rows?.[0]?.id, 
                name, 
                email, 
                employee_id: employeeId,
                role 
            };
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    }

    static async findByEmail(email) {
        try {
            const rows = await query('SELECT id, name, email, password, role, employee_id FROM users WHERE email = $1', [email]);
            const row = rows[0] || null;
            
            // Ensure role has a default value if not set
            if (row) {
                row.role = row.role || 'user';
            }
            return row;
        } catch (error) {
            throw error;
        }
    }

    static async findByEmployeeId(employeeId) {
        try {
            const rows = await query('SELECT id, name, email, password, role, employee_id FROM users WHERE employee_id = $1', [employeeId]);
            const row = rows[0] || null;
            
            // Ensure role has a default value if not set
            if (row) {
                row.role = row.role || 'user';
            }
            return row;
        } catch (error) {
            throw error;
        }
    }

    static async findById(id) {
        try {
            const rows = await query('SELECT id, name, email, role FROM users WHERE id = $1', [id]);
            const row = rows[0] || null;
            
            // Ensure role has a default value if not set
            if (row) {
                row.role = row.role || 'user';
            }
            return row;
        } catch (error) {
            throw error;
        }
    }

    static async comparePassword(candidatePassword, hash) {
        return bcrypt.compare(candidatePassword, hash);
    }
}

// Export the User class and its static methods
module.exports = {
    ...User,
    /**
     * Create a new user
     * @param {Object} userData - User data including name, email, password, and optional role
     * @returns {Promise<Object>} The created user object
     */
    create: User.create,
    
    /**
     * Find user by email
     * @param {string} email - User's email
     * @returns {Promise<Object|null>} User object if found, null otherwise
     */
    findByEmail: User.findByEmail,
    findByEmployeeId: User.findByEmployeeId,
    
    /**
     * Find user by ID
     * @param {number} id - User ID
     * @returns {Promise<Object|null>} User object if found, null otherwise
     */
    findById: User.findById,
    
    /**
     * Compare password with hashed password
     * @param {string} password - Plain text password
     * @param {string} hashedPassword - Hashed password from database
     * @returns {Promise<boolean>} True if passwords match, false otherwise
     */
    comparePassword: User.comparePassword
};
