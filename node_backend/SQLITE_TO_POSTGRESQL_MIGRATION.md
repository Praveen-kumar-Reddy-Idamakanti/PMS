# SQLite to PostgreSQL Migration Guide

This guide will help you migrate your PMS application from SQLite to PostgreSQL.

## Prerequisites

1. ✅ PostgreSQL installed (you already have this)
2. ✅ Node.js packages installed (`pg` and `pg-hstore`)

## Step 1: Create PostgreSQL Database

1. Open Command Prompt or PowerShell as Administrator
2. Connect to PostgreSQL:
   ```bash
   psql -U postgres
   ```
3. Create the database:
   ```sql
   CREATE DATABASE pms_database;
   \q
   ```

## Step 2: Configure Environment Variables

1. Create a `.env` file in the `node_backend` directory:
   ```bash
   # Database Configuration
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=pms_database
   DB_USER=postgres
   DB_PASSWORD=your_postgresql_password
   
   # JWT Configuration
   JWT_SECRET=your_jwt_secret_here
   
   # Server Configuration
   PORT=5000
   NODE_ENV=development
   ```

2. Replace `your_postgresql_password` with your actual PostgreSQL password

## Step 3: Run the Migration

1. Navigate to the backend directory:
   ```bash
   cd node_backend
   ```

2. Run the migration script:
   ```bash
   node scripts/run-migration.js
   ```

   This will:
   - Read all data from your SQLite database
   - Create PostgreSQL tables with proper structure
   - Migrate all your existing data

## Step 4: Switch to PostgreSQL

1. Add this line to your `.env` file:
   ```
   DB_TYPE=postgresql
   ```

2. Restart your application:
   ```bash
   npm start
   ```

## Step 5: Verify Migration

1. Check that your application starts without errors
2. Test login functionality
3. Verify that all your data is accessible
4. Check that new records can be created

## Troubleshooting

### Common Issues:

1. **Connection refused**: Make sure PostgreSQL service is running
2. **Authentication failed**: Check your PostgreSQL password
3. **Database doesn't exist**: Run the CREATE DATABASE command
4. **Permission denied**: Make sure your PostgreSQL user has proper permissions

### Rollback to SQLite:

If you need to rollback to SQLite:
1. Remove `DB_TYPE=postgresql` from your `.env` file
2. Restart your application

## Database Schema

The migration creates the following tables:
- `users` - User accounts and authentication
- `attendance` - Daily attendance records
- `leave_requests` - Leave applications
- `leave_types` - Types of leave (sick, vacation, etc.)
- `leave_balances` - Annual leave balances per user
- `tasks` - Project tasks
- `subtasks` - Task subtasks
- `events` - Calendar events
- `rsvps` - Event RSVPs
- `holidays` - Public holidays
- `admin_settings` - System configuration
- `activity_logs` - User activity tracking
- `remote_attendance_requests` - Remote work requests

## Performance Benefits

PostgreSQL offers several advantages over SQLite:
- Better concurrent access
- Advanced indexing options
- Better data integrity
- Scalability for larger datasets
- Advanced query optimization

## Support

If you encounter any issues during migration, check:
1. PostgreSQL service status
2. Database connection settings
3. User permissions
4. Network connectivity
