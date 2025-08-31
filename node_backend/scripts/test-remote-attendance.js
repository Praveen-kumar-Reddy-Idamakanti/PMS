const { db, connectDB } = require('../src/config/db');
const controller = require('../src/controllers/remoteAttendanceController');

async function testController() {
  try {
    await connectDB();
    
    // Test getPendingRequests
    console.log('Testing getPendingRequests...');
    const mockReq = { user: { id: 1 } };
    const mockRes = {
      json: (data) => console.log('getPendingRequests result:', data),
      status: function(code) {
        this.statusCode = code;
        return this;
      }
    };
    
    await controller.getPendingRequests(mockReq, mockRes);
    
    console.log('All tests completed');
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    // Close the database connection if needed
    if (db) {
      db.close();
    }
  }
}

testController();
