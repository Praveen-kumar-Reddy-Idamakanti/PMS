// scripts/init-all-leave-balances.js
const { connectDB, closeDB, query } = require('../src/config/db');
const LeaveType = require('../src/models/leaves/LeaveType');
const LeaveBalance = require('../src/models/leaves/leaveBalance');

async function initAllLeaveBalances() {
  try {
    await connectDB();
    
    // Get all active users
    const users = await query('SELECT id FROM users WHERE is_active = 1');
    const leaveTypes = await query('SELECT * FROM leave_types');
    const currentYear = new Date().getFullYear();
    
    for (const user of users) {
      for (const type of leaveTypes) {
        // Check if balance already exists
        const existing = await LeaveBalance.get(user.id, type.id, currentYear);
        
        if (!existing) {
          // Initialize with yearly quota
          await LeaveBalance.upsert(
            user.id,
            type.id,
            currentYear,
            type.yearly_quota
          );
          console.log(`Initialized ${type.name} for user ${user.id} with ${type.yearly_quota} days`);
        }
      }
    }
    
    console.log('Leave balances initialized successfully');
  } catch (error) {
    console.error('Error initializing leave balances:', error);
  } finally {
    await closeDB();
  }
}

initAllLeaveBalances();