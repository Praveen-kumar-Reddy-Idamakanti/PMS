const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const CONFIG = {
  API_BASE_URL: 'http://localhost:5001/api',
  TOKEN: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoyLCJuYW1lIjoiQWRtaW4gVXNlciIsImVtYWlsIjoic3VwZXJfYWRtaW5AZXhhbXBsZS5jb20iLCJlbXBsb3llZUlkIjpudWxsLCJyb2xlIjoic3VwZXJfYWRtaW4ifSwiaWF0IjoxNzU2NTc1MjQyLCJleHAiOjE3NTY2NjE2NDJ9.4aXXH1NR0P6A6pJZ_fURI7jA5oMC0BZi7yyole-8gxs',  // Replace with your actual token
  USER_ID: 2,  // User ID to create attendance for
  BASE_IMAGE_PATH: path.join(__dirname, 'sample-image.jpg')  // Path to a sample image
};

// Sample base64 image (1x1 transparent pixel)
const SAMPLE_IMAGE = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

class AttendanceManager {
  constructor(config) {
    this.config = config;
    this.axios = axios.create({
      baseURL: config.API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.TOKEN}`
      }
    });
  }

  /**
   * Check if attendance record exists for a specific date and type
   */
  async checkExistingRecord(date, type) {
    try {
      const response = await this.axios.get(`/attendance/records?date=${date}`);
      return response.data.data.some(record => record.type === type);
    } catch (error) {
      console.error(`Error checking ${type} record for ${date}:`, error.message);
      return false;
    }
  }

  /**
   * Create an attendance record
   */
  async createRecord(date, type) {
    const timestamp = `${date}T${type === 'checkin' ? '09:00:00' : '18:00:00'}`;
    
    // Check if record already exists
    const exists = await this.checkExistingRecord(date, type);
    if (exists) {
      console.log(`ℹ️  ${type.toUpperCase()} ${timestamp} - Already exists`);
      return { success: true, exists: true };
    }

    const recordData = {
      user_id: this.config.USER_ID,
      type,
      notes: type === 'checkin' ? 'Morning check-in' : 'Evening check-out',
      location: {
        latitude: 12.9716 + (Math.random() * 0.02 - 0.01),  // Random variation
        longitude: 77.5946 + (Math.random() * 0.02 - 0.01),
        address: 'Bengaluru, India'
      },
      photo: SAMPLE_IMAGE,
      timestamp
    };

    try {
      await this.axios.post(`/attendance/${type}`, recordData);
      console.log(`✅ ${type.toUpperCase()} ${timestamp} - Created`);
      return { success: true, created: true };
    } catch (error) {
      console.error(`❌ ${type.toUpperCase()} ${timestamp} - Failed:`, 
        error.response?.data?.message || error.message);
      return { success: false, error: error.response?.data };
    }
  }

  /**
   * Generate attendance for a date range
   */
  async generateAttendance(startDate, endDate) {
    const current = new Date(startDate);
    const end = new Date(endDate);
    
    while (current <= end) {
      // Skip weekends
      if (current.getDay() !== 0 && current.getDay() !== 6) {
        const dateStr = current.toISOString().split('T')[0];
        
        // Create check-in
        await this.createRecord(dateStr, 'checkin');
        
        // Create check-out
        await this.createRecord(dateStr, 'checkout');
      } else {
        console.log(`⏸️  Skipped weekend: ${current.toISOString().split('T')[0]}`);
      }
      
      // Move to next day
      current.setDate(current.getDate() + 1);
    }
    
    console.log('\n✅ Attendance generation completed!');
  }
}

// Main function
async function main() {
  const manager = new AttendanceManager(CONFIG);
  
  // Set date range (last 30 days)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 30);
  
  console.log(`Generating attendance from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}\n`);
  
  await manager.generateAttendance(
    startDate.toISOString().split('T')[0],
    endDate.toISOString().split('T')[0]
  );
}

// Run the script
main().catch(console.error);
