
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SubTask extends Model {
    static associate(models) {
      SubTask.belongsTo(models.Task, { foreignKey: 'taskId', as: 'task' });
    }
  }
  SubTask.init({
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    completed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    taskId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    assignedTo: { // New field
      type: DataTypes.INTEGER,
      allowNull: true, // Can be null if unassigned
    },
    assignedBy: { // New field
      type: DataTypes.INTEGER,
      allowNull: true, // Can be null if unassigned
    },
  }, {
    sequelize,
    modelName: 'SubTask',
    tableName: 'SubTasks',
  });
  return SubTask;
};
