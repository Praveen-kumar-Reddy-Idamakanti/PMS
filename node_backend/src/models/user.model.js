const bcrypt = require('bcryptjs');
const { getDB } = require('../config/db');
const logger = require('../utils/logger');

class User {
    static async create(userData) {
        const { name, email, password, employeeId, role = 'user' } = userData; // Default role to 'user' if not provided
        const db = getDB();

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        return new Promise((resolve, reject) => {
            const stmt = db.prepare('INSERT INTO users (name, email, password, employee_id, role) VALUES (?, ?, ?, ?, ?)');
            stmt.run(name, email, hashedPassword, employeeId, role, function (err) {
                if (err) {
                    console.error('Error creating user:', err);
                    return reject(err);
                }
                resolve({ 
                    id: this.lastID, 
                    name, 
                    email, 
                    employee_id: employeeId,
                    role 
                });
            });
            stmt.finalize();
        });
    }

    static findByEmail(email) {
        const db = getDB();
        return new Promise((resolve, reject) => {
            db.get('SELECT id, name, email, password, role, employee_id FROM users WHERE email = ?', [email], (err, row) => {
                if (err) {
                    return reject(err);
                }
                // Ensure role has a default value if not set
                if (row) {
                    row.role = row.role || 'user';
                }
                resolve(row);
            });
        });
    }

    static findByEmployeeId(employeeId) {
        const db = getDB();
        return new Promise((resolve, reject) => {
            db.get('SELECT id, name, email, password, role, employee_id FROM users WHERE employee_id = ?', [employeeId], (err, row) => {
                if (err) {
                    return reject(err);
                }
                // Ensure role has a default value if not set
                if (row) {
                    row.role = row.role || 'user';
                }
                resolve(row);
            });
        });
    }

    static findById(id) {
        const db = getDB();
        return new Promise((resolve, reject) => {
            db.get('SELECT id, name, email, role FROM users WHERE id = ?', [id], (err, row) => {
                if (err) {
                    return reject(err);
                }
                // Ensure role has a default value if not set
                if (row) {
                    row.role = row.role || 'user';
                }
                resolve(row);
            });
        });
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
