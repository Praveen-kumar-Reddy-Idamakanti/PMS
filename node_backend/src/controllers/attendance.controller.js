const Attendance = require('../models/attendance.model');
const { validationResult } = require('express-validator');
const { logActivity } = require('../utils/activityLogger');

/**
 * Debug function for attendance controller
 * @param {Object} req - Express request object
 * @param {string} message - Debug message
 * @param {Object} data - Additional debug data
 */
// const debugAttendance = (req, message, data = {}) => {
//     console.log('\n=== ATTENDANCE CONTROLLER DEBUG ===');
//     console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
//     console.log('User ID:', req.user?.id);
//     console.log('Message:', message);
//     if (Object.keys(data).length > 0) {
//         console.log('Data:', JSON.stringify(data, null, 2));
//     }
//     if (req.body) {
//         console.log('Request Body:', JSON.stringify({
//             ...req.body,
//             photo: req.body.photo ? '***PHOTO_DATA***' : undefined
//         }, null, 2));
//     }
//     console.log('==================================\n');
// };

/**
 * Handle check-in for a user
 * @route POST /api/attendance/checkin
 * @access Private
 */
const checkIn = async (req, res) => {
    try {
        // Validate request
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false, 
                errors: errors.array() 
            });
        }

        const { notes, location, photo } = req.body;
        const userId = req.user.id;

        // Check if user already checked in today (considering timezone)
        const timezoneOffset = req.body.timezoneOffset || 0; // Get timezone offset in hours
        const todayRecord = await Attendance.getTodaysRecord(userId, timezoneOffset);
        if (todayRecord && todayRecord.type === 'checkin') {
            return res.status(400).json({
                success: false,
                message: 'You have already checked in today'
            });
        }

        // Create check-in record
        const checkInRecord = await Attendance.create({
            userId,
            type: 'checkin',
            notes,
            location,
            photo
        });

        // Log check-in activity
        await logActivity(userId, 'USER_CHECKIN', {
            action: 'checked_in',
            location: location || 'Not specified',
            recordId: checkInRecord.id
        }, req);

        res.status(201).json({
            success: true,
            message: 'Checked in successfully',
            data: checkInRecord
        });

    } catch (error) {
        console.error('Check-in error:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing check-in',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Handle check-out for a user
 * @route POST /api/attendance/checkout
 * @access Private
 */
const checkOut = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }
        const { notes, location, photo, isRemote = false } = req.body;
        const userId = req.user.id;
        const db = require('../config/db').getDB();
        
        // Get the latest check-in to determine the mode
        const latestCheckIn = await new Promise((resolve) => {
            db.get(
                `SELECT mode FROM attendance 
                WHERE user_id = ? 
                AND type = 'checkin'
                ORDER BY timestamp DESC
                LIMIT 1`,
                [userId],
                (err, row) => {
                    if (err) {
                        console.error('Error getting latest check-in:', err);
                        return resolve(null);
                    }
                    resolve(row);
                }
            );
        });

        const isRemoteMode = latestCheckIn?.mode === 'remote';

        // Validate location based on mode
        if (!isRemoteMode && !location) {
            return res.status(400).json({ 
                success: false, 
                message: 'Location is required for office checkouts' 
            });
        }

        // First check if user has already checked out today (considering timezone)
        const timezoneOffset = req.body.timezoneOffset || 0; // Get timezone offset in hours
        
        // Calculate today's date in the user's timezone
        const now = new Date();
        const userNow = new Date(now.getTime() + (timezoneOffset * 60 * 60 * 1000));
        const userToday = userNow.toISOString().split('T')[0];
        
        const hasCheckedOut = await new Promise((resolve) => {
            db.get(
                `SELECT 1 FROM attendance 
                WHERE user_id = ? 
                AND type = 'checkout'
                AND date(datetime(timestamp, 'localtime')) = date(?)
                LIMIT 1`,
                [userId, userToday],
                (err, row) => {
                    if (err) {
                        console.error('Error checking existing checkout:', err);
                        return resolve(false);
                    }
                    resolve(!!row);
                }
            );
        });

        if (hasCheckedOut) {
            return res.status(400).json({ 
                success: false, 
                message: 'You have already checked out today' 
            });
        }

        // Then verify they have checked in today (considering timezone)
        const hasCheckedIn = await Attendance.hasCheckedInToday(userId, timezoneOffset);
        if (!hasCheckedIn) {
            return res.status(400).json({ 
                success: false, 
                message: 'You need to check in before checking out' 
            });
        }

        // Create the checkout record
        const checkOut = await Attendance.create({ 
            userId, 
            type: 'checkout', 
            notes, 
            location: isRemoteMode ? 'Remote' : location, 
            photo: isRemoteMode ? null : photo,
            mode: isRemoteMode ? 'remote' : 'office'
        });

        // Log check-out activity
        await logActivity(userId, 'USER_CHECKOUT', {
            action: isRemoteMode ? 'remote_checked_out' : 'checked_out',
            location: isRemoteMode ? 'Remote' : (location || 'Not specified'),
            recordId: checkOut.id
        }, req);
        
        // Calculate hours worked for today (in user's timezone)
        const { totalHours } = await Attendance.calculateWorkedHours(userId, userToday);

        res.status(201).json({ 
            success: true, 
            message: 'Checked out successfully', 
            data: { 
                ...checkOut, 
                hoursWorkedToday: totalHours 
            } 
        });
    } catch (error) {
        console.error('Check-out error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error processing check-out', 
            error: process.env.NODE_ENV === 'development' ? error.message : undefined 
        });
    }
};

/**
 * Get attendance records for a user
 * @route GET /api/attendance/records
 * @access Private
 */
const getAttendanceRecords = async (req, res) => {
    try {
        const { startDate, endDate, limit = 30, offset = 0 } = req.query;
        const userId = req.user.id;

        // If user is admin/manager, they can view other users' records
        const targetUserId = req.user.role === 'employee' ? userId : (req.query.userId || userId);

        const records = await Attendance.findByUserId(targetUserId, {
            startDate,
            endDate,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        // Calculate total hours for the period if dates are provided
        let summary = null;
        if (startDate || endDate) {
            const { totalHours, records: detailedRecords } = await Attendance.calculateWorkedHours(
                targetUserId,
                startDate,
                endDate
            );
            summary = {
                totalHours,
                daysWorked: detailedRecords.length
            };
        }

        res.json({
            success: true,
            data: {
                records,
                summary
            }
        });

    } catch (error) {
        console.error('Error in attendance controller:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};


/**
 * Get today's attendance status for a user with timezone support
 * @route GET /api/attendance/today
 * @access Private
 */
const getTodaysStatus = async (req, res) => {
    try {
        const userId = req.user.id;
        const timezoneOffset = parseInt(req.query.timezoneOffset) || 0; // Get timezone offset in hours
        
        // Calculate today's date in the user's timezone
        const now = new Date();
        const userNow = new Date(now.getTime() + (timezoneOffset * 60 * 60 * 1000));
        const userToday = userNow.toISOString().split('T')[0];
        
        // Get today's check-in and check-out records
        const records = await new Promise((resolve, reject) => {
            const db = require('../config/db').getDB();
            db.all(
                `SELECT * FROM attendance 
                WHERE user_id = ? 
                AND date(datetime(timestamp, 'localtime')) = date(?)
                ORDER BY timestamp`,
                [userId, userToday],
                (err, rows) => {
                    if (err) return reject(err);
                    resolve(rows || []);
                }
            );
        });

        // Process all records in chronological order to determine current status
        let checkInRecord = null;
        let checkOutRecord = null;
        let currentStatus = 'not_checked_in';
        
        // Process records in chronological order
        for (const record of records) {
            if (record.type === 'checkin') {
                checkInRecord = record;
                checkOutRecord = null; // Reset check-out if user checks in again
                currentStatus = 'checked_in';
            } else if (record.type === 'checkout') {
                checkOutRecord = record;
                currentStatus = 'checked_out';
            }
        }

        // Calculate hours worked if applicable
        let hoursWorked = 0;
        if (checkInRecord) {
            const checkInTime = new Date(checkInRecord.timestamp);
            const endTime = checkOutRecord ? new Date(checkOutRecord.timestamp) : new Date();
            hoursWorked = (endTime - checkInTime) / (1000 * 60 * 60); // Convert ms to hours
        }

        // Get the latest record for additional details
        const latestRecord = records[records.length - 1] || null;

        res.json({
            success: true,
            data: {
                status: currentStatus,
                isCheckedIn: currentStatus === 'checked_in',
                needsCheckIn: currentStatus === 'checked_out' || currentStatus === 'not_checked_in',
                checkInTime: checkInRecord?.timestamp || null,
                checkOutTime: checkOutRecord?.timestamp || null,
                hoursWorked: Math.round(hoursWorked * 100) / 100, // Round to 2 decimal places
                lastAction: latestRecord ? {
                    id: latestRecord.id,
                    type: latestRecord.type,
                    timestamp: latestRecord.timestamp,
                    notes: latestRecord.notes,
                    location: latestRecord.latitude && latestRecord.longitude ? {
                        latitude: latestRecord.latitude,
                        longitude: latestRecord.longitude,
                        address: latestRecord.address
                    } : null
                } : null,
                date: userToday // Include the date used for the query
            }
        });

    } catch (error) {
        console.error('Error fetching today\'s status:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching today\'s status',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Get attendance summary for a user
 * @route GET /api/attendance/summary
 * @access Private
 */
const getAttendanceSummary = async (req, res) => {
    try {
        const { startDate, endDate = new Date().toISOString() } = req.query;
        const userId = req.user.id;

        // If user is admin/manager, they can view other users' summaries
        const targetUserId = req.user.role === 'employee' ? userId : (req.query.userId || userId);

        // Calculate total hours for the period
        const { totalHours, records } = await Attendance.calculateWorkedHours(
            targetUserId,
            startDate,
            endDate
        );

        // Get all records for the period
        const allRecords = await Attendance.findByUserId(targetUserId, {
            startDate,
            endDate,
            limit: 1000 // Adjust based on expected volume
        });

        // Calculate days worked and other metrics
        const daysWorked = new Set(records.map(r => r.date)).size;
        const totalCheckIns = allRecords.filter(r => r.type === 'checkin').length;
        const totalCheckOuts = allRecords.filter(r => r.type === 'checkout').length;

        res.json({
            success: true,
            data: {
                period: {
                    startDate: startDate || 'beginning',
                    endDate
                },
                totalHours: parseFloat(totalHours.toFixed(2)),
                daysWorked,
                averageHoursPerDay: parseFloat((totalHours / (daysWorked || 1)).toFixed(2)),
                totalCheckIns,
                totalCheckOuts,
                incompleteSessions: totalCheckIns - totalCheckOuts // Missing checkouts
            }
        });

    } catch (error) {
        console.error('Error fetching attendance summary:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching attendance summary',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Get attendance records for the current user with date range filter
 * @route GET /api/attendance/me
 * @access Private
 */
const getMyAttendance = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const userId = req.user.id;
        
        console.log(`getMyAttendance called for user ${userId}, startDate: ${startDate}, endDate: ${endDate}`);

        // Validate date range (if provided)
        if ((startDate && !Date.parse(startDate)) || (endDate && !Date.parse(endDate))) {
            return res.status(400).json({
                success: false,
                message: 'Invalid date format. Please use YYYY-MM-DD.'
            });
        }

        // Fetch attendance records using the correct model method
        const records = await Attendance.findByUserId(userId, {
            startDate,
            endDate,
            limit: 1000, // Set a higher limit to get all records
            offset: 0
        });

        // Group records by date and calculate hours
        const dailyRecords = {};
        
        records.forEach(record => {
            const date = new Date(record.timestamp).toISOString().split('T')[0];
            
            if (!dailyRecords[date]) {
                dailyRecords[date] = {
                    date,
                    checkins: [],
                    checkouts: [],
                    notes: [],
                    locations: []
                };
            }
            
            if (record.type === 'checkin') {
                dailyRecords[date].checkins.push(record.timestamp);
                if (record.notes) dailyRecords[date].notes.push(record.notes);
                if (record.location) dailyRecords[date].locations.push(record.location);
            } else if (record.type === 'checkout') {
                dailyRecords[date].checkouts.push(record.timestamp);
                if (record.notes) dailyRecords[date].notes.push(record.notes);
                if (record.location) dailyRecords[date].locations.push(record.location);
            }
        });

        // Format response with calculated hours
        const formattedRecords = Object.values(dailyRecords).map(dayRecord => {
            // Sort check-ins and check-outs
            const checkins = dayRecord.checkins.sort();
            const checkouts = dayRecord.checkouts.sort();
            
            // Calculate total hours for the day
            let totalHours = 0;
            const minLength = Math.min(checkins.length, checkouts.length);
            
            for (let i = 0; i < minLength; i++) {
                const checkinTime = new Date(checkins[i]);
                const checkoutTime = new Date(checkouts[i]);
                const hours = (checkoutTime - checkinTime) / (1000 * 60 * 60);
                totalHours += hours;
            }
            
            return {
                id: `${userId}_${dayRecord.date}`,
                date: dayRecord.date,
                checkIn: checkins[0] || null,
                checkOut: checkouts[checkouts.length - 1] || null,
                totalHours: Math.round(totalHours * 100) / 100, // Round to 2 decimal places
                status: checkins.length > 0 ? 'present' : 'absent',
                notes: dayRecord.notes.join('; ') || null,
                location: dayRecord.locations[0] || null
            };
        }).sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort by date descending

        console.log(`getMyAttendance returning ${formattedRecords.length} records with total hours:`, 
            formattedRecords.map(r => ({ date: r.date, hours: r.totalHours })));

        res.status(200).json({
            success: true,
            data: formattedRecords
        });

    } catch (error) {
        console.error('Error in getMyAttendance:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching attendance records',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Export all controller functions at the end of the file
module.exports = {
    checkIn,
    checkOut,
    getAttendanceRecords,
    getTodaysStatus,
    getAttendanceSummary,
    getMyAttendance
};
