const { run } = require('../../src/config/db');

async function up() {
  console.log('Adding \'days\' column to leave_requests table...');
  await run(`
    ALTER TABLE leave_requests
    ADD COLUMN days INTEGER;
  `);
  console.log('Column \'days\' added.');
}

async function down() {
  // Down migration is not recommended for this case
  // as it would involve dropping the column, which can be destructive.
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

module.exports = { up, down };
