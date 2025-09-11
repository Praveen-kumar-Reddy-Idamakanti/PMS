'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add assignedTo column
    await queryInterface.addColumn('SubTasks', 'assignedTo', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'users', // Assuming your users table is named 'users'
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    // Add assignedBy column
    await queryInterface.addColumn('SubTasks', 'assignedBy', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'users', // Assuming your users table is named 'users'
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove assignedBy column
    await queryInterface.removeColumn('SubTasks', 'assignedBy');

    // Remove assignedTo column
    await queryInterface.removeColumn('SubTasks', 'assignedTo');
  }
};