// node_backend/src/jobs/dailyStatusUpdate.js
const { query, run } = require('../config/db');
const moment = require('moment');

async function updateDailyStatus() {
    const today = moment().format('YYYY-MM-DD');
    console.log(`[${new Date().toISOString()}] Starting daily status update for ${today}`);

    try {
        // Apply PRAGMAs before transaction
        await run('PRAGMA journal_mode = WAL');
        await run('PRAGMA synchronous = NORMAL');

        // --- Check if today is a holiday ---
        const holiday = await query(
            `SELECT id, name FROM holidays WHERE date = ? LIMIT 1`,
            [today]
        );

        if (holiday.length > 0) {
            // If holiday, mark all active users as holiday
            await run(`
                INSERT OR REPLACE INTO user_daily_status (user_id, date, status, created_at, updated_at)
                SELECT 
                    u.id,
                    ?,
                    'holiday',
                    COALESCE(uds.created_at, CURRENT_TIMESTAMP),
                    CURRENT_TIMESTAMP
                FROM users u
                LEFT JOIN user_daily_status uds 
                  ON u.id = uds.user_id AND uds.date = ?
                WHERE u.is_active = 1
            `, [today, today]);

            console.log(`[${new Date().toISOString()}] ✅ Today is a holiday (${holiday[0].name}). Marked all active users as 'holiday'.`);
            return; // Exit early, skip rest of logic
        }

        // --- Begin transaction for normal workflow ---
        await run('BEGIN IMMEDIATE TRANSACTION');

        // 1. Mark present users (checked in/out)
        await run(`
            INSERT OR REPLACE INTO user_daily_status (user_id, date, status, created_at, updated_at)
            SELECT 
                a.user_id,
                ? as date,
                'present',
                COALESCE(uds.created_at, CURRENT_TIMESTAMP),
                CURRENT_TIMESTAMP
            FROM (
                SELECT 
                    user_id,
                    SUM(CASE WHEN type = 'checkin' THEN 1 ELSE 0 END) as checkins,
                    SUM(CASE WHEN type = 'checkout' THEN 1 ELSE 0 END) as checkouts
                FROM attendance 
                WHERE date(timestamp) = ?
                GROUP BY user_id
                HAVING checkins > 0 AND checkouts > 0
            ) a
            LEFT JOIN user_daily_status uds 
              ON a.user_id = uds.user_id AND uds.date = ?
        `, [today, today, today]);

        // 2. Mark leave users
        await run(`
            INSERT OR REPLACE INTO user_daily_status (user_id, date, status, created_at, updated_at)
            SELECT 
                lr.user_id,
                ? as date,
                'leave',
                COALESCE(uds.created_at, CURRENT_TIMESTAMP),
                CURRENT_TIMESTAMP
            FROM leave_requests lr
            LEFT JOIN user_daily_status uds 
              ON lr.user_id = uds.user_id AND uds.date = ?
            WHERE lr.status = 'approved'
            AND ? BETWEEN DATE(lr.start_date) AND DATE(lr.end_date)
            AND NOT EXISTS (
                SELECT 1 FROM (
                    SELECT user_id
                    FROM attendance 
                    WHERE date(timestamp) = ?
                    GROUP BY user_id
                    HAVING SUM(CASE WHEN type = 'checkin' THEN 1 ELSE 0 END) > 0
                    AND SUM(CASE WHEN type = 'checkout' THEN 1 ELSE 0 END) > 0
                ) a WHERE a.user_id = lr.user_id
            )
        `, [today, today, today, today]);

        // 3. Mark absent users
        await run(`
            INSERT OR REPLACE INTO user_daily_status (user_id, date, status, created_at, updated_at)
            SELECT 
                u.id,
                ? as date,
                'absent',
                COALESCE(uds.created_at, CURRENT_TIMESTAMP),
                CURRENT_TIMESTAMP
            FROM users u
            LEFT JOIN user_daily_status uds 
              ON u.id = uds.user_id AND uds.date = ?
            WHERE u.is_active = 1
            AND NOT EXISTS (
                SELECT 1 FROM (
                    SELECT user_id
                    FROM attendance 
                    WHERE date(timestamp) = ?
                    GROUP BY user_id
                    HAVING SUM(CASE WHEN type = 'checkin' THEN 1 ELSE 0 END) > 0
                    AND SUM(CASE WHEN type = 'checkout' THEN 1 ELSE 0 END) > 0
                ) a WHERE a.user_id = u.id
            )
            AND NOT EXISTS (
                SELECT 1 FROM leave_requests lr 
                WHERE lr.user_id = u.id 
                AND lr.status = 'approved'
                AND ? BETWEEN DATE(lr.start_date) AND DATE(lr.end_date)
            )
        `, [today, today, today, today]);

        await run('COMMIT');
        console.log(`[${new Date().toISOString()}] ✅ Successfully updated daily statuses for ${today}`);
    } catch (error) {
        await run('ROLLBACK');
        console.error(`[${new Date().toISOString()}] ❌ Error updating daily statuses:`, error);
        throw error;
    } finally {
        try {
            // Reset PRAGMAs after work
            await run('PRAGMA journal_mode = DELETE');
            await run('PRAGMA synchronous = FULL');
        } catch (error) {
            console.error(`[${new Date().toISOString()}] ⚠️ Error resetting database settings:`, error);
        }
    }
}

module.exports = { updateDailyStatus };
