const fs = require('fs');
const path = require('path');
const { sequelize } = require('../src/config/database');

async function seedDatabase() {
  try {
    // Read the SQL file
    const sql = fs.readFileSync(
      path.join(__dirname, 'seed-data.sql'), 
      'utf8'
    );

    console.log('Starting database seeding...');
    
    // Split the SQL file into individual statements and execute them
    const statements = sql
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0);

    for (const statement of statements) {
      try {
        await sequelize.query(statement + ';');
      } catch (error) {
        console.error('Error executing statement:', error);
        throw error;
      }
    }

    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
