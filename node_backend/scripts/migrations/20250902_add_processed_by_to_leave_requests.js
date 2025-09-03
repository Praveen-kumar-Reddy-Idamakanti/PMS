// 20250902_add_processed_by_to_leave_requests.js
const { run } = require('../../config/db');

module.exports = {
  up: async () => {
    await run(`
      ALTER TABLE leave_requests
      ADD COLUMN processed_by TEXT;
    `);
    await run(`
      ALTER TABLE leave_requests
      ADD COLUMN processed_at DATETIME;
    `);
  },
  down: async () => {
    // Note: SQLite does not support dropping columns directly.
    // A common workaround is to rename the table, create a new table
    // without the column, and then copy data. For simplicity in a
    // development context, we might omit the 'down' for column drops
    // or provide a more complex migration.
    // For this exercise, we'll just log a message.
    console.warn('Dropping columns in SQLite is complex and not directly supported via ALTER TABLE. Manual intervention might be needed for rollback.');
  }
};