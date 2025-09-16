const { query, run } = require('../config/db');

class Holiday {
    static async create({ name, date, type = 'public', created_by }) {
        const result = await query(
            'INSERT INTO holidays (name, date, type, created_by) VALUES ($1, $2, $3, $4) RETURNING *',
            [name, date, type, created_by]
        );
        return result[0];
    }

    static async findById(id) {
        const rows = await query('SELECT * FROM holidays WHERE id = $1', [id]);
        return rows[0];
    }

    static async findAll() {
        try {
            const rows = await query('SELECT * FROM holidays ORDER BY date');
            return rows;
        } catch (error) {
            console.error('Error in Holiday.findAll:', error);
            throw error;
        }
    }

    static async findUpcoming() {
        const rows = await query(
            'SELECT * FROM holidays WHERE date >= CURRENT_DATE ORDER BY date'
        );
        return rows;
    }

    static async findPast() {
        const rows = await query(
            'SELECT * FROM holidays WHERE date < CURRENT_DATE ORDER BY date DESC'
        );
        return rows;
    }

    static async update(id, { name, date, type }) {
        const result = await query(
            'UPDATE holidays SET name = $1, date = $2, type = $3 WHERE id = $4 RETURNING *',
            [name, date, type, id]
        );
        return result[0];
    }

    static async delete(id) {
        const result = await run('DELETE FROM holidays WHERE id = $1', [id]);
        return result.rowCount > 0;
    }
}

module.exports = Holiday;