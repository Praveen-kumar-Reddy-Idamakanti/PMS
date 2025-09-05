const { getDB } = require('../config/db');
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
            console.log(`[${logData.timestamp}] [Attendance.${method}] ${message}`, 
                Object.keys(data).length ? data : '');
        }
    }
}

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
        debugModel('create', 'Creating new attendance record', { 
            type: attendanceData.type,
            userId: attendanceData.userId,
            hasLocation: !!attendanceData.location,
            hasPhoto: !!attendanceData.photo,
            mode: attendanceData.mode || 'office' // Default to 'office' if not specified
        });
        
        const db = getDB();
        const { userId, type, notes, location, photo, mode = 'office' } = attendanceData;
        const now = new Date();

        return new Promise((resolve, reject) => {
            const params = [
                userId,
                type,
                now.toISOString(), // Store in ISO format in database
                notes || null,
                location?.latitude || null,
                location?.longitude || null,
                location?.address || null,
                photo || null,
                mode
            ];
            
            debugModel('create', 'Executing database insert', { 
                type,
                userId,
                timestamp: now,
                hasNotes: !!notes,
                hasLocation: !!location,
                hasPhoto: !!photo,
                mode
            });
            
            db.run(
                `INSERT INTO attendance (user_id, type, timestamp, notes, latitude, longitude, address, photo, mode)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                params,
                function(err) {
                    if (err) {
                        debugModel('create', 'Database error', { 
                            error: err.message,
                            userId,
                            type 
                        });
                        return reject(err);
                    }
                    
                    const result = {
                        id: this.lastID,
                        userId,
                        type,
                        timestamp: now.toISOString(),
                        notes: notes || null,
                        location: location || null,
                        photo: photo || null,
                        mode
                    };
                    
                    debugModel('create', 'Attendance record created', { 
                        recordId: result.id,
                        type: result.type,
                        userId: result.userId,
                        timestamp: result.timestamp
                    });
                    
                    resolve(result);
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
                    photo: row.photo,
                    mode: row.mode || 'office' // Default to 'office' for backward compatibility
                })));
            });
        });
    }

    /**
     * Get today's attendance record for a user
     * @param {string} userId - The ID of the user
     * @returns {Promise<Object>} Today's attendance record if exists, null otherwise
     */
    /**
     * Get today's attendance record for a user with timezone support
     * @param {string} userId - The ID of the user
     * @param {number} [timezoneOffset=0] - Timezone offset in hours
     * @returns {Promise<Object>} Today's attendance record if exists, null otherwise
     */
    static async getTodaysRecord(userId, timezoneOffset = 0) {
        debugModel('getTodaysRecord', 'Fetching today\'s attendance record', { userId, timezoneOffset });
        
        const db = getDB();
        
        // Calculate today's date in the user's timezone
        const now = new Date();
        const userNow = new Date(now.getTime() + (timezoneOffset * 60 * 60 * 1000));
        const userToday = userNow.toISOString().split('T')[0];
        
        return new Promise((resolve) => {
            db.get(
                `SELECT * FROM attendance 
                WHERE user_id = ? 
                AND date(datetime(timestamp, 'localtime')) = date(?)
                ORDER BY timestamp DESC
                LIMIT 1`,
                [userId, userToday],
                (err, row) => {
                    if (err) {
                        debugModel('getTodaysRecord', 'Database error', { error: err.message, userId });
                        return resolve(null);
                    }
                    debugModel('getTodaysRecord', 'Record found', { record: row || 'No record found' });
                    resolve(row || null);
                }
            );
        });
    }

    /**
     * Check if user has checked in today with timezone support
     * @param {string} userId - The ID of the user
     * @param {number} [timezoneOffset=0] - Timezone offset in hours
     * @returns {Promise<boolean>} True if user has checked in today
     */
    static async hasCheckedInToday(userId, timezoneOffset = 0) {
        debugModel('hasCheckedInToday', 'Checking if user checked in today', { userId, timezoneOffset });
        const db = getDB();
        
        // Calculate today's date in the user's timezone
        const now = new Date();
        const userNow = new Date(now.getTime() + (timezoneOffset * 60 * 60 * 1000));
        const userToday = userNow.toISOString().split('T')[0];
        
        return new Promise((resolve) => {
            db.get(
                `SELECT type FROM attendance 
                WHERE user_id = ? 
                AND date(datetime(timestamp, 'localtime')) = date(?)
                ORDER BY timestamp DESC
                LIMIT 1`,
                [userId, userToday],
                (err, latestRecord) => {
                    if (err) {
                        debugModel('hasCheckedInToday', 'Database error', { error: err.message, userId });
                        return resolve(false);
                    }
                    
                    // If no records for today, user hasn't checked in
                    if (!latestRecord) {
                        debugModel('hasCheckedInToday', 'No records found for today', { userId });
                        return resolve(false);
                    }
                    
                    // If latest record is a check-in, user is checked in
                    const isCheckedIn = latestRecord.type === 'checkin';
                    
                    debugModel('hasCheckedInToday', 'Check-in status', { 
                        userId, 
                        latestRecordType: latestRecord.type,
                        isCheckedIn 
                    });
                    
                    resolve(isCheckedIn);
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
