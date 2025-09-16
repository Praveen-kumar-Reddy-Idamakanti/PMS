const { Client } = require('pg');

// PostgreSQL configuration
const POSTGRES_CONFIG = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'pms_database',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'superuser'
};

async function fixSequences() {
    const client = new Client(POSTGRES_CONFIG);
    
    try {
        console.log('🔌 Connecting to PostgreSQL...');
        await client.connect();
        console.log('✅ Connected to PostgreSQL');
        
        // Get all tables with SERIAL columns
        const tablesQuery = `
            SELECT 
                t.table_name,
                c.column_name,
                c.column_default
            FROM information_schema.tables t
            JOIN information_schema.columns c ON t.table_name = c.table_name
            WHERE t.table_schema = 'public'
            AND c.column_default LIKE 'nextval%'
            ORDER BY t.table_name, c.column_name;
        `;
        
        const tables = await client.query(tablesQuery);
        console.log('📋 Found tables with sequences:', tables.rows.length);
        
        for (const table of tables.rows) {
            const tableName = table.table_name;
            const columnName = table.column_name;
            
            console.log(`🔧 Fixing sequence for ${tableName}.${columnName}...`);
            
            // Get the current max value from the table
            const maxQuery = `SELECT COALESCE(MAX("${columnName}"), 0) as max_val FROM "${tableName}"`;
            const maxResult = await client.query(maxQuery);
            const maxVal = parseInt(maxResult.rows[0].max_val) || 0;
            
            // Get the sequence name from the column default
            const sequenceName = table.column_default.match(/nextval\('([^']+)'/)[1];
            
            // Set the sequence to start from max + 1
            const nextVal = maxVal + 1;
            const fixSequenceQuery = `SELECT setval('${sequenceName}', ${nextVal}, false)`;
            
            await client.query(fixSequenceQuery);
            console.log(`✅ Fixed sequence ${sequenceName} to start from ${nextVal}`);
        }
        
        console.log('🎉 All sequences fixed successfully!');
        
    } catch (error) {
        console.error('❌ Fix failed:', error.message);
        throw error;
    } finally {
        await client.end();
        console.log('🔌 Database connection closed');
    }
}

// Run the fix if this file is executed directly
if (require.main === module) {
    fixSequences()
        .then(() => {
            console.log('✅ Sequence fix completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Sequence fix failed:', error);
            process.exit(1);
        });
}

module.exports = { fixSequences };
