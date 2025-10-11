// Simple mock API without service workers
export const mockApi = {
  login: async (credentials: any) => {
    console.log('Using simple mock login for:', credentials.email);
    return {
      success: true,
      token: 'mock-jwt-token-' + Date.now(),
      user: {
        id: '1',
        name: 'John Doe',
        email: credentials.email,
        employeeId: 'EMP001',
        role: 'employee',
        department: 'Engineering',
        position: 'Software Developer'
      }
    };
  },
  
  getTasks: async () => {
    console.log('Using simple mock tasks');
    return [
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
    ];
  },
  
  getEvents: async () => {
    console.log('Using simple mock events');
    return [
      {
        id: '1',
        title: 'Team Meeting',
        description: 'Weekly team standup',
        start: '2024-01-15T10:00:00Z',
        end: '2024-01-15T11:00:00Z',
        type: 'meeting',
        createdBy: '1'
      }
    ];
  }
};

// Intercept fetch requests
const originalFetch = window.fetch;
window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input.toString();
  
  // Check if this is a demo mode API call
  if (import.meta.env.VITE_DEMO_MODE === 'true' && url.includes('/api/')) {
    console.log('Intercepting API call:', url);
    
    // Handle login
    if (url.includes('/auth/login') && init?.method === 'POST') {
      const body = JSON.parse(init.body as string);
      const response = await mockApi.login(body);
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Handle other API calls
    if (url.includes('/tasks')) {
      const response = await mockApi.getTasks();
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (url.includes('/events')) {
      const response = await mockApi.getEvents();
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
  
  // For non-demo or non-API calls, use original fetch
  return originalFetch(input, init);
};

console.log('Simple mock API interceptor loaded');
