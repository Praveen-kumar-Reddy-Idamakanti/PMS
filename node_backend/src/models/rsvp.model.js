
const { getDB } = require('../config/db');

class Rsvp {
    static create(rsvpData) {
        const { user_id, event_id, status } = rsvpData;
        const db = getDB();
        return new Promise((resolve, reject) => {
            const stmt = db.prepare('INSERT OR REPLACE INTO rsvps (user_id, event_id, status) VALUES (?, ?, ?)');
            stmt.run(user_id, event_id, status, function (err) {
                if (err) {
                    return reject(err);
                }
                resolve({ id: this.lastID, ...rsvpData });
            });
            stmt.finalize();
        });
    }

    static findByEventId(event_id) {
        const db = getDB();
        return new Promise((resolve, reject) => {
            db.all('SELECT r.status, u.name, u.email FROM rsvps r JOIN users u ON r.user_id = u.id WHERE r.event_id = ?', [event_id], (err, rows) => {
                if (err) {
                    return reject(err);
                }
                resolve(rows);
            });
        });
    }
}

module.exports = Rsvp;
