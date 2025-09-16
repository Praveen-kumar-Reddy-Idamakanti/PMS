const { query, run } = require('../config/db');

class Rsvp {
    static async create(rsvpData) {
        const { user_id, event_id, status } = rsvpData;
        const sql = `
            INSERT INTO rsvps (user_id, event_id, status) 
            VALUES ($1, $2, $3) 
            ON CONFLICT (user_id, event_id) 
            DO UPDATE SET status = $3
            RETURNING id
        `;
        const params = [user_id, event_id, status];

        try {
            const result = await run(sql, params);
            return { id: result.rows[0].id, ...rsvpData };
        } catch (err) {
            console.error('Error creating or updating RSVP:', err);
            throw err;
        }
    }

    static async findByEventId(event_id) {
        const sql = 'SELECT r.status, u.name, u.email FROM rsvps r JOIN users u ON r.user_id = u.id WHERE r.event_id = $1';
        
        try {
            const rows = await query(sql, [event_id]);
            return rows;
        } catch (err) {
            console.error(`Error finding RSVPs by event id ${event_id}:`, err);
            throw err;
        }
    }
}

module.exports = Rsvp;