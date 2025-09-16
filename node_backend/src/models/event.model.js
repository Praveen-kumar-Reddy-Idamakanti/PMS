const { query, run } = require('../config/db');

class Event {
    static async create(eventData) {
        const { title, description, date_time, location, created_by, image_url } = eventData;
        const sql = 'INSERT INTO events (title, description, date_time, location, created_by, image_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id';
        const params = [title, description, new Date(date_time).toISOString(), location, created_by, image_url];
        
        try {
            const result = await run(sql, params);
            return { id: result.rows[0].id, ...eventData };
        } catch (err) {
            console.error('Error creating event:', err);
            throw err;
        }
    }

    static async findAll() {
        const sql = 'SELECT * FROM events WHERE date_time >= $1 ORDER BY date_time';
        const params = [new Date().toISOString()];
        
        try {
            const rows = await query(sql, params);
            return rows.map(event => ({
                ...event,
                date_time: new Date(event.date_time).toISOString(),
            }));
        } catch (err) {
            console.error('Error finding all events:', err);
            throw err;
        }
    }

    static async findPast() {
        const sql = 'SELECT * FROM events WHERE date_time < $1 ORDER BY date_time DESC';
        const params = [new Date().toISOString()];

        try {
            const rows = await query(sql, params);
            return rows.map(event => ({
                ...event,
                date_time: new Date(event.date_time).toISOString(),
            }));
        } catch (err) {
            console.error('Error finding past events:', err);
            throw err;
        }
    }

    static async findById(id) {
        const sql = 'SELECT * FROM events WHERE id = $1';
        
        try {
            const rows = await query(sql, [id]);
            const row = rows[0];
            if (row) {
                row.date_time = new Date(row.date_time).toISOString();
            }
            return row;
        } catch (err) {
            console.error(`Error finding event by id ${id}:`, err);
            throw err;
        }
    }

    static async update(id, eventData) {
        const { title, description, date_time, location, image_url } = eventData;
        const sql = 'UPDATE events SET title = $1, description = $2, date_time = $3, location = $4, image_url = $5 WHERE id = $6';
        const params = [title, description, new Date(date_time).toISOString(), location, image_url, id];

        try {
            await run(sql, params);
            return { id, ...eventData };
        } catch (err) {
            console.error(`Error updating event ${id}:`, err);
            throw err;
        }
    }

    static async delete(id) {
        const sql = 'DELETE FROM events WHERE id = $1';

        try {
            await run(sql, [id]);
            return { id };
        } catch (err) {
            console.error(`Error deleting event ${id}:`, err);
            throw err;
        }
    }
}

module.exports = Event;