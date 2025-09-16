// models/LeaveType.js
const { query, run } = require('../../config/db');

const LeaveType = {
  getAll() {
    return query('SELECT * FROM leave_types WHERE is_active = true ORDER BY id');
  },

  async getById(id) {
    const rows = await query('SELECT * FROM leave_types WHERE id = $1', [id]);
    return rows[0];
  },

  async create({ name, yearly_quota = 0, monthly_quota = 0, carry_forward_allowed = false, carry_forward_limit = 0, is_active = true }) {
    const result = await run(
      `INSERT INTO leave_types (
        name, 
        yearly_quota, 
        monthly_quota, 
        carry_forward_allowed, 
        carry_forward_limit,
        is_active
      ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [
        name, 
        yearly_quota, 
        monthly_quota, 
        carry_forward_allowed, 
        carry_forward_limit,
        is_active
      ]
    );
    return { id: result.rows[0].id };
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
    
    let paramIndex = 1;
    for (const k of allowedFields) {
      if (k in patch) {
        fields.push(`${k} = $${paramIndex++}`);
        values.push(patch[k]);
      }
    }
    
    if (!fields.length) return Promise.resolve({ changes: 0 });
    
    values.push(id);
    return run(
      `UPDATE leave_types 
       SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $${paramIndex}`,
      values
    ).then(result => ({ changes: result.rowCount }));
  },
  
  delete(id) {
    return run(
      'UPDATE leave_types SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    ).then(result => ({ changes: result.rowCount }));
  }
};

module.exports = LeaveType;
