const { Client } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// PostgreSQL configuration
const POSTGRES_CONFIG = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'pms_database',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'superuser'
};

// SQLite database path
const SQLITE_DB_PATH = path.join(__dirname, '..', 'data', 'database.sqlite');

async function migrateTaskData() {
    const pgClient = new Client(POSTGRES_CONFIG);
    const sqliteDb = new sqlite3.Database(SQLITE_DB_PATH);
    
    try {
        console.log('🔌 Connecting to PostgreSQL...');
        await pgClient.connect();
        console.log('✅ Connected to PostgreSQL');
        
        console.log('🔌 Connecting to SQLite...');
        console.log('✅ Connected to SQLite');
        
        // Check if tables exist in SQLite
        const checkTables = (tableName) => {
            return new Promise((resolve, reject) => {
                sqliteDb.get(`SELECT name FROM sqlite_master WHERE type='table' AND name='${tableName}'`, (err, row) => {
                    if (err) reject(err);
                    resolve(!!row);
                });
            });
        };
        
        // Check if tables exist in PostgreSQL
        const checkPostgresTable = async (tableName) => {
            const result = await pgClient.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = $1
                );
            `, [tableName]);
            return result.rows[0].exists;
        };
        
        // Get all data from SQLite table
        const getSqliteData = (tableName) => {
            return new Promise((resolve, reject) => {
                sqliteDb.all(`SELECT * FROM ${tableName}`, (err, rows) => {
                    if (err) reject(err);
                    resolve(rows);
                });
            });
        };
        
        // Clear PostgreSQL table
        const clearPostgresTable = async (tableName) => {
            await pgClient.query(`DELETE FROM "${tableName}"`);
            console.log(`🗑️  Cleared existing data from ${tableName}`);
        };
        
        // Column mapping from SQLite camelCase to PostgreSQL column names
        const getColumnMapping = (tableName) => {
            if (tableName === 'SubTasks') {
                return {
                    'assignedTo': 'assignedto',
                    'assignedBy': 'assignedby',
                    'completedAt': 'completedat',
                    'createdAt': 'createdAt',  // Keep as camelCase for SubTasks
                    'updatedAt': 'updatedAt',  // Keep as camelCase for SubTasks
                    'completedBy': 'completedby',
                    'completionDescription': 'completiondescription',
                    'taskId': 'taskId'  // Keep as camelCase for SubTasks
                };
            } else if (tableName === 'Tasks') {
                return {
                    'assignedTo': 'assignedto',
                    'assignedBy': 'assignedby',
                    'dueDate': 'duedate',
                    'completedAt': 'completedat',
                    'createdAt': 'createdat',  // Lowercase for Tasks
                    'updatedAt': 'updatedat'   // Lowercase for Tasks
                };
            } else if (tableName === 'TaskCalendarEvents') {
                return {
                    'taskId': 'taskId',  // Keep as camelCase
                    'userId': 'userId',  // Keep as camelCase
                    'dueDate': 'dueDate', // Keep as camelCase
                    'createdAt': 'createdAt', // Keep as camelCase
                    'updatedAt': 'updatedAt'  // Keep as camelCase
                };
            }
            return {};
        };
        
        // Insert data into PostgreSQL
        const insertPostgresData = async (tableName, data, columns) => {
            if (data.length === 0) {
                console.log(`⚠️  No data to migrate for ${tableName}`);
                return;
            }
            
            // Get table-specific column mapping
            const columnMapping = getColumnMapping(tableName);
            
            // Filter columns that actually exist in the data
            const availableColumns = columns.filter(col => data[0].hasOwnProperty(col));
            const availableMappedColumns = availableColumns.map(col => columnMapping[col] || col);
            
            const columnNames = availableMappedColumns.map(col => `"${col}"`).join(', ');
            const placeholders = availableMappedColumns.map((_, index) => `$${index + 1}`).join(', ');
            
            console.log(`📝 Using columns: ${availableMappedColumns.join(', ')}`);
            
            for (const row of data) {
                const values = availableColumns.map(col => row[col]);
                await pgClient.query(
                    `INSERT INTO "${tableName}" (${columnNames}) VALUES (${placeholders})`,
                    values
                );
            }
            
            console.log(`✅ Migrated ${data.length} records to ${tableName}`);
        };
        
        // Migrate Tasks table
        console.log('\n📋 Migrating Tasks table...');
        const tasksExists = await checkTables('Tasks');
        const tasksPostgresExists = await checkPostgresTable('Tasks');
        
        if (tasksExists && tasksPostgresExists) {
            const tasksData = await getSqliteData('Tasks');
            await clearPostgresTable('Tasks');
            
            const taskColumns = ['id', 'title', 'description', 'status', 'priority', 'assignedTo', 'assignedBy', 'dueDate', 'completedAt', 'progress', 'createdAt', 'updatedAt'];
            await insertPostgresData('Tasks', tasksData, taskColumns);
        } else {
            console.log('⚠️  Tasks table not found in SQLite or PostgreSQL');
        }
        
        // Migrate SubTasks table
        console.log('\n📋 Migrating SubTasks table...');
        const subtasksExists = await checkTables('SubTasks');
        const subtasksPostgresExists = await checkPostgresTable('SubTasks');
        
        if (subtasksExists && subtasksPostgresExists) {
            const subtasksData = await getSqliteData('SubTasks');
            await clearPostgresTable('SubTasks');
            
            const subtaskColumns = ['id', 'title', 'status', 'taskId', 'createdAt', 'updatedAt', 'completed', 'assignedTo', 'assignedBy', 'completedBy', 'completedAt', 'completionDescription'];
            await insertPostgresData('SubTasks', subtasksData, subtaskColumns);
        } else {
            console.log('⚠️  SubTasks table not found in SQLite or PostgreSQL');
        }
        
        // Migrate TaskCalendarEvents table
        console.log('\n📋 Migrating TaskCalendarEvents table...');
        const taskCalendarExists = await checkTables('TaskCalendarEvents');
        const taskCalendarPostgresExists = await checkPostgresTable('TaskCalendarEvents');
        
        if (taskCalendarExists && taskCalendarPostgresExists) {
            const taskCalendarData = await getSqliteData('TaskCalendarEvents');
            await clearPostgresTable('TaskCalendarEvents');
            
            const taskCalendarColumns = ['id', 'taskId', 'userId', 'title', 'description', 'dueDate', 'status', 'createdAt', 'updatedAt'];
            await insertPostgresData('TaskCalendarEvents', taskCalendarData, taskCalendarColumns);
        } else {
            console.log('⚠️  TaskCalendarEvents table not found in SQLite or PostgreSQL');
        }
        
        // Reset sequences after data migration
        console.log('\n🔧 Resetting sequences...');
        const resetSequence = async (tableName, columnName) => {
            const maxQuery = `SELECT COALESCE(MAX("${columnName}"), 0) as max_val FROM "${tableName}"`;
            const maxResult = await pgClient.query(maxQuery);
            const maxVal = parseInt(maxResult.rows[0].max_val) || 0;
            
            if (maxVal > 0) {
                const sequenceName = `"${tableName}_${columnName}_seq"`;
                await pgClient.query(`SELECT setval('${sequenceName}', ${maxVal}, true)`);
                console.log(`✅ Reset sequence ${sequenceName} to ${maxVal}`);
            }
        };
        
        await resetSequence('Tasks', 'id');
        await resetSequence('SubTasks', 'id');
        await resetSequence('TaskCalendarEvents', 'id');
        
        console.log('\n🎉 Task data migration completed successfully!');
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        throw error;
    } finally {
        await pgClient.end();
        sqliteDb.close();
        console.log('🔌 Database connections closed');
    }
}

// Run the migration if this file is executed directly
if (require.main === module) {
    migrateTaskData()
        .then(() => {
            console.log('✅ Task data migration completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Task data migration failed:', error);
            process.exit(1);
        });
}

module.exports = { migrateTaskData };
