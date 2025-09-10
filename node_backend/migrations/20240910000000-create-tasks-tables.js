'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create Tasks table
    await queryInterface.createTable('Tasks', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('todo', 'in-progress', 'review', 'completed'),
        defaultValue: 'todo',
        allowNull: false,
      },
      priority: {
        type: Sequelize.ENUM('low', 'medium', 'high', 'urgent'),
        defaultValue: 'medium',
        allowNull: false,
      },
      dueDate: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      startDate: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      endDate: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      progress: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        validate: {
          min: 0,
          max: 100,
        },
      },
      calendarEventId: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      tags: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: [],
      },
      isRecurring: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      recurrencePattern: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      reminderTime: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      estimatedHours: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      actualHours: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      createdBy: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    // Create TaskAssignments table
    await queryInterface.createTable('TaskAssignments', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      role: {
        type: Sequelize.ENUM('assignee', 'reviewer', 'follower'),
        allowNull: false,
        defaultValue: 'assignee',
      },
      status: {
        type: Sequelize.ENUM('pending', 'accepted', 'declined'),
        defaultValue: 'pending',
      },
      isPrimary: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      assignedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      dueDate: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      estimatedHours: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      actualHours: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      TaskId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Tasks',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      UserId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Add indexes
    await queryInterface.addIndex('Tasks', ['status']);
    await queryInterface.addIndex('Tasks', ['priority']);
    await queryInterface.addIndex('Tasks', ['dueDate']);
    await queryInterface.addIndex('Tasks', ['createdBy']);
    await queryInterface.addIndex('TaskAssignments', ['TaskId']);
    await queryInterface.addIndex('TaskAssignments', ['UserId']);
    await queryInterface.addIndex('TaskAssignments', ['role']);
    await queryInterface.addIndex('TaskAssignments', ['status']);
    
    // Add unique constraint for task assignment
    await queryInterface.addConstraint('TaskAssignments', {
      fields: ['TaskId', 'UserId', 'role'],
      type: 'unique',
      name: 'unique_task_assignment'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('TaskAssignments');
    await queryInterface.dropTable('Tasks');
    
    // Drop enums
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Tasks_status"');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Tasks_priority"');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_TaskAssignments_role"');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_TaskAssignments_status"');
  }
};
