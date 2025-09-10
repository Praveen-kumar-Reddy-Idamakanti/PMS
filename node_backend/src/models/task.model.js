
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Task extends Model {
    static associate(models) {
      Task.belongsTo(models.User, { as: 'assignedToUser', foreignKey: 'assignedTo' });
      Task.belongsTo(models.User, { as: 'assignedByUser', foreignKey: 'assignedBy' });
      Task.hasMany(models.SubTask, { foreignKey: 'taskId', as: 'subtasks' });
      Task.belongsToMany(models.Tag, { through: 'TaskTags', foreignKey: 'taskId', as: 'tags' });
    }
  }
  Task.init({
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
    },
    status: {
      type: DataTypes.ENUM('todo', 'in-progress', 'review', 'completed'),
      defaultValue: 'todo',
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
      defaultValue: 'medium',
    },
    assignedTo: {
      type: DataTypes.INTEGER,
      allowNull: true, // Can be null if not assigned to a specific user yet
    },
    assignedBy: {
      type: DataTypes.INTEGER,
      allowNull: true, // Can be null if not assigned by a specific user yet
    },
    dueDate: {
      type: DataTypes.DATE,
    },
    completedAt: {
      type: DataTypes.DATE,
    },
    progress: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
  }, {
    sequelize,
    modelName: 'Task',
    tableName: 'Tasks',
  });
  return Task;
};
