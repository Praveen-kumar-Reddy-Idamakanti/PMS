const { query, run } = require('../config/db');
const debug = require('debug')('app:models:attendance');
const { formatDateTime } = require('../utils/dateUtils');

// Enhanced debug function for attendance model
function debugModel(method, message, data = {}) {
    if (process.env.NODE_ENV !== 'test') {
        const logData = {
            timestamp: new Date().toISOString(),
            method,
            message,
            ...(Object.keys(data).length > 0 && { data })
        };
        
        debug(JSON.stringify(logData, null, 2));
        
        // Also log to console in development for better visibility
        if (process.env.NODE_ENV === 'development') {
            // console.log(`[${logData.timestamp}] [Attendance.${method}] ${message}`, Object.keys(data).length ? data : '');
        }
    }
}

class Attendance {
    /**
     * Create a new attendance record
     * @param {Object} attendanceData - The attendance data
     * @returns {Promise<Object>} The created attendance record
     */
    static async create(attendanceData) {
        debugModel('create', 'Creating new attendance record', { 
            type: attendanceData.type,
            userId: attendanceData.userId,
            hasLocation: !!attendanceData.location,
            hasPhoto: !!attendanceData.photo,
            mode: attendanceData.mode || 'office'
        });
        
        const { userId, type, notes, location, photo, mode = 'office' } = attendanceData;
        const now = new Date();

        const sql = `INSERT INTO attendance (user_id, type, timestamp, notes, latitude, longitude, address, photo, mode)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`;
        const params = [
            userId,
            type,
            now.toISOString(),
            notes || null,
            location?.latitude || null,
            location?.longitude || null,
            location?.address || null,
            photo || null,
            mode
        ];

        try {
            const result = await run(sql, params);
            const newRecord = {
                id: result.rows[0].id,
                userId,
                type,
                timestamp: now.toISOString(),
                notes: notes || null,
                location: location || null,
                photo: photo || null,
                mode
            };
            debugModel('create', 'Attendance record created', { recordId: newRecord.id });
            return newRecord;
        } catch (err) {
            debugModel('create', 'Database error', { error: err.message });
            throw err;
        }
    }

    /**
     * Get attendance records for a user
     * @returns {Promise<Array>} Array of attendance records
     */
    static async findByUserId(userId, options = {}) {
        const { startDate, endDate, limit = 30, offset = 0 } = options;

        let paramIndex = 1;
        const params = [userId];
        let sql = 'SELECT * FROM attendance WHERE user_id = $1';

        if (startDate) {
            params.push(startDate);
            sql += ` AND timestamp >= $${++paramIndex}`;
        }
        if (endDate) {
            params.push(endDate);
            sql += ` AND timestamp <= $${++paramIndex}`;
        }

        params.push(limit, offset);
        sql += ` ORDER BY timestamp DESC LIMIT $${++paramIndex} OFFSET $${++paramIndex}`;

        try {
            const rows = await query(sql, params);
            return rows.map(row => ({
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
                photo: row.photo,
                mode: row.mode || 'office'
            }));
        } catch (err) {
            console.error('Error fetching attendance records:', err);
            throw err;
        }
    }

    /**
     * Get today's attendance record for a user with timezone support
     * @returns {Promise<Object>} Today's attendance record if exists, null otherwise
     */
    static async getTodaysRecord(userId, timezoneOffset = 0) {
        debugModel('getTodaysRecord', 'Fetching today\'s attendance record', { userId, timezoneOffset });
        
        const userToday = new Date(new Date().getTime() + (timezoneOffset * 3600000)).toISOString().split('T')[0];
        
        const sql = `SELECT * FROM attendance 
                     WHERE user_id = $1
                     AND timestamp::date = $2
                     ORDER BY timestamp DESC
                     LIMIT 1`;

        try {
            const rows = await query(sql, [userId, userToday]);
            debugModel('getTodaysRecord', 'Record found', { record: rows[0] || 'No record found' });
            return rows[0] || null;
        } catch (err) {
            debugModel('getTodaysRecord', 'Database error', { error: err.message, userId });
            return null;
        }
    }

    /**
     * Check if user has checked in today with timezone support
     * @returns {Promise<boolean>} True if user has checked in today
     */
    static async hasCheckedInToday(userId, timezoneOffset = 0) {
        debugModel('hasCheckedInToday', 'Checking if user checked in today', { userId, timezoneOffset });
        
        const userToday = new Date(new Date().getTime() + (timezoneOffset * 3600000)).toISOString().split('T')[0];
        
        const sql = `SELECT type FROM attendance 
                     WHERE user_id = $1
                     AND timestamp::date = $2
                     ORDER BY timestamp DESC
                     LIMIT 1`;

        try {
            const rows = await query(sql, [userId, userToday]);
            const latestRecord = rows[0];

            if (!latestRecord) {
                debugModel('hasCheckedInToday', 'No records found for today', { userId });
                return false;
            }
            
            const isCheckedIn = latestRecord.type === 'checkin';
            debugModel('hasCheckedInToday', 'Check-in status', { isCheckedIn });
            return isCheckedIn;
        } catch (err) {
            debugModel('hasCheckedInToday', 'Database error', { error: err.message, userId });
            return false;
        }
    }

    /**
     * Get user's attendance status (present/absent) for today
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
        const params = [userId];
        let paramIndex = 1;
        let dateFilter = '';

        if (startDate) {
            params.push(startDate);
            dateFilter += ` AND timestamp::date >= $${++paramIndex}`;
        }
        if (endDate) {
            params.push(endDate);
            dateFilter += ` AND timestamp::date <= $${++paramIndex}`;
        }

        const sql = `
            WITH paired_records AS (
                SELECT 
                    timestamp::date as date,
                    type,
                    timestamp,
                    LEAD(timestamp) OVER (PARTITION BY timestamp::date ORDER BY timestamp) as next_timestamp,
                    LEAD(type) OVER (PARTITION BY timestamp::date ORDER BY timestamp) as next_type
                FROM attendance 
                WHERE user_id = $1 ${dateFilter}
            )
            SELECT 
                date,
                type,
                next_type,
                timestamp,
                next_timestamp,
                EXTRACT(EPOCH FROM (next_timestamp - timestamp)) / 3600 as hours_worked
            FROM paired_records
            WHERE type = 'checkin' AND next_type = 'checkout'
            ORDER BY date DESC`;

        try {
            const rows = await query(sql, params);
            const totalHours = rows.reduce((sum, row) => sum + (parseFloat(row.hours_worked) || 0), 0);
            
            return {
                totalHours: parseFloat(totalHours.toFixed(2)),
                records: rows.map(row => ({
                    date: row.date,
                    checkIn: row.timestamp,
                    checkOut: row.next_timestamp,
                    hoursWorked: parseFloat(parseFloat(row.hours_worked).toFixed(2))
                }))
            };
        } catch (err) {
            console.error('Error calculating worked hours:', err);
            throw err;
        }
    }
}

module.exports = Attendance;