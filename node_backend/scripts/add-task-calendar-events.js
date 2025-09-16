const { Client } = require('pg');

// PostgreSQL configuration
const POSTGRES_CONFIG = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'pms_database',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'superuser'
};

async function addTaskCalendarEventsTable() {
    const client = new Client(POSTGRES_CONFIG);
    
    try {
        console.log('🔌 Connecting to PostgreSQL...');
        await client.connect();
        console.log('✅ Connected to PostgreSQL');
        
        // Check if table already exists
        const checkTableQuery = `
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'TaskCalendarEvents'
            );
        `;
        
        const tableExists = await client.query(checkTableQuery);
        
        if (tableExists.rows[0].exists) {
            console.log('⚠️  TaskCalendarEvents table already exists, skipping creation');
            return;
        }
        
        console.log('📋 Creating TaskCalendarEvents table...');
        
        // Create TaskCalendarEvents table
        const createTableQuery = `
            CREATE TABLE "TaskCalendarEvents" (
                id SERIAL PRIMARY KEY,
                "taskId" INTEGER NOT NULL,
                "userId" INTEGER,
                title TEXT NOT NULL,
                description TEXT,
                "dueDate" TIMESTAMP NOT NULL,
                status TEXT NOT NULL DEFAULT 'task_due',
                "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY ("taskId") REFERENCES "Tasks"(id) ON UPDATE CASCADE ON DELETE CASCADE,
                FOREIGN KEY ("userId") REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL
            );
        `;
        
        await client.query(createTableQuery);
        console.log('✅ TaskCalendarEvents table created successfully');
        
        // Create indexes for better performance
        console.log('📋 Creating indexes...');
        
        const createIndexesQuery = `
            CREATE INDEX IF NOT EXISTS idx_taskcalendarevents_userid ON "TaskCalendarEvents"("userId");
            CREATE INDEX IF NOT EXISTS idx_taskcalendarevents_taskid ON "TaskCalendarEvents"("taskId");
            CREATE INDEX IF NOT EXISTS idx_taskcalendarevents_duedate ON "TaskCalendarEvents"("dueDate");
            CREATE INDEX IF NOT EXISTS idx_taskcalendarevents_status ON "TaskCalendarEvents"(status);
        `;
        
        await client.query(createIndexesQuery);
        console.log('✅ Indexes created successfully');
        
        console.log('🎉 TaskCalendarEvents table migration completed successfully!');
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        throw error;
    } finally {
        await client.end();
        console.log('🔌 Database connection closed');
    }
}

// Run the migration if this file is executed directly
if (require.main === module) {
    addTaskCalendarEventsTable()
        .then(() => {
            console.log('✅ Migration completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Migration failed:', error);
            process.exit(1);
        });
}

module.exports = { addTaskCalendarEventsTable };
