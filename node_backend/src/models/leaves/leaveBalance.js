// models/LeaveBalance.js
const { query, run } = require('../../config/db');

const LeaveBalance = {
  getByUser(user_id) {
    return query(
      `SELECT lb.*, lt.name as leave_type, lt.yearly_quota, lt.monthly_quota, lt.carry_forward_allowed, lt.carry_forward_limit
       FROM leave_balances lb
       JOIN leave_types lt ON lb.leave_type_id = lt.id
       WHERE lb.user_id = ?
       ORDER BY lt.name`,
      [user_id]
    );
  },

  async get(user_id, leave_type_id, year) {
    const rows = await query(
      `SELECT * FROM leave_balances WHERE user_id = ? AND leave_type_id = ? AND year = ?`,
      [user_id, leave_type_id, year]
    );
    return rows[0];
  },

  upsert(user_id, leave_type_id, year, balance) {
    return run(
      `INSERT INTO leave_balances (user_id, leave_type_id, year, balance)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id, leave_type_id, year) DO UPDATE SET balance = excluded.balance, updated_at = CURRENT_TIMESTAMP`,
      [user_id, leave_type_id, year, balance]
    );
  },

  async updateBalance(user_id, leave_type_id, year, delta) {
    const row = await this.get(user_id, leave_type_id, year);
    const current = (row && row.balance) || 0;
    const next = current + delta;
    return this.upsert(user_id, leave_type_id, year, next).then(() => ({ balance: next }));
  }
};

module.exports = LeaveBalance;