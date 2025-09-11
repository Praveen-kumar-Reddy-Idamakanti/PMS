'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Add the new 'completed' column
    await queryInterface.addColumn('SubTasks', 'completed', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    });

    // 2. Migrate data from 'status' to 'completed'
    // Assuming 'completed' status in old schema means completed = true
    await queryInterface.sequelize.query(
      `UPDATE SubTasks SET completed = TRUE WHERE status = 'completed';`
    );

    // 3. Remove the old 'status' column
    await queryInterface.removeColumn('SubTasks', 'status');
  },

  down: async (queryInterface, Sequelize) => {
    // Revert changes in reverse order

    // 1. Add back the 'status' column
    await queryInterface.addColumn('SubTasks', 'status', {
      type: Sequelize.ENUM('todo', 'in-progress', 'completed'), // Revert to original ENUM
      defaultValue: 'todo',
      allowNull: false,
    });

    // 2. Migrate data back from 'completed' to 'status'
    // Assuming completed = true means 'completed' status
    await queryInterface.sequelize.query(
      `UPDATE SubTasks SET status = 'completed' WHERE completed = TRUE;`
    );
    await queryInterface.sequelize.query(
      `UPDATE SubTasks SET status = 'todo' WHERE completed = FALSE;` // Default for non-completed
    );

    // 3. Remove the 'completed' column
    await queryInterface.removeColumn('SubTasks', 'completed');
  }
};