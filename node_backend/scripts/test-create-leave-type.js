const axios = require('axios');

async function createLeaveType() {
  try {
    const response = await axios.post('http://localhost:5001/api/leave-types', {
      name: 'Test Leave',
      yearly_quota: 10
    });
    console.log('Response:', response.data);
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  }
}

createLeaveType();
