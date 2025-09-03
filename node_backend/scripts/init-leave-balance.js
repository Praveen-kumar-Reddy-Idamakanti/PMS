const { connectDB, closeDB } = require('../src/config/db');
const LeaveBalance = require('../src/models/leaves/leaveBalance');

async function initLeaveBalance() {
  try {
    await connectDB();
    await LeaveBalance.upsert(1, 1, 2025, 10); // user_id, leave_type_id, year, balance
    console.log('Leave balance initialized.');
  } catch (err) {
    console.error('Failed to initialize leave balance:', err);
    process.exit(1);
  } finally {
    await closeDB();
  }
}

initLeaveBalance();
