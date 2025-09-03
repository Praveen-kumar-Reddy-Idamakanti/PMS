// scripts/initBalancesForUser.js
const db = require('../db');
const LeaveType = require('../models/LeaveType');
const LeaveBalance = require('../models/LeaveBalance');

async function initForUser(user_id) {
  const types = await LeaveType.getAll();
  const year = new Date().getFullYear();

  for (const t of types) {
    // For yearly quotas, we set initial balance to yearly_quota
    // For monthly quotas, we set them to 0 and rely on monthly accrual job to credit monthly_quota
    let initial = 0;
    if ((t.yearly_quota || 0) > 0 && (t.monthly_quota || 0) === 0) {
      initial = t.yearly_quota;
    }
    // Upsert
    await LeaveBalance.upsert(user_id, t.id, year, initial);
  }
  console.log('Initialized leave balances for user', user_id);
}

// usage: node scripts/initBalancesForUser.js <user_id>
if (require.main === module) {
  const userId = parseInt(process.argv[2], 10);
  if (!userId) {
    console.error('Usage: node initBalancesForUser.js <user_id>');
    process.exit(1);
  }
  initForUser(userId).then(() => process.exit()).catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = initForUser;
