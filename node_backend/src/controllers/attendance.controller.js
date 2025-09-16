const Attendance = require('../models/attendance.model');
const { validationResult } = require('express-validator');
const { logActivity } = require('../utils/activityLogger');
const { query } = require('../config/db');

/**
 * Handle check-in for a user
 * @route POST /api/attendance/checkin
 * @access Private
 */
const checkIn = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { notes, location, photo } = req.body;
        const userId = req.user.id;

        const timezoneOffset = req.body.timezoneOffset || 0;
        const todayRecord = await Attendance.getTodaysRecord(userId, timezoneOffset);
        if (todayRecord && todayRecord.type === 'checkin') {
            return res.status(400).json({
                success: false,
                message: 'You have already checked in today'
            });
        }

        const checkInRecord = await Attendance.create({
            userId,
            type: 'checkin',
            notes,
            location,
            photo
        });

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

        const latestCheckInRows = await query(
            `SELECT mode FROM attendance 
            WHERE user_id = $1 
            AND type = 'checkin'
            ORDER BY timestamp DESC
            LIMIT 1`,
            [userId]
        );
        const latestCheckIn = latestCheckInRows[0];

        const isRemoteMode = latestCheckIn?.mode === 'remote';

        if (!isRemoteMode && !location) {
            return res.status(400).json({
                success: false,
                message: 'Location is required for office checkouts'
            });
        }

        const timezoneOffset = req.body.timezoneOffset || 0;

        const now = new Date();
        const userNow = new Date(now.getTime() + (timezoneOffset * 60 * 60 * 1000));
        const userToday = userNow.toISOString().split('T')[0];

        const hasCheckedOutRows = await query(
            `SELECT 1 FROM attendance 
            WHERE user_id = $1 
            AND type = 'checkout'
            AND timestamp::date = $2
            LIMIT 1`,
            [userId, userToday]
        );
        const hasCheckedOut = hasCheckedOutRows.length > 0;

        if (hasCheckedOut) {
            return res.status(400).json({
                success: false,
                message: 'You have already checked out today'
            });
        }

        const hasCheckedIn = await Attendance.hasCheckedInToday(userId, timezoneOffset);
        if (!hasCheckedIn) {
            return res.status(400).json({
                success: false,
                message: 'You need to check in before checking out'
            });
        }

        const checkOut = await Attendance.create({
            userId,
            type: 'checkout',
            notes,
            location: isRemoteMode ? 'Remote' : location,
            photo: isRemoteMode ? null : photo,
            mode: isRemoteMode ? 'remote' : 'office'
        });

        await logActivity(userId, 'USER_CHECKOUT', {
            action: isRemoteMode ? 'remote_checked_out' : 'checked_out',
            location: isRemoteMode ? 'Remote' : (location || 'Not specified'),
            recordId: checkOut.id
        }, req);

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

        const targetUserId = req.user.role === 'employee' ? userId : (req.query.userId || userId);

        const records = await Attendance.findByUserId(targetUserId, {
            startDate,
            endDate,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

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
        const timezoneOffset = parseInt(req.query.timezoneOffset) || 0;

        const now = new Date();
        const userNow = new Date(now.getTime() + (timezoneOffset * 60 * 60 * 1000));
        const userToday = userNow.toISOString().split('T')[0];

        const records = await query(
            `SELECT * FROM attendance 
            WHERE user_id = $1 
            AND timestamp::date = $2
            ORDER BY timestamp`,
            [userId, userToday]
        );

        let checkInRecord = null;
        let checkOutRecord = null;
        let currentStatus = 'not_checked_in';

        for (const record of records) {
            if (record.type === 'checkin') {
                checkInRecord = record;
                checkOutRecord = null;
                currentStatus = 'checked_in';
            } else if (record.type === 'checkout') {
                checkOutRecord = record;
                currentStatus = 'checked_out';
            }
        }

        let hoursWorked = 0;
        if (checkInRecord) {
            const checkInTime = new Date(checkInRecord.timestamp);
            const endTime = checkOutRecord ? new Date(checkOutRecord.timestamp) : new Date();
            hoursWorked = (endTime - checkInTime) / (1000 * 60 * 60);
        }

        const latestRecord = records[records.length - 1] || null;

        res.json({
            success: true,
            data: {
                status: currentStatus,
                isCheckedIn: currentStatus === 'checked_in',
                needsCheckIn: currentStatus === 'checked_out' || currentStatus === 'not_checked_in',
                checkInTime: checkInRecord?.timestamp || null,
                checkOutTime: checkOutRecord?.timestamp || null,
                hoursWorked: Math.round(hoursWorked * 100) / 100,
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
                date: userToday
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

        const targetUserId = req.user.role === 'employee' ? userId : (req.query.userId || userId);

        const { totalHours, records } = await Attendance.calculateWorkedHours(
            targetUserId,
            startDate,
            endDate
        );

        const allRecords = await Attendance.findByUserId(targetUserId, {
            startDate,
            endDate,
            limit: 1000
        });

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
                incompleteSessions: totalCheckIns - totalCheckOuts
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


        if ((startDate && !Date.parse(startDate)) || (endDate && !Date.parse(endDate))) {
            return res.status(400).json({
                success: false,
                message: 'Invalid date format. Please use YYYY-MM-DD.'
            });
        }

        const records = await Attendance.findByUserId(userId, {
            startDate,
            endDate,
            limit: 1000,
            offset: 0
        });

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

        const formattedRecords = Object.values(dailyRecords).map(dayRecord => {
            const checkins = dayRecord.checkins.sort();
            const checkouts = dayRecord.checkouts.sort();

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
                totalHours: Math.round(totalHours * 100) / 100,
                status: checkins.length > 0 ? 'present' : 'absent',
                notes: dayRecord.notes.join('; ') || null,
                location: dayRecord.locations[0] || null
            };
        }).sort((a, b) => new Date(b.date) - new Date(a.date));

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

module.exports = {
    checkIn,
    checkOut,
    getAttendanceRecords,
    getTodaysStatus,
    getAttendanceSummary,
    getMyAttendance
};