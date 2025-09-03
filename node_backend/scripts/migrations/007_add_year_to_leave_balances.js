const { run } = require('../../src/config/db');

async function up() {
  console.log("Adding 'year' column to leave_balances table...");
  await run(`
    ALTER TABLE leave_balances
    ADD COLUMN year INTEGER;
  `);
  console.log("Column 'year' added.");
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