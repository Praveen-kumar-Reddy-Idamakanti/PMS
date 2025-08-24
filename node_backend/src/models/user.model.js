const bcrypt = require('bcryptjs');
const { getDB } = require('../config/db');

class User {
    static async create(userData) {
        const { name, email, password } = userData;
        const db = getDB();

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        return new Promise((resolve, reject) => {
            const stmt = db.prepare('INSERT INTO users (name, email, password) VALUES (?, ?, ?)');
            stmt.run(name, email, hashedPassword, function (err) {
                if (err) {
                    return reject(err);
                }
                resolve({ id: this.lastID, name, email });
            });
            stmt.finalize();
        });
    }

    static findByEmail(email) {
        const db = getDB();
        return new Promise((resolve, reject) => {
            db.get('SELECT id, name, email, password, role FROM users WHERE email = ?', [email], (err, row) => {
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

module.exports = User;
