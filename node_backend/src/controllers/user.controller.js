const { query } = require('../config/db');

const getAllUsers = async (req, res) => {
  try {
    const users = await query('SELECT id, name, email FROM users');
    res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
};

module.exports = {
  getAllUsers,
};