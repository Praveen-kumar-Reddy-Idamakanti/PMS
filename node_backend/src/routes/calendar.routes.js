const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { auth } = require('../middleware/auth');
const moment = require('moment');

// Helper function to get days in month
function getDaysInMonth(year, month) {
    return new Date(year, month, 0).getDate();
}

/**
 * @route GET /calendar/:userId?month=YYYY-MM
 * @description Get monthly calendar data for a user
 * @access Private
 */

router.get('/:userId', auth, async (req, res) => {
    try {
        const { userId } = req.params;
        const { month } = req.query;


        if (!month || !/^\d{4}-\d{2}$/.test(month)) {
            return res.status(400).json({ error: 'Invalid month format. Use YYYY-MM' });
        }

        const [year, monthNum] = month.split('-').map(Number);
        const daysInMonth = getDaysInMonth(year, monthNum);
        const startDate = `${month}-01`;
        const endDate = `${month}-${daysInMonth.toString().padStart(2, '0')}`;

        const calendarData = await query(`
            WITH dates AS (
                SELECT date(?, '+' || (tens.a + ones.a) || ' days') as date
                FROM (
                    SELECT 0 as a UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION
                    SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9
                ) ones
                CROSS JOIN (
                    SELECT 0 as a UNION SELECT 10 UNION SELECT 20 UNION SELECT 30
                ) tens
                WHERE date(?, '+' || (tens.a + ones.a) || ' days') <= date(?)
            )
            SELECT 
                d.date,
                COALESCE(
                    (SELECT 'holiday' FROM holidays h WHERE h.date = d.date LIMIT 1),
                    (SELECT 'leave' FROM leave_requests lr 
                     WHERE lr.user_id = ? 
                     AND d.date BETWEEN date(lr.start_date) AND date(lr.end_date) 
                     AND lr.status = 'approved' 
                     LIMIT 1),
                    (SELECT 'task_due' FROM TaskCalendarEvents tce
                     WHERE tce.userId = ? AND date(tce.dueDate) = d.date LIMIT 1), -- New: Task Due
                    (SELECT 'present' FROM attendance a 
                     WHERE a.user_id = ? 
                     AND date(datetime(a.timestamp, 'localtime')) = d.date 
                     AND a.type = 'checkin' 
                     AND EXISTS (
                         SELECT 1 FROM attendance a2 
                         WHERE a2.user_id = a.user_id 
                         AND date(datetime(a2.timestamp, 'localtime')) = d.date 
                         AND a2.type = 'checkout'
                     )
                     LIMIT 1),
                    CASE 
                        WHEN d.date > date('now', 'localtime') THEN NULL
                        ELSE 'absent'
                    END
                ) as status,
                (SELECT h.name FROM holidays h WHERE h.date = d.date LIMIT 1) as holiday_name,
                (SELECT lr.reason FROM leave_requests lr 
                 WHERE lr.user_id = ? 
                 AND d.date BETWEEN date(lr.start_date) AND date(lr.end_date) 
                 AND lr.status = 'approved' 
                 LIMIT 1) as leave_reason,
                (SELECT tce.title FROM TaskCalendarEvents tce WHERE tce.userId = ? AND date(tce.dueDate) = d.date LIMIT 1) as task_title, -- New: Task Title
                (SELECT tce.description FROM TaskCalendarEvents tce WHERE tce.userId = ? AND date(tce.dueDate) = d.date LIMIT 1) as task_description, -- New: Task Description
                (SELECT MIN(strftime('%H:%M', datetime(a.timestamp, 'localtime'))) 
                 FROM attendance a 
                 WHERE a.user_id = ? 
                 AND date(datetime(a.timestamp, 'localtime')) = d.date 
                 AND a.type = 'checkin') as checkin_time,
                (SELECT MAX(strftime('%H:%M', datetime(a.timestamp, 'localtime'))) 
                 FROM attendance a 
                 WHERE a.user_id = ? 
                 AND date(datetime(a.timestamp, 'localtime')) = d.date 
                 AND a.type = 'checkout') as checkout_time
            FROM dates d
            ORDER BY d.date
        `, [startDate, startDate, endDate, userId, userId, userId, userId, userId, userId, userId, userId]);

        // Debug: log absent days in backend
        const absentDays = calendarData.filter(d => d.status === 'absent');
        if (absentDays.length > 0) {
        }
        res.json(calendarData);
    } catch (error) {
        console.error('Error fetching calendar data:', error);
        res.status(500).json({ error: 'Failed to fetch calendar data' });
    }
});

/**
 * @route GET /calendar/:userId/:date
 * @description Get detailed info for a specific date
 * @access Private
 */
router.get('/:userId/:date', auth, async (req, res) => {
    try {
        const { userId, date } = req.params;

        if (!moment(date, 'YYYY-MM-DD', true).isValid()) {
            return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
        }

        // Get all information for the date
        const [holidayResult, leaveResult, taskResult, attendanceResult] = await Promise.all([
            // Check for holidays
            query('SELECT name FROM holidays WHERE date = ? LIMIT 1', [date]),
            // Check for leave requests
            query(`SELECT reason, status FROM leave_requests 
                   WHERE user_id = ? AND ? BETWEEN date(start_date) AND date(end_date) 
                   AND status = 'approved' LIMIT 1`, [userId, date]),
            // Check for task calendar events
            query('SELECT title, description FROM TaskCalendarEvents WHERE userId = ? AND date(dueDate) = ? LIMIT 1', [userId, date]),
            // Check for attendance
            query(`SELECT 
                     MIN(CASE WHEN type = 'checkin' THEN strftime('%H:%M', timestamp) END) as checkin,
                     MAX(CASE WHEN type = 'checkout' THEN strftime('%H:%M', timestamp) END) as checkout,
                     ROUND((
                         JULIANDAY(MAX(CASE WHEN type = 'checkout' THEN timestamp END)) - 
                         JULIANDAY(MIN(CASE WHEN type = 'checkin' THEN timestamp END))
                     ) * 24, 2) as total_hours
                   FROM attendance 
                   WHERE user_id = ? AND date(timestamp) = ? 
                   AND EXISTS (SELECT 1 FROM attendance a2 WHERE a2.user_id = attendance.user_id 
                              AND date(a2.timestamp) = date(attendance.timestamp) AND a2.type = 'checkout')`, [userId, date])
        ]);

        // Build response object with all available information
        const response = {};
        
        // Add holiday information
        if (holidayResult.length > 0) {
            response.type = 'holiday';
            response.name = holidayResult[0].name;
        }
        
        // Add leave information
        if (leaveResult.length > 0) {
            response.leave = {
                reason: leaveResult[0].reason,
                status: leaveResult[0].status
            };
            if (!response.type) response.type = 'leave';
        }
        
        // Add task information
        if (taskResult.length > 0) {
            response.task = {
                title: taskResult[0].title,
                description: taskResult[0].description
            };
            if (!response.type) response.type = 'task_due';
        }
        
        // Add attendance information
        if (attendanceResult.length > 0 && attendanceResult[0].checkin) {
            response.attendance = {
                checkin: attendanceResult[0].checkin,
                checkout: attendanceResult[0].checkout,
                total_hours: attendanceResult[0].total_hours
            };
            if (!response.type) response.type = 'present';
        }
        
        // Set default type if nothing found
        if (!response.type) {
            response.type = 'absent';
        }

        res.json(response);
    } catch (error) {
        console.error('Error fetching date details:', error);
        res.status(500).json({ error: 'Failed to fetch date details' });
    }
});

module.exports = router;
