const { getDB } = require('../src/config/db');
const logger = require('../src/utils/logger');

async function verifyTable() {
  try {
    const db = await getDB();
    
    // Check if table exists
    const tableInfo = await db.get(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='admin_settings'"
    );
    
    if (!tableInfo) {
      logger.error('❌ admin_settings table does not exist');
      return;
    }
    
    logger.info('✅ admin_settings table exists');
    
    // Check table structure
    const columns = await db.all("PRAGMA table_info(admin_settings)");
    logger.info('Table structure:', { columns });
    
    // Check if there are any records
    const count = await db.get("SELECT COUNT(*) as count FROM admin_settings");
    logger.info(`Number of records: ${count.count}`);
    
    // Show first few records if any
    if (count.count > 0) {
      const records = await db.all("SELECT * FROM admin_settings LIMIT 5");
      logger.info('Sample records:', records);
    }
    
  } catch (error) {
    logger.error('Error verifying admin_settings table:', error);
  } finally {
    process.exit(0);
  }
}

verifyTable();
