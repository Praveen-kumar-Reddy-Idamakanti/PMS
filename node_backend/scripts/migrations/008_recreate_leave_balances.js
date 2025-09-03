const { run } = require('../../src/config/db');

async function up() {
  console.log('Recreating leave_balances table with UNIQUE constraint...');
  await run(`DROP TABLE IF EXISTS leave_balances;`);
  await run(`
    CREATE TABLE leave_balances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      leave_type_id INTEGER NOT NULL,
      year INTEGER NOT NULL,
      balance REAL NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, leave_type_id, year)
    );
  `);
  console.log('Table leave_balances recreated.');
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
