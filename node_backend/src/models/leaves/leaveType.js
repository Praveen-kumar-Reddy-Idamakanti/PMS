// models/LeaveType.js
const { query, run } = require('../../config/db');

const LeaveType = {
  getAll() {
    return query('SELECT * FROM leave_types WHERE is_active = 1 ORDER BY id');
  },

  async getById(id) {
    const rows = await query('SELECT * FROM leave_types WHERE id = ?', [id]);
    return rows[0];
  },

  create({ name, yearly_quota = 0, monthly_quota = 0, carry_forward_allowed = 0, carry_forward_limit = 0, is_active = 1 }) {
    return run(
      `INSERT INTO leave_types (
        name, 
        yearly_quota, 
        monthly_quota, 
        carry_forward_allowed, 
        carry_forward_limit,
        is_active
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        name, 
        yearly_quota, 
        monthly_quota, 
        carry_forward_allowed ? 1 : 0, 
        carry_forward_limit,
        is_active ? 1 : 0
      ]
    ).then(result => ({ id: result.insertId }));
  },

  update(id, patch) {
    const fields = [];
    const values = [];
    const allowedFields = [
      'name', 
      'yearly_quota', 
      'monthly_quota', 
      'carry_forward_allowed', 
      'carry_forward_limit',
      'is_active'
    ];
    
    for (const k of allowedFields) {
      if (k in patch) {
        fields.push(`${k} = ?`);
        values.push(patch[k]);
      }
    }
    
    if (!fields.length) return Promise.resolve({ changes: 0 });
    
    values.push(id);
    return run(
      `UPDATE leave_types 
       SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      values
    ).then(result => ({ changes: result.changes }));
  },
  
  delete(id) {
    return run(
      'UPDATE leave_types SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    ).then(result => ({ changes: result.changes }));
  }
};

module.exports = LeaveType;