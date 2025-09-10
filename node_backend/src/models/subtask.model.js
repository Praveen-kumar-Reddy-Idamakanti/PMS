
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
    status: {
      type: DataTypes.ENUM('todo', 'in-progress', 'completed'),
      defaultValue: 'todo',
    },
    taskId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  }, {
    sequelize,
    modelName: 'SubTask',
    tableName: 'SubTasks',
  });
  return SubTask;
};
