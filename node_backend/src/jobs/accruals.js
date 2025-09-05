// jobs/accruals.js
'use strict';

const { query } = require('../config/db');
const LeaveType = require('../models/leaves/LeaveType');
const LeaveBalance = require('../models/leaves/leaveBalance');

/**
 * Helper to get active users (returns array of { id })
 * Adjust the SQL if your users table or active flag differ.
 */
async function getActiveUsers() {
  return query('SELECT id FROM users WHERE is_active = 1');
}

/**
 * Monthly accrual: add monthly_quota to each user's balance for leave types that have monthly_quota > 0
 *
 * Notes:
 * - Uses LeaveBalance.upsert which does INSERT ... ON CONFLICT (user_id, leave_type_id, year) DO UPDATE
 * - Year here is the current year. If you prefer to credit to previous year for Dec->Jan logic, adjust accordingly.
 */
async function runMonthlyAccruals() {
  try {
    console.log('[accruals] Starting monthly accrual job...');
    const types = await LeaveType.getAll(); // returns array of leave types
    const monthlyTypes = types.filter(t => (t.monthly_quota || 0) > 0);

    if (!monthlyTypes.length) {
      console.log('[accruals] No monthly-accrual leave types found. Exiting.');
      return;
    }

    const users = await getActiveUsers();
    if (!users || users.length === 0) {
      console.log('[accruals] No active users found. Exiting.');
      return;
    }

    const year = new Date().getFullYear();

    // Process user-by-user to avoid very long transactions
    for (const u of users) {
      for (const t of monthlyTypes) {
        try {
          // get existing balance for current year
          const lb = await LeaveBalance.get(u.id, t.id, year);
          const current = (lb && lb.balance) ? Number(lb.balance) : 0;
          const increment = Number(t.monthly_quota || 0);

          // If increment is zero skip
          if (increment === 0) continue;

          const next = current + increment;

          await LeaveBalance.upsert(u.id, t.id, year, next);

          console.log(`[accruals] Credited user=${u.id} leave_type=${t.name} (${t.id}) +${increment} -> ${next} (year=${year})`);
        } catch (innerErr) {
          console.error(`[accruals] Error processing user=${u.id} type=${t.id}:`, innerErr);
        }
      }
    }

    console.log('[accruals] Monthly accruals completed.');
  } catch (err) {
    console.error('[accruals] Fatal error running monthly accruals:', err);
    throw err;
  }
}

/**
 * Yearly initialization + carry forward
 * - For leave types with yearly_quota > 0, create/upsert leave_balances for the new year
 * - If carry_forward_allowed, carry a limited amount from previous year into new year's initial balance
 */
async function runYearlyInitAndCarryForward() {
  try {
    console.log('[accruals] Starting yearly init & carry-forward job...');
    const types = await LeaveType.getAll();
    const users = await getActiveUsers();
    if (!users || users.length === 0) {
      console.log('[accruals] No active users found. Exiting.');
      return;
    }

    const year = new Date().getFullYear();

    for (const u of users) {
      for (const t of types) {
        try {
          const yearlyQuota = Number(t.yearly_quota || 0);
          if (yearlyQuota <= 0) {
            // nothing to initialize for this leave type (e.g., pure monthly accrual-only types)
            continue;
          }

          // fetch previous year's balance to calculate carry
          const prevBalanceRow = await LeaveBalance.get(u.id, t.id, year - 1);
          let carry = 0;
          if (t.carry_forward_allowed && prevBalanceRow) {
            const prevBalance = Number(prevBalanceRow.balance || 0);
            const limit = Number(t.carry_forward_limit || 0);
            carry = Math.min(prevBalance, limit);
          }

          const initial = carry + yearlyQuota;

          // Upsert the balance for the new year
          await LeaveBalance.upsert(u.id, t.id, year, initial);

          console.log(`[accruals] User=${u.id} type=${t.name} (${t.id}) initial=${initial} (carry=${carry}, yearly=${yearlyQuota}) for year=${year}`);
        } catch (innerErr) {
          console.error(`[accruals] Error initializing user=${u.id} type=${t.id}:`, innerErr);
        }
      }
    }

    console.log('[accruals] Yearly init & carry-forward completed.');
  } catch (err) {
    console.error('[accruals] Fatal error in yearly init & carry-forward:', err);
    throw err;
  }
}

/**
 * CLI support so you can run the job manually:
 *  node jobs/accruals.js monthly
 *  node jobs/accruals.js yearly
 *  node jobs/accruals.js all
 */
if (require.main === module) {
  (async () => {
    const arg = (process.argv[2] || 'all').toLowerCase();
    try {
      if (arg === 'monthly') {
        await runMonthlyAccruals();
      } else if (arg === 'yearly') {
        await runYearlyInitAndCarryForward();
      } else if (arg === 'all') {
        // Run yearly first only if it's January (safe-guard), otherwise just run monthly
        const now = new Date();
        if (now.getMonth() === 0) {
          // January -> run yearly carry-forward then monthly accruals
          await runYearlyInitAndCarryForward();
        }
        await runMonthlyAccruals();
      } else {
        console.log('Unknown arg. Use: monthly | yearly | all');
      }
      process.exit(0);
    } catch (err) {
      console.error('Job failed:', err);
      process.exit(1);
    }
  })();
}

module.exports = {
  runMonthlyAccruals,
  runYearlyInitAndCarryForward,
};
