const { getDB } = require('../src/config/db');
const logger = require('../src/utils/logger');

async function checkUserRoleDetails(userId) {
  try {
    const db = await getDB();
    
    // Check if roles table exists
    const rolesTable = await db.get(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='roles'"
    );
    
    if (!rolesTable) {
      logger.error('❌ Roles table does not exist');
      // Check users table structure
      const usersColumns = await db.all("PRAGMA table_info(users)");
      logger.info('Users table columns:', usersColumns);
      return;
    }
    
    // Get user with role details
    const user = await db.get(`
      SELECT u.id, u.email, u.role, r.name as role_name, r.permissions 
      FROM users u
      LEFT JOIN roles r ON u.role = r.id
      WHERE u.id = ?
    `, [userId]);
    
    if (!user) {
      logger.error(`❌ User with ID ${userId} not found`);
      return;
    }
    
    logger.info('User details:', {
      id: user.id,
      email: user.email,
      role_id: user.role,
      role_name: user.role_name,
      permissions: user.permissions ? JSON.parse(user.permissions) : 'No permissions'
    });
    
    // List all available roles
    const allRoles = await db.all('SELECT * FROM roles');
    logger.info('Available roles:', allRoles);
    
  } catch (error) {
    logger.error('Error checking user role details:', error);
  } finally {
    process.exit(0);
  }
}

// Get user ID from command line argument or use default (2)
const userId = process.argv[2] || 2;
checkUserRoleDetails(userId);
