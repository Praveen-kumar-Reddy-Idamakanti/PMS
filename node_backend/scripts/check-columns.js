const { Client } = require('pg');

// PostgreSQL configuration
const POSTGRES_CONFIG = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'pms_database',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'superuser'
};

async function checkColumns() {
    const client = new Client(POSTGRES_CONFIG);
    
    try {
        console.log('🔌 Connecting to PostgreSQL...');
        await client.connect();
        console.log('✅ Connected to PostgreSQL');
        
        // Check SubTasks table columns
        console.log('\n📋 SubTasks table columns:');
        const subtasksColumns = await client.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'SubTasks' 
            ORDER BY ordinal_position;
        `);
        
        subtasksColumns.rows.forEach(col => {
            console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
        });
        
        // Check Tasks table columns
        console.log('\n📋 Tasks table columns:');
        const tasksColumns = await client.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'Tasks' 
            ORDER BY ordinal_position;
        `);
        
        tasksColumns.rows.forEach(col => {
            console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
        });
        
        // Check TaskCalendarEvents table columns
        console.log('\n📋 TaskCalendarEvents table columns:');
        const taskCalendarColumns = await client.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'TaskCalendarEvents' 
            ORDER BY ordinal_position;
        `);
        
        taskCalendarColumns.rows.forEach(col => {
            console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
        });
        
    } catch (error) {
        console.error('❌ Check failed:', error.message);
        throw error;
    } finally {
        await client.end();
        console.log('🔌 Database connection closed');
    }
}

// Run the check if this file is executed directly
if (require.main === module) {
    checkColumns()
        .then(() => {
            console.log('✅ Column check completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Column check failed:', error);
            process.exit(1);
        });
}

module.exports = { checkColumns };
