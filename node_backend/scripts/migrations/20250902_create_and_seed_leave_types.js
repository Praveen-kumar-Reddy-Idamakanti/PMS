// 20250902_create_and_seed_leave_types.js
const { run, query } = require('../../config/db');

module.exports = {
  up: async () => {
    // Create leave_types table
    await run(`
      CREATE TABLE IF NOT EXISTS leave_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        yearly_quota INTEGER NOT NULL,
        carry_forward INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Seed default leave types
    const defaultLeaveTypes = [
      { name: 'Sick Leave', yearly_quota: 10 },
      { name: 'Privilege Leave', yearly_quota: 15 },
      { name: 'Casual Leave', yearly_quota: 7 },
    ];

    for (const type of defaultLeaveTypes) {
      const [existingType] = await query('SELECT id FROM leave_types WHERE name = ?', [type.name]);
      if (!existingType) {
        await run(
          'INSERT INTO leave_types (name, yearly_quota) VALUES (?, ?)',
          [type.name, type.yearly_quota]
        );
      }
    }
  },
  down: async () => {
    // Optional: Drop the table and remove seeded data
    // await run('DROP TABLE IF EXISTS leave_types');
    // Or just remove the seeded data if the table is managed elsewhere
    // await run('DELETE FROM leave_types WHERE name IN (\'Sick Leave\', \'Privilege Leave\', \'Casual Leave\')');
    console.warn('Down migration for leave_types is not fully implemented to prevent accidental data loss.');
  }
};