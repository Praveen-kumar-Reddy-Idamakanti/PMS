// node_backend/scripts/run-daily-status-update.js
require('dotenv').config();
const { connectDB, closeDB } = require('../src/config/db');
const { updateDailyStatus } = require('../src/jobs/dailyStatusUpdate');

async function run() {
    try {
        // Connect to the database first
        console.log('Connecting to database...');
        await connectDB();
        
        // Run the status update
        await updateDailyStatus();
        console.log('Daily status update completed successfully');
    } catch (error) {
        console.error('Error running daily status update:', error);
        process.exit(1);
    } finally {
        // Close the database connection when done
        await closeDB();
        process.exit(0);
    }
}

run();