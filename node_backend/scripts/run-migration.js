#!/usr/bin/env node

const DatabaseMigrator = require('./migrate-to-postgresql');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

console.log('🚀 Starting SQLite to PostgreSQL Migration...');
console.log('=====================================');

// Check if PostgreSQL configuration is provided
if (!process.env.DB_PASSWORD || process.env.DB_PASSWORD === 'your_password_here') {
    console.error('❌ Please set your PostgreSQL password in the .env file');
    console.log('📝 Create a .env file with the following content:');
    console.log(`
DB_HOST=localhost
DB_PORT=5432
DB_NAME=pms_database
DB_USER=postgres
DB_PASSWORD=your_actual_password
    `);
    process.exit(1);
}

const migrator = new DatabaseMigrator();
migrator.migrate()
    .then(() => {
        console.log('🎉 Migration completed successfully!');
        console.log('📝 Next steps:');
        console.log('1. Set DB_TYPE=postgresql in your .env file');
        console.log('2. Restart your application');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    });