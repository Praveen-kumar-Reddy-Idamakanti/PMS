const { getDB } = require('../src/config/db');
const logger = require('../src/utils/logger');

async function checkUserRole(userId) {
  try {
    const db = await getDB();
    
    // Get user role
    const user = await db.get('SELECT id, email, role FROM users WHERE id = ?', [userId]);
    
    if (!user) {
      logger.error(`❌ User with ID ${userId} not found`);
      return;
    }
    
    logger.info(`User ${user.email} (ID: ${user.id}) has role: ${user.role}`);
    
    // List all available roles in the system
    const roles = await db.all("PRAGMA table_info(users)");
    const roleColumn = roles.find(col => col.name === 'role');
    logger.info('Available roles in the system:', roleColumn);
    
  } catch (error) {
    logger.error('Error checking user role:', error);
  } finally {
    process.exit(0);
  }
}

// Get user ID from command line argument or use default (2)
const userId = process.argv[2] || 2;
checkUserRole(userId);
