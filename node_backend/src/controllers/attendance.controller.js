const Attendance = require('../models/attendance.model');
const { validationResult } = require('express-validator');

/**
 * Debug function for attendance controller
 * @param {Object} req - Express request object
 * @param {string} message - Debug message
 * @param {Object} data - Additional debug data
 */
const debugAttendance = (req, message, data = {}) => {
    console.log('\n=== ATTENDANCE CONTROLLER DEBUG ===');
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    console.log('User ID:', req.user?.id);
    console.log('Message:', message);
    if (Object.keys(data).length > 0) {
        console.log('Data:', JSON.stringify(data, null, 2));
    }
    if (req.body) {
        console.log('Request Body:', JSON.stringify({
            ...req.body,
            photo: req.body.photo ? '***PHOTO_DATA***' : undefined
        }, null, 2));
    }
    console.log('==================================\n');
};

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

        // Check if user already checked in today
        const todayRecord = await Attendance.getTodaysRecord(userId);
        if (todayRecord && todayRecord.type === 'checkin') {
            return res.status(400).json({
                success: false,
                message: 'You have already checked in today'
            });
        }

        // Create check-in record
        const checkIn = await Attendance.create({
            userId,
            type: 'checkin',
            notes,
            location,
            photo
        });

        res.status(201).json({
            success: true,
            message: 'Checked in successfully',
            data: checkIn
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

        // Check if user has checked in today
        const todayRecord = await Attendance.getTodaysRecord(userId);
        if (!todayRecord || todayRecord.type === 'checkout') {
            return res.status(400).json({
                success: false,
                message: 'You need to check in first'
            });
        }

        // Create check-out record
        const checkOut = await Attendance.create({
            userId,
            type: 'checkout',
            notes,
            location,
            photo
        });

        // Calculate hours worked today
        const { totalHours } = await Attendance.calculateWorkedHours(
            userId,
            new Date().toISOString().split('T')[0]
        );

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
 * Get today's attendance status for a user
 * @route GET /api/attendance/today
 * @access Private
 */
const getTodaysStatus = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Get today's check-in and check-out records
        const today = new Date().toISOString().split('T')[0];
        const records = await new Promise((resolve, reject) => {
            const db = require('../config/db').getDB();
            db.all(
                `SELECT * FROM attendance 
                WHERE user_id = ? 
                AND date(timestamp) = date(?)
                ORDER BY timestamp`,
                [userId, today],
                (err, rows) => {
                    if (err) return reject(err);
                    resolve(rows || []);
                }
            );
        });

        // Find the latest check-in and check-out
        const checkInRecord = records.find(r => r.type === 'checkin');
        const checkOutRecord = records.find(r => r.type === 'checkout');
        const latestRecord = records[records.length - 1];

        // Calculate hours worked if checked in but not checked out
        let hoursWorked = 0;
        if (checkInRecord && !checkOutRecord) {
            const checkInTime = new Date(checkInRecord.timestamp);
            const now = new Date();
            hoursWorked = (now - checkInTime) / (1000 * 60 * 60); // Convert ms to hours
        } else if (checkInRecord && checkOutRecord) {
            const checkInTime = new Date(checkInRecord.timestamp);
            const checkOutTime = new Date(checkOutRecord.timestamp);
            hoursWorked = (checkOutTime - checkInTime) / (1000 * 60 * 60);
        }

        res.json({
            success: true,
            data: {
                status: latestRecord ? latestRecord.type : 'not_checked_in',
                isCheckedIn: latestRecord?.type === 'checkin',
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
                } : null
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

// Export all controller functions at the end of the file
module.exports = {
    checkIn,
    checkOut,
    getAttendanceRecords,
    getTodaysStatus,
    getAttendanceSummary
};
