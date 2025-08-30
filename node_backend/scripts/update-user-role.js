const { getDB } = require('../src/config/db');
const logger = require('../src/utils/logger');

async function updateUserRole(userId, newRole) {
  try {
    const db = await getDB();
    
    // Check if user exists
    const user = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE id = ?', [userId], (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });

    if (!user) {
      logger.error(`❌ User with ID ${userId} not found`);
      return;
    }

    logger.info(`Current user data:`, {
      id: user.id,
      email: user.email,
      currentRole: user.role,
      newRole
    });

    // Update user role
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE users SET role = ? WHERE id = ?',
        [newRole, userId],
        function(err) {
          if (err) return reject(err);
          resolve();
        }
      );
    });

    logger.info(`✅ Successfully updated role to '${newRole}' for user ${user.email}`);
    
  } catch (error) {
    logger.error('Error updating user role:', error);
  } finally {
    process.exit(0);
  }
}

// Get user ID and new role from command line arguments
const userId = process.argv[2];
const newRole = process.argv[3];

if (!userId || !newRole) {
  console.error('Usage: node scripts/update-user-role.js <userId> <newRole>');
  console.error('Example: node scripts/update-user-role.js 1 super_admin');
  process.exit(1);
}

updateUserRole(userId, newRole);
