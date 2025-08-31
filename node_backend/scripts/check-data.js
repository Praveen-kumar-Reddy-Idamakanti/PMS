const { sequelize } = require('../src/config/database');

async function checkData() {
  try {
    console.log('Checking database tables...');
    
    // Check users table
    const users = await sequelize.query('SELECT * FROM users;');
    console.log('\nUsers table:');
    console.table(users[0]);
    
    // Check admin_settings table
    const settings = await sequelize.query('SELECT * FROM admin_settings;');
    console.log('\nAdmin Settings:');
    console.table(settings[0]);
    
    // Check user_activity table
    const activities = await sequelize.query('SELECT * FROM user_activity LIMIT 5;');
    console.log('\nRecent Activities (first 5):');
    console.table(activities[0]);
    
    // Check attendance count
    const attendance = await sequelize.query('SELECT COUNT(*) as count FROM attendance;');
    console.log('\nTotal attendance records:', attendance[0][0].count);
    
  } catch (error) {
    console.error('Error checking data:', error);
  } finally {
    await sequelize.close();
  }
}

checkData();
