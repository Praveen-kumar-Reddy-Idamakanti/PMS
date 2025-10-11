// Fallback mock data when MSW is not available
export const fallbackData = {
  user: {
    id: '1',
    name: 'John Doe',
    email: 'john.doe@company.com',
    employeeId: 'EMP001',
    role: 'employee',
    department: 'Engineering',
    position: 'Software Developer'
  },
  tasks: [
    {
      id: '1',
      title: 'Complete project documentation',
      description: 'Write comprehensive documentation for the new feature',
      status: 'in_progress',
      priority: 'high',
      assignedTo: '1',
      assignedBy: '1',
      dueDate: '2024-01-15',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-10T00:00:00Z',
      subtasks: [
        {
          id: '1',
          title: 'Create API documentation',
          description: 'Document all API endpoints',
          status: 'completed',
          assignedTo: '1',
          assignedBy: '1',
          dueDate: '2024-01-12',
          completedAt: '2024-01-11T00:00:00Z'
        }
      ]
    }
  ],
  events: [
    {
      id: '1',
      title: 'Team Meeting',
      description: 'Weekly team standup',
      start: '2024-01-15T10:00:00Z',
      end: '2024-01-15T11:00:00Z',
      type: 'meeting',
      createdBy: '1'
    }
  ]
};

// Simple mock API functions
export const mockApi = {
  login: async (credentials: any) => {
    console.log('Using fallback mock login');
    return {
      success: true,
      token: 'mock-jwt-token',
      user: fallbackData.user
    };
  },
  getTasks: async () => {
    console.log('Using fallback mock tasks');
    return fallbackData.tasks;
  },
  getEvents: async () => {
    console.log('Using fallback mock events');
    return fallbackData.events;
  }
};
