const { getDB } = require('../config/db');

// Debug function for attendance model
const debugModel = (method, message, data = {}) => {
    console.log('\n=== ATTENDANCE MODEL DEBUG ===');
    console.log(`[${new Date().toISOString()}] ${method}`);
    console.log('Message:', message);
    if (Object.keys(data).length > 0) {
        console.log('Data:', JSON.stringify(data, null, 2));
    }
    console.log('==============================\n');
};

class Attendance {
    /**
     * Create a new attendance record
     * @param {Object} attendanceData - The attendance data
     * @param {string} attendanceData.userId - The ID of the user
     * @param {string} attendanceData.type - The type of attendance (checkin/checkout)
     * @param {string} [attendanceData.notes] - Optional notes
     * @param {Object} [attendanceData.location] - Optional location data
     * @param {number} attendanceData.location.latitude - Latitude of the check-in/out location
     * @param {number} attendanceData.location.longitude - Longitude of the check-in/out location
     * @param {string} [attendanceData.location.address] - Human-readable address
     * @param {string} [attendanceData.photo] - Base64 encoded photo (if any)
     * @returns {Promise<Object>} The created attendance record
     */
    static async create(attendanceData) {
        const db = getDB();
        const {
            userId,
            type,
            notes = null,
            location = null,
            photo = null
        } = attendanceData;

        return new Promise((resolve, reject) => {
            db.run(
                `INSERT INTO attendance (
                    user_id, 
                    type, 
                    timestamp, 
                    notes, 
                    latitude, 
                    longitude, 
                    address,
                    photo
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    userId,
                    type,
                    new Date().toISOString(),
                    notes,
                    location?.latitude || null,
                    location?.longitude || null,
                    location?.address || null,
                    photo
                ],
                function(err) {
                    if (err) {
                        console.error('Error creating attendance record:', err);
                        return reject(err);
                    }
                    resolve({
                        id: this.lastID,
                        userId,
                        type,
                        timestamp: new Date().toISOString(),
                        notes,
                        location: location ? {
                            latitude: location.latitude,
                            longitude: location.longitude,
                            address: location.address
                        } : null,
                        photo
                    });
                }
            );
        });
    }

    /**
     * Get attendance records for a user
     * @param {string} userId - The ID of the user
     * @param {Object} [options] - Query options
     * @param {string} [options.startDate] - Start date for filtering (ISO string)
     * @param {string} [options.endDate] - End date for filtering (ISO string)
     * @param {number} [options.limit=30] - Maximum number of records to return
     * @param {number} [options.offset=0] - Number of records to skip
     * @returns {Promise<Array>} Array of attendance records
     */
    static async findByUserId(userId, options = {}) {
        const {
            startDate,
            endDate,
            limit = 30,
            offset = 0
        } = options;

        const db = getDB();
        let query = 'SELECT * FROM attendance WHERE user_id = ?';
        const params = [userId];

        if (startDate) {
            query += ' AND timestamp >= ?';
            params.push(startDate);
        }
        if (endDate) {
            query += ' AND timestamp <= ?';
            params.push(endDate);
        }

        query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        return new Promise((resolve, reject) => {
            db.all(query, params, (err, rows) => {
                if (err) {
                    console.error('Error fetching attendance records:', err);
                    return reject(err);
                }
                resolve(rows.map(row => ({
                    id: row.id,
                    userId: row.user_id,
                    type: row.type,
                    timestamp: row.timestamp,
                    notes: row.notes,
                    location: row.latitude && row.longitude ? {
                        latitude: row.latitude,
                        longitude: row.longitude,
                        address: row.address
                    } : null,
                    photo: row.photo
                })));
            });
        });
    }

    /**
     * Get today's attendance record for a user
     * @param {string} userId - The ID of the user
     * @returns {Promise<Object>} Today's attendance record if exists, null otherwise
     */
    static async getTodaysRecord(userId) {
        const db = getDB();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Format dates in SQLite's date format (YYYY-MM-DD)
        const todayStr = today.toISOString().split('T')[0];
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        return new Promise((resolve, reject) => {
            db.get(
                `SELECT * FROM attendance 
                WHERE user_id = ? 
                AND date(timestamp) >= date(?)
                AND date(timestamp) < date(?)
                ORDER BY timestamp DESC
                LIMIT 1`,
                [userId, todayStr, tomorrowStr],
                (err, row) => {
                    if (err) {
                        console.error('Error fetching today\'s attendance:', err);
                        return reject(err);
                    }
                    if (!row) return resolve(null);
                    
                    resolve({
                        id: row.id,
                        userId: row.user_id,
                        type: row.type,
                        timestamp: row.timestamp,
                        notes: row.notes,
                        location: row.latitude && row.longitude ? {
                            latitude: row.latitude,
                            longitude: row.longitude,
                            address: row.address
                        } : null,
                        photo: row.photo
                    });
                }
            );
        });
    }

    /**
     * Calculate worked hours for a user in a date range
     * @param {string} userId - The ID of the user
     * @param {string} [startDate] - Start date (ISO string)
     * @param {string} [endDate] - End date (ISO string)
     * @returns {Promise<Object>} Object containing total hours and detailed records
     */
    /**
     * Check if user has checked in today
     * @param {string} userId - The ID of the user
     * @returns {Promise<boolean>} True if user has checked in today, false otherwise
     */
    static async hasCheckedInToday(userId) {
        const db = getDB();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Format dates in SQLite's date format (YYYY-MM-DD)
        const todayStr = today.toISOString().split('T')[0];
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        return new Promise((resolve, reject) => {
            db.get(
                `SELECT 1 FROM attendance 
                WHERE user_id = ? 
                AND type = 'checkin'
                AND date(timestamp) >= date(?)
                AND date(timestamp) < date(?)
                LIMIT 1`,
                [userId, todayStr, tomorrowStr],
                (err, row) => {
                    if (err) {
                        console.error('Error checking today\'s check-in:', err);
                        return reject(err);
                    }
                    resolve(!!row);
                }
            );
        });
    }

    /**
     * Get user's attendance status (present/absent) for today
     * @param {string} userId - The ID of the user
     * @returns {Promise<{status: string, lastCheckIn: string|null}>} Attendance status and last check-in time
     */
    static async getTodaysAttendanceStatus(userId) {
        try {
            const hasCheckedIn = await this.hasCheckedInToday(userId);
            const todaysRecord = await this.getTodaysRecord(userId);
            
            return {
                status: hasCheckedIn ? 'present' : 'absent',
                lastCheckIn: todaysRecord?.timestamp || null
            };
        } catch (error) {
            console.error('Error getting today\'s attendance status:', error);
            throw error;
        }
    }

    static async calculateWorkedHours(userId, startDate, endDate) {
        const db = getDB();
        let query = `
            WITH paired_records AS (
                SELECT 
                    date(timestamp) as date,
                    type,
                    timestamp,
                    LEAD(timestamp) OVER (PARTITION BY date(timestamp) ORDER BY timestamp) as next_timestamp,
                    LEAD(type) OVER (PARTITION BY date(timestamp) ORDER BY timestamp) as next_type
                FROM attendance 
                WHERE user_id = ? 
                ${startDate ? 'AND date(timestamp) >= date(?)' : ''}
                ${endDate ? 'AND date(timestamp) <= date(?)' : ''}
            )
            SELECT 
                date,
                type,
                next_type,
                timestamp,
                next_timestamp,
                (julianday(next_timestamp) - julianday(timestamp)) * 24 as hours_worked
            FROM paired_records
            WHERE type = 'checkin' AND next_type = 'checkout'
            ORDER BY date DESC`;

        const params = [userId];
        if (startDate) params.push(startDate);
        if (endDate) params.push(endDate);

        return new Promise((resolve, reject) => {
            db.all(query, params, (err, rows) => {
                if (err) {
                    console.error('Error calculating worked hours:', err);
                    return reject(err);
                }

                const totalHours = rows.reduce((sum, row) => sum + (parseFloat(row.hours_worked) || 0), 0);
                
                resolve({
                    totalHours: parseFloat(totalHours.toFixed(2)),
                    records: rows.map(row => ({
                        date: row.date,
                        checkIn: row.timestamp,
                        checkOut: row.next_timestamp,
                        hoursWorked: parseFloat(parseFloat(row.hours_worked).toFixed(2))
                    }))
                });
            });
        });
    }
}

module.exports = Attendance;
