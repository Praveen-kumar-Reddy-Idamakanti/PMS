const cron = require('node-cron');
const { updateDailyStatus } = require('./dailyStatusUpdate');

// Schedule the daily status update to run at 9:50 PM every day
function scheduleDailyStatusUpdate() {
    cron.schedule('08 22 * * *', async () => {
        console.log(`[${new Date().toISOString()}] Running daily status update job`);
        try {
            await updateDailyStatus();
        } catch (error) {
            console.error('Error in daily status update job:', error);
        }
    });
    
    console.log('Daily status update job scheduled to run at 9:50 PM daily');
}

module.exports = {
    scheduleDailyStatusUpdate
};
