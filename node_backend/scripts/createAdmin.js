const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Database configuration
const dbPath = path.join(__dirname, '..', 'data', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// Admin user details
const adminUser = {
  name: 'Admin User',
  email: 'super_admin@example.com',
  password: 'Admin@123', // In a real app, this should be passed as an environment variable
  role: 'super_admin'
};

async function createAdminUser() {
  try {
    // Check if admin already exists
    const existingUser = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE email = ?', [adminUser.email], (err, row) => {
        if (err) reject(err);
        resolve(row);
      });
    });

    if (existingUser) {
      console.log('Admin user already exists:', existingUser.email);
      db.close();
      return;
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminUser.password, salt);

    // Create the admin user
    await new Promise((resolve, reject) => {
      const stmt = db.prepare(
        'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)'
      );
      
      stmt.run(
        adminUser.name,
        adminUser.email,
        hashedPassword,
        adminUser.role,
        function (err) {
          if (err) return reject(err);
          resolve();
        }
      );
      
      stmt.finalize();
    });

    console.log('Admin user created successfully!');
    console.log('Email:', adminUser.email);
    console.log('Password:', adminUser.password);
    console.log('\nIMPORTANT: Change this password after first login!');

  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    // Close the database connection
    db.close();
  }
}

// Run the script
createAdminUser();
