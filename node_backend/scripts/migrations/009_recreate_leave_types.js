const { run } = require('../../src/config/db');

async function up() {
  console.log('Recreating leave_types table with new columns...');
  await run(`PRAGMA foreign_keys = OFF;`);
  await run(`DROP TABLE IF EXISTS leave_types;`);
  await run(`
    CREATE TABLE leave_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      yearly_quota REAL NOT NULL DEFAULT 0,
      monthly_quota REAL NOT NULL DEFAULT 0,
      carry_forward_allowed BOOLEAN NOT NULL DEFAULT 0,
      carry_forward_limit REAL NOT NULL DEFAULT 0,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await run(`PRAGMA foreign_keys = ON;`);
  console.log('Table leave_types recreated.');
}

// Immediately execute the migration if this script is run directly
if (require.main === module) {
  const { connectDB, closeDB } = require('../../src/config/db');

  (async () => {
    try {
      await connectDB();
      await up();
    } catch (err) {
      console.error('Migration failed:', err);
      process.exit(1);
    } finally {
      await closeDB();
    }
  })();
}

module.exports = { up };