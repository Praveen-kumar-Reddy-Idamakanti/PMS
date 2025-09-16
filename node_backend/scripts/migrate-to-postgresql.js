const sqlite3 = require('sqlite3').verbose();
const { Client } = require('pg');
const path = require('path');
const fs = require('fs');

// Configuration
const SQLITE_DB_PATH = path.join(__dirname, '../data/database.sqlite');
const POSTGRES_CONFIG = {
    host: 'localhost',
    port: 5432,
    database: 'pms_database',
    user: 'postgres',
    password: 'superuser' // Updated password
};

class DatabaseMigrator {
    constructor() {
        this.sqliteDb = null;
        this.pgClient = null;
    }

    async connect() {
        console.log('🔌 Connecting to databases...');
        
        // Connect to SQLite
        this.sqliteDb = new sqlite3.Database(SQLITE_DB_PATH, (err) => {
            if (err) {
                console.error('❌ Error connecting to SQLite:', err.message);
                throw err;
            }
            console.log('✅ Connected to SQLite database');
        });

        // Connect to PostgreSQL
        this.pgClient = new Client(POSTGRES_CONFIG);
        await this.pgClient.connect();
        console.log('✅ Connected to PostgreSQL database');
    }

    async createPostgreSQLTables() {
        console.log('📋 Creating PostgreSQL tables...');
        
        const createTablesSQL = `
            -- Users table (exact match to SQLite)
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                employee_id TEXT UNIQUE,
                role TEXT NOT NULL DEFAULT 'member',
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Attendance table (exact match to SQLite)
            CREATE TABLE IF NOT EXISTS attendance (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                type TEXT NOT NULL CHECK (type IN ('checkin', 'checkout')),
                timestamp TIMESTAMP NOT NULL,
                notes TEXT,
                latitude REAL,
                longitude REAL,
                address TEXT,
                photo TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                mode TEXT CHECK(mode IN ('office', 'remote')) DEFAULT 'office'
            );

            -- User activity table (exact match to SQLite)
            CREATE TABLE IF NOT EXISTS user_activity (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                activity_type TEXT NOT NULL,
                details TEXT,
                ip_address TEXT,
                user_agent TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Admin settings table (exact match to SQLite)
            CREATE TABLE IF NOT EXISTS admin_settings (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                company_name TEXT NOT NULL DEFAULT 'My Company',
                timezone TEXT NOT NULL DEFAULT 'UTC+00:00',
                location_check_in BOOLEAN NOT NULL DEFAULT false,
                photo_check_in BOOLEAN NOT NULL DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id)
            );

            -- Migrations table (exact match to SQLite)
            CREATE TABLE IF NOT EXISTS migrations (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                run_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Remote attendance requests table (exact match to SQLite)
            CREATE TABLE IF NOT EXISTS remote_attendance_requests (
                request_id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                request_date DATE NOT NULL,
                reason TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
                approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
                approved_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                rejected_by INTEGER,
                rejected_at TEXT,
                rejection_reason TEXT,
                UNIQUE(user_id, request_date)
            );

            -- Leave types table (exact match to SQLite)
            CREATE TABLE IF NOT EXISTS leave_types (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL UNIQUE,
                yearly_quota REAL NOT NULL DEFAULT 0,
                monthly_quota REAL NOT NULL DEFAULT 0,
                carry_forward_allowed BOOLEAN NOT NULL DEFAULT false,
                carry_forward_limit REAL NOT NULL DEFAULT 0,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Leave requests table (exact match to SQLite)
            CREATE TABLE IF NOT EXISTS leave_requests (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id),
                leave_type_id INTEGER NOT NULL REFERENCES leave_types(id),
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                reason TEXT,
                status TEXT CHECK(status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
                approved_by INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                days INTEGER
            );

            -- Leave balances table (exact match to SQLite)
            CREATE TABLE IF NOT EXISTS leave_balances (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id),
                leave_type_id INTEGER NOT NULL REFERENCES leave_types(id),
                year INTEGER NOT NULL,
                balance REAL NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, leave_type_id, year)
            );

            -- Holidays table (exact match to SQLite)
            CREATE TABLE IF NOT EXISTS holidays (
                id SERIAL PRIMARY KEY,
                date DATE NOT NULL UNIQUE,
                name TEXT NOT NULL,
                type TEXT DEFAULT 'public',
                created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE SET NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- User daily status table (exact match to SQLite)
            CREATE TABLE IF NOT EXISTS user_daily_status (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id),
                date TEXT NOT NULL,
                status TEXT NOT NULL CHECK(status IN ('present', 'absent', 'leave', 'remote', 'holiday')),
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, date)
            );

            -- Events table (exact match to SQLite)
            CREATE TABLE IF NOT EXISTS events (
                id SERIAL PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT,
                date_time TIMESTAMP NOT NULL,
                location TEXT,
                created_by INTEGER NOT NULL REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                image_url VARCHAR(255)
            );

            -- RSVPs table (exact match to SQLite)
            CREATE TABLE IF NOT EXISTS rsvps (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id),
                event_id INTEGER NOT NULL REFERENCES events(id),
                status TEXT NOT NULL CHECK(status IN ('going', 'interested')),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, event_id)
            );

            -- Tasks table (exact match to SQLite)
            CREATE TABLE IF NOT EXISTS "Tasks" (
                id SERIAL PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT,
                status TEXT NOT NULL DEFAULT 'todo' CHECK(status IN ('todo', 'in-progress', 'review', 'completed')),
                priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
                assignedTo INTEGER REFERENCES users(id) ON DELETE SET NULL,
                assignedBy INTEGER REFERENCES users(id) ON DELETE SET NULL,
                dueDate TIMESTAMP,
                completedAt TIMESTAMP,
                progress INTEGER DEFAULT 0,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- SubTasks table (exact match to SQLite)
            CREATE TABLE IF NOT EXISTS "SubTasks" (
                id SERIAL PRIMARY KEY,
                title TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'todo' CHECK(status IN ('todo', 'in-progress', 'completed')),
                "taskId" INTEGER NOT NULL REFERENCES "Tasks"(id) ON DELETE CASCADE,
                "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed BOOLEAN DEFAULT false,
                assignedTo INTEGER,
                assignedBy INTEGER,
                completedBy INTEGER,
                completedAt TIMESTAMP,
                completionDescription TEXT
            );

            -- Tags table (exact match to SQLite)
            CREATE TABLE IF NOT EXISTS "Tags" (
                id SERIAL PRIMARY KEY,
                name TEXT UNIQUE NOT NULL,
                "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- TaskTags table (exact match to SQLite)
            CREATE TABLE IF NOT EXISTS "TaskTags" (
                "taskId" INTEGER NOT NULL REFERENCES "Tasks"(id) ON DELETE CASCADE,
                "tagId" INTEGER NOT NULL REFERENCES "Tags"(id) ON DELETE CASCADE,
                "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY ("taskId", "tagId")
            );

            -- TaskCalendarEvents table (exact match to SQLite)
            CREATE TABLE IF NOT EXISTS "TaskCalendarEvents" (
                id SERIAL PRIMARY KEY,
                "taskId" INTEGER NOT NULL REFERENCES "Tasks"(id) ON UPDATE CASCADE ON DELETE CASCADE,
                "userId" INTEGER REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
                title TEXT NOT NULL,
                description TEXT,
                "dueDate" TIMESTAMP NOT NULL,
                status TEXT NOT NULL DEFAULT 'task_due',
                "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            -- SequelizeMeta table (for migrations)
            CREATE TABLE IF NOT EXISTS "SequelizeMeta" (
                name VARCHAR(255) NOT NULL PRIMARY KEY
            );

            -- Create indexes (exact match to SQLite)
            CREATE INDEX IF NOT EXISTS idx_admin_settings_user_id ON admin_settings(user_id);
            CREATE INDEX IF NOT EXISTS idx_attendance_timestamp ON attendance(timestamp);
            CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON attendance(user_id);
            CREATE INDEX IF NOT EXISTS idx_leave_requests_user ON leave_requests(user_id, status);
            CREATE INDEX IF NOT EXISTS idx_user_activity_created_at ON user_activity(created_at);
            CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity(user_id);
            CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
            CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
            CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
        `;

        await this.pgClient.query(createTablesSQL);
        console.log('✅ PostgreSQL tables created successfully');
    }

    async getTableNames() {
        return new Promise((resolve, reject) => {
            this.sqliteDb.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'", (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows.map(row => row.name));
                }
            });
        });
    }

    async getTableData(tableName) {
        return new Promise((resolve, reject) => {
            this.sqliteDb.all(`SELECT * FROM ${tableName}`, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async migrateTableData(tableName, data) {
        if (data.length === 0) {
            console.log(`⏭️  Skipping ${tableName} - no data`);
            return;
        }

        console.log(`📦 Migrating ${data.length} records from ${tableName}...`);

        // Column mapping for different table names and structures
        const columnMappings = {
            'Tasks': {
                'assignedTo': 'assignedTo',
                'assignedBy': 'assignedBy',
                'dueDate': 'dueDate',
                'completedAt': 'completedAt',
                'createdAt': 'createdAt',
                'updatedAt': 'updatedAt'
            },
            'SubTasks': {
                'taskId': 'taskId',
                'assignedTo': 'assignedTo',
                'assignedBy': 'assignedBy',
                'completedBy': 'completedBy',
                'completedAt': 'completedAt',
                'completionDescription': 'completionDescription',
                'createdAt': 'createdAt',
                'updatedAt': 'updatedAt'
            },
            'TaskCalendarEvents': {
                'taskId': 'taskId',
                'userId': 'userId',
                'dueDate': 'dueDate',
                'createdAt': 'createdAt',
                'updatedAt': 'updatedAt'
            },
            'TaskTags': {
                'taskId': 'taskId',
                'tagId': 'tagId',
                'createdAt': 'createdAt',
                'updatedAt': 'updatedAt'
            },
            'Tags': {
                'createdAt': 'createdAt',
                'updatedAt': 'updatedAt'
            },
            'remote_attendance_requests': {
                'request_id': 'request_id'
            },
            'SequelizeMeta': {
                'name': 'name'
            }
        };

        // Get column names from first row and apply mappings
        const originalColumns = Object.keys(data[0]);
        const mappedColumns = originalColumns.map(col => {
            const mapping = columnMappings[tableName];
            return mapping && mapping[col] ? mapping[col] : col;
        });

        const placeholders = mappedColumns.map((_, index) => `$${index + 1}`).join(', ');
        const insertSQL = `INSERT INTO ${tableName} (${mappedColumns.join(', ')}) VALUES (${placeholders})`;

        let successCount = 0;
        let errorCount = 0;

        for (const row of data) {
            const values = originalColumns.map(col => row[col]);
            try {
                await this.pgClient.query(insertSQL, values);
                successCount++;
            } catch (error) {
                errorCount++;
                // Only log first few errors to avoid spam
                if (errorCount <= 3) {
                    console.error(`❌ Error inserting into ${tableName}:`, error.message);
                    console.error('Row data:', row);
                }
            }
        }

        if (errorCount > 0) {
            console.log(`⚠️  Migrated ${tableName}: ${successCount} successful, ${errorCount} failed`);
        } else {
            console.log(`✅ Migrated ${tableName} successfully (${successCount} records)`);
        }
    }

    async migrate() {
        try {
            await this.connect();
            
            // Check if tables already exist, if so skip creation
            const existingTables = await this.pgClient.query(`
                SELECT table_name FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            `);
            
            if (existingTables.rows.length === 0) {
                await this.createPostgreSQLTables();
            } else {
                console.log('📋 PostgreSQL tables already exist, skipping creation...');
            }

            const tableNames = await this.getTableNames();
            console.log('📋 Found tables:', tableNames);

            for (const tableName of tableNames) {
                const data = await this.getTableData(tableName);
                await this.migrateTableData(tableName, data);
            }

            console.log('🎉 Migration completed successfully!');

        } catch (error) {
            console.error('❌ Migration failed:', error);
        } finally {
            await this.close();
        }
    }

    async close() {
        if (this.sqliteDb) {
            this.sqliteDb.close();
            console.log('🔌 SQLite connection closed');
        }
        if (this.pgClient) {
            await this.pgClient.end();
            console.log('🔌 PostgreSQL connection closed');
        }
    }
}

// Run migration if this script is executed directly
if (require.main === module) {
    const migrator = new DatabaseMigrator();
    migrator.migrate().catch(console.error);
}

module.exports = DatabaseMigrator;
