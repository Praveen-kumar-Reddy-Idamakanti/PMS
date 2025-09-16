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

        console.log(`[DEBUG][Backend] Calendar request - userId: ${userId}, month: ${month}`);

        if (!month || !/^\d{4}-\d{2}$/.test(month)) {
            return res.status(400).json({ error: 'Invalid month format. Use YYYY-MM' });
        }

        const [year, monthNum] = month.split('-').map(Number);
        const daysInMonth = getDaysInMonth(year, monthNum);
        const startDate = `${month}-01`;
        const endDate = `${month}-${daysInMonth.toString().padStart(2, '0')}`;
        
        console.log(`[DEBUG][Backend] Date range: ${startDate} to ${endDate}`);

        const calendarData = await query(`
            WITH dates AS (
                SELECT generate_series($1::date, $2::date, '1 day')::date as date
            )
            SELECT
                to_char(d.date, 'YYYY-MM-DD') as date,
                COALESCE(
                    (SELECT 'holiday' FROM holidays h WHERE h.date = d.date LIMIT 1),
                    (SELECT 'leave' FROM leave_requests lr 
                     WHERE lr.user_id = $3 
                     AND d.date BETWEEN lr.start_date AND lr.end_date 
                     AND lr.status = 'approved' 
                     LIMIT 1),
                    (SELECT 'task_due' FROM "TaskCalendarEvents" tce
                     WHERE tce."userId" = $4 AND tce."dueDate"::date = d.date LIMIT 1),
                    (SELECT 'present' FROM attendance a 
                     WHERE a.user_id = $5 
                     AND a.timestamp::date = d.date 
                     AND a.type = 'checkin' 
                     AND EXISTS (
                         SELECT 1 FROM attendance a2 
                         WHERE a2.user_id = a.user_id 
                         AND a2.timestamp::date = d.date 
                         AND a2.type = 'checkout'
                     )
                     LIMIT 1),
                    CASE 
                        WHEN d.date > CURRENT_DATE THEN NULL
                        ELSE 'absent'
                    END
                ) as status,
                (SELECT h.name FROM holidays h WHERE h.date = d.date LIMIT 1) as holiday_name,
                (SELECT lr.reason FROM leave_requests lr 
                 WHERE lr.user_id = $6 
                 AND d.date BETWEEN lr.start_date AND lr.end_date 
                 AND lr.status = 'approved' 
                 LIMIT 1) as leave_reason,
                (SELECT tce.title FROM "TaskCalendarEvents" tce WHERE tce."userId" = $7 AND tce."dueDate"::date = d.date LIMIT 1) as task_title,
                (SELECT tce.description FROM "TaskCalendarEvents" tce WHERE tce."userId" = $8 AND tce."dueDate"::date = d.date LIMIT 1) as task_description,
                (SELECT to_char(MIN(a.timestamp), 'HH24:MI')
                 FROM attendance a 
                 WHERE a.user_id = $9 
                 AND a.timestamp::date = d.date 
                 AND a.type = 'checkin') as checkin_time,
                (SELECT to_char(MAX(a.timestamp), 'HH24:MI')
                 FROM attendance a 
                 WHERE a.user_id = $10 
                 AND a.timestamp::date = d.date 
                 AND a.type = 'checkout') as checkout_time
            FROM dates d
            ORDER BY d.date
        `, [startDate, endDate, userId, userId, userId, userId, userId, userId, userId, userId]);

        console.log(`[DEBUG][Backend] Query executed successfully. Rows returned: ${calendarData.length}`);
        console.log(`[DEBUG][Backend] Sample data (first 3 rows):`, calendarData.slice(0, 3));
        
        // Count statuses
        const statusCounts = calendarData.reduce((acc, day) => {
            acc[day.status || 'null'] = (acc[day.status || 'null'] || 0) + 1;
            return acc;
        }, {});
        console.log(`[DEBUG][Backend] Status counts:`, statusCounts);

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

        const [holidayResult, leaveResult, taskResult, attendanceResult] = await Promise.all([
            query('SELECT name FROM holidays WHERE date = $1 LIMIT 1', [date]),
            query(`SELECT reason, status FROM leave_requests 
                   WHERE user_id = $1 AND $2 BETWEEN start_date AND end_date 
                   AND status = 'approved' LIMIT 1`, [userId, date]),
            query('SELECT title, description FROM "TaskCalendarEvents" WHERE "userId" = $1 AND "dueDate"::date = $2 LIMIT 1', [userId, date]),
            query(`SELECT 
                     to_char(MIN(CASE WHEN type = 'checkin' THEN timestamp END), 'HH24:MI') as checkin,
                     to_char(MAX(CASE WHEN type = 'checkout' THEN timestamp END), 'HH24:MI') as checkout,
                     ROUND(EXTRACT(EPOCH FROM (
                         MAX(CASE WHEN type = 'checkout' THEN timestamp END) - 
                         MIN(CASE WHEN type = 'checkin' THEN timestamp END)
                     )) / 3600, 2) as total_hours
                   FROM attendance 
                   WHERE user_id = $1 AND timestamp::date = $2 
                   AND EXISTS (SELECT 1 FROM attendance a2 WHERE a2.user_id = attendance.user_id 
                              AND a2.timestamp::date = attendance.timestamp::date AND a2.type = 'checkout')`, [userId, date])
        ]);

        const response = {};
        
        if (holidayResult.length > 0) {
            response.type = 'holiday';
            response.name = holidayResult[0].name;
        }
        
        if (leaveResult.length > 0) {
            response.leave = {
                reason: leaveResult[0].reason,
                status: leaveResult[0].status
            };
            if (!response.type) response.type = 'leave';
        }
        
        if (taskResult.length > 0) {
            response.task = {
                title: taskResult[0].title,
                description: taskResult[0].description
            };
            if (!response.type) response.type = 'task_due';
        }
        
        if (attendanceResult.length > 0 && attendanceResult[0].checkin) {
            response.attendance = {
                checkin: attendanceResult[0].checkin,
                checkout: attendanceResult[0].checkout,
                total_hours: attendanceResult[0].total_hours
            };
            if (!response.type) response.type = 'present';
        }
        
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