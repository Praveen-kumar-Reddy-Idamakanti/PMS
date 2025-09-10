const axios = require('axios');

const API_BASE_URL = 'http://localhost:5001/api';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjo0NSwibmFtZSI6InN1cGVyX2FkbWluXzNAbWFpbC5jb20iLCJlbWFpbCI6InN1cGVyX2FkbWluXzNAbWFpbC5jb20iLCJlbXBsb3llZUlkIjoic3VwZXJfYWRtaW5fM0BtYWlsLmNvbSIsInJvbGUiOiJzdXBlcl9hZG1pbiJ9LCJpYXQiOjE3NTc1MDM5MDAsImV4cCI6MTc1NzU5MDMwMH0.ecWx2M0DlC6bHHsCYujfVHlYIiWpE27BCGRfCiUfCiI';

async function createTask() {
    try {
        const response = await axios.post(
            `${API_BASE_URL}/tasks`,
            {
                title: 'Test Task',
                description: 'This is a test task created by the agent.',
                dueDate: '2025-09-15',
                priority: 'High',
                assignedTo: [45]
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${TOKEN}`
                }
            }
        );
        console.log('Task created successfully:', response.data);
    } catch (error) {
        console.error('Error creating task:', error.response ? error.response.data : error.message);
    }
}

createTask();
