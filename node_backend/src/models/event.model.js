
const { getDB } = require('../config/db');

class Event {
    static create(eventData) {
        const { title, description, date_time, location, created_by, image_url } = eventData;
        const db = getDB();
        return new Promise((resolve, reject) => {
            const stmt = db.prepare('INSERT INTO events (title, description, date_time, location, created_by, image_url) VALUES (?, ?, ?, ?, ?, ?)');
            stmt.run(title, description, new Date(date_time).toISOString(), location, created_by, image_url, function (err) {
                if (err) {
                    return reject(err);
                }
                resolve({ id: this.lastID, ...eventData });
            });
            stmt.finalize();
        });
    }

    static findAll() {
        const db = getDB();
        return new Promise((resolve, reject) => {
            db.all('SELECT * FROM events WHERE date_time >= ? ORDER BY date_time', [new Date().toISOString()], (err, rows) => {
                if (err) {
                    return reject(err);
                }
                const events = rows.map(event => ({
                    ...event,
                    date_time: new Date(event.date_time).toISOString(),
                }));
                resolve(events);
            });
        });
    }

    static findPast() {
        const db = getDB();
        return new Promise((resolve, reject) => {
            db.all('SELECT * FROM events WHERE date_time < ? ORDER BY date_time DESC', [new Date().toISOString()], (err, rows) => {
                if (err) {
                    return reject(err);
                }
                const events = rows.map(event => ({
                    ...event,
                    date_time: new Date(event.date_time).toISOString(),
                }));
                resolve(events);
            });
        });
    }

    static findById(id) {
        const db = getDB();
        return new Promise((resolve, reject) => {
            db.get('SELECT * FROM events WHERE id = ?', [id], (err, row) => {
                if (err) {
                    return reject(err);
                }
                if (row) {
                    row.date_time = new Date(row.date_time).toISOString();
                }
                resolve(row);
            });
        });
    }

    static update(id, eventData) {
        const { title, description, date_time, location, image_url } = eventData;
        const db = getDB();
        return new Promise((resolve, reject) => {
            const stmt = db.prepare('UPDATE events SET title = ?, description = ?, date_time = ?, location = ?, image_url = ? WHERE id = ?');
            stmt.run(title, description, new Date(date_time).toISOString(), location, image_url, id, function (err) {
                if (err) {
                    return reject(err);
                }
                resolve({ id, ...eventData });
            });
            stmt.finalize();
        });
    }

    static delete(id) {
        const db = getDB();
        return new Promise((resolve, reject) => {
            const stmt = db.prepare('DELETE FROM events WHERE id = ?');
            stmt.run(id, function (err) {
                if (err) {
                    return reject(err);
                }
                resolve({ id });
            });
            stmt.finalize();
        });
    }
}

module.exports = Event;
