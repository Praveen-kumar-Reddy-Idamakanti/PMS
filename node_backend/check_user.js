const { connectDB, query, closeDB } = require('./src/config/db');

(async () => {
  try {
    await connectDB();
    const users = await query('SELECT id, name, email FROM users WHERE id = 1');
    console.log('User with ID 1:', users);
  } catch (error) {
    console.error('Error checking user:', error);
  } finally {
    await closeDB();
  }
})();