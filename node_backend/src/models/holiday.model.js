const db = require('../config/db');

class Holiday {
    static async create({ name, date, type = 'public', created_by }) {
        const result = await db.query(
            'INSERT INTO holidays (name, date, type, created_by) VALUES (?, ?, ?, ?) RETURNING *',
            [name, date, type, created_by]
        );
        return result[0];
    }

    static async findById(id) {
        const rows = await db.query('SELECT * FROM holidays WHERE id = ?', [id]);
        return rows[0];
    }

    static async findAll() {
        try {
            const rows = await db.query('SELECT * FROM holidays ORDER BY date');
            console.log('Fetched holidays count:', rows.length);
            return rows;
        } catch (error) {
            console.error('Error in Holiday.findAll:', error);
            throw error;
        }
    }

    static async findUpcoming() {
        const rows = await db.query(
            'SELECT * FROM holidays WHERE date >= date() ORDER BY date'
        );
        return rows;
    }

    static async findPast() {
        const rows = await db.query(
            'SELECT * FROM holidays WHERE date < date() ORDER BY date DESC'
        );
        return rows;
    }

    static async update(id, { name, date, type }) {
        const result = await db.query(
            'UPDATE holidays SET name = ?, date = ?, type = ? WHERE id = ? RETURNING *',
            [name, date, type, id]
        );
        return result[0];
    }

    static async delete(id) {
        const result = await db.query('DELETE FROM holidays WHERE id = ?', [id]);
        return result.affectedRows > 0;
    }
}

module.exports = Holiday;
