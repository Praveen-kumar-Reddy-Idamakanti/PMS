const { db, sequelize } = require('../src/config/database');
const bcrypt = require('bcryptjs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const createSuperAdmin = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection established.');

    // Ensure models are synced (optional, but good for standalone scripts)
    // await sequelize.sync(); // Use { alter: true } if schema changes are expected

    const User = db.User;

    rl.question('Enter admin email: ', async (email) => {
      rl.question('Enter admin password: ', async (password) => {
        if (!email || !password) {
          console.error('Email and password cannot be empty.');
          rl.close();
          await sequelize.close();
          return;
        }

        try {
          const hashedPassword = await bcrypt.hash(password, 10); // 10 salt rounds

          const [user, created] = await User.findOrCreate({
            where: { email: email },
            defaults: {
              email: email,
              password: hashedPassword,
              role: 'super_admin',
              name: 'Super Admin', // A default name, can be prompted if needed
              employeeId: `ADMIN-${Date.now()}`, // Unique employeeId for admin
            },
          });

          if (created) {
            console.log(`Super admin user created: ${user.email}`);
          } else {
            // If user already exists, update their role to admin and password if different
            if (user.role !== 'admin' || !(await bcrypt.compare(password, user.password))) {
              user.role = 'admin';
              user.password = hashedPassword;
              await user.save();
              console.log(`Existing user ${user.email} updated to super admin role and password.`);
            } else {
              console.log(`User ${user.email} already exists and is a super admin.`);
            }
          }
        } catch (error) {
          console.error('Error creating/updating super admin:', error);
        } finally {
          rl.close();
          await sequelize.close();
        }
      });
    });
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    rl.close();
    await sequelize.close();
  }
};

createSuperAdmin();