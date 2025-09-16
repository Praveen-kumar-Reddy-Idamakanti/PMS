const { Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

// Check if PostgreSQL is configured
const usePostgreSQL = process.env.DB_TYPE === 'postgresql' || process.env.DB_HOST;

// Create logs directory if it doesn't exist
const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

let sequelize;

if (usePostgreSQL) {
    const pgConfig = require('./postgresql').config;
    sequelize = new Sequelize(pgConfig.database, pgConfig.user, pgConfig.password, {
        host: pgConfig.host,
        port: pgConfig.port,
        dialect: 'postgres',
        logging: false,
        dialectOptions: {
            ssl: pgConfig.ssl
        },
        define: {
            timestamps: true,
            underscored: true,
            createdAt: 'created_at',
            updatedAt: 'updated_at'
        }
    });
} else {
    sequelize = new Sequelize({
        dialect: 'sqlite',
        storage: path.join(__dirname, '../../data/database.sqlite'),
        logging: false, // Set to // console.log to see SQL queries
        define: {
            timestamps: true,
            underscored: true,
            createdAt: 'created_at',
            updatedAt: 'updated_at'
        }
    });
}


// Test the database connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    logger.info('✅ Sequelize connection has been established successfully.');
  } catch (error) {
    logger.error('❌ Unable to connect to the database via Sequelize:', error);
  }
};

module.exports = {
  sequelize,
  testConnection,
  query: sequelize.query.bind(sequelize),
  run: sequelize.query.bind(sequelize)
};