'use strict';

module.exports = {
  up: async (db) => { // Renamed queryInterface to db for clarity
    return new Promise((resolve, reject) => {
      db.run(`
        CREATE TABLE IF NOT EXISTS TaskCalendarEvents (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          taskId INTEGER NOT NULL,
          userId INTEGER,
          title TEXT NOT NULL,
          description TEXT,
          dueDate DATETIME NOT NULL,
          status TEXT NOT NULL DEFAULT 'task_due',
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (taskId) REFERENCES Tasks(id) ON UPDATE CASCADE ON DELETE CASCADE,
          FOREIGN KEY (userId) REFERENCES Users(id) ON UPDATE CASCADE ON DELETE SET NULL
        );
      `, (err) => {
        if (err) {
          return reject(err);
        }
        resolve();
      });
    });
  },

  down: async (db) => { // Renamed queryInterface to db for clarity
    return new Promise((resolve, reject) => {
      db.run(`
        DROP TABLE IF EXISTS TaskCalendarEvents;
      `, (err) => {
        if (err) {
          return reject(err);
        }
        resolve();
      });
    });
  }
};