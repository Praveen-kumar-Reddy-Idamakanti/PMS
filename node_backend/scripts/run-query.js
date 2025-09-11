const { query, connectDB } = require('../src/config/db');
const logger = require('../src/utils/logger');

async function runSingleQuery() {
  try {
    await connectDB();
    const sql = "SELECT * FROM SubTasks WHERE taskId = ?"; // Hardcoded SQL query
    const params = [11]; // Hardcoded parameters

    logger.info(`Executing query: ${sql} with params: ${JSON.stringify(params)}`);
    const results = await query(sql, params);
    logger.info('Query Results:', results);
    process.exit(0);
  } catch (error) {
    logger.error('Error running query:', error);
    process.exit(1);
  }
}

runSingleQuery();