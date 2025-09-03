const axios = require('axios');

async function createLeaveRequest() {
  try {
    const response = await axios.post('http://localhost:5001/api/leave-requests', {
      user_id: 1,
      leave_type_id: 1,
      start_date: '2025-09-10',
      end_date: '2025-09-11',
      reason: 'Family event'
    });
    console.log('Response:', response.data);
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  }
}

createLeaveRequest();
