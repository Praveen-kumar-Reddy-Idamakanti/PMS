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

// Intercept XMLHttpRequest (used by Axios)
const originalXHROpen = XMLHttpRequest.prototype.open;
const originalXHRSend = XMLHttpRequest.prototype.send;

XMLHttpRequest.prototype.open = function(method: string, url: string | URL, ...args: any[]) {
  this._method = method;
  this._url = url.toString();
  return originalXHROpen.call(this, method, url, ...args);
};

XMLHttpRequest.prototype.send = async function(body?: Document | XMLHttpRequestBodyInit | null) {
  // Check if this is a demo mode API call
  if (import.meta.env.VITE_DEMO_MODE === 'true' && this._url?.includes('/api/')) {
    console.log('Intercepting API call:', this._url);
    
    // Handle login
    if (this._url.includes('/auth/login') && this._method === 'POST') {
      const credentials = JSON.parse(body as string);
      const response = await mockApi.login(credentials);
      
      console.log('Mock login response:', response);
      
      // Simulate successful response
      setTimeout(() => {
        Object.defineProperty(this, 'status', { value: 200 });
        Object.defineProperty(this, 'statusText', { value: 'OK' });
        Object.defineProperty(this, 'responseText', { value: JSON.stringify(response) });
        Object.defineProperty(this, 'readyState', { value: 4 });
        
        console.log('Sending mock response to app:', response);
        
        if (this.onreadystatechange) {
          this.onreadystatechange(new Event('readystatechange') as any);
        }
      }, 100);
      
      return;
    }
    
    // Handle other API calls
    if (this._url.includes('/tasks')) {
      const response = mockApi.getTasks();
      
      setTimeout(() => {
        Object.defineProperty(this, 'status', { value: 200 });
        Object.defineProperty(this, 'statusText', { value: 'OK' });
        Object.defineProperty(this, 'responseText', { value: JSON.stringify(response) });
        Object.defineProperty(this, 'readyState', { value: 4 });
        
        if (this.onreadystatechange) {
          this.onreadystatechange(new Event('readystatechange') as any);
        }
      }, 100);
      
      return;
    }
    
    if (this._url.includes('/events')) {
      const response = mockApi.getEvents();
      
      setTimeout(() => {
        Object.defineProperty(this, 'status', { value: 200 });
        Object.defineProperty(this, 'statusText', { value: 'OK' });
        Object.defineProperty(this, 'responseText', { value: JSON.stringify(response) });
        Object.defineProperty(this, 'readyState', { value: 4 });
        
        if (this.onreadystatechange) {
          this.onreadystatechange(new Event('readystatechange') as any);
        }
      }, 100);
      
      return;
    }
    
    // Handle user profile
    if (this._url.includes('/users/profile')) {
      const response = {
        id: '1',
        name: 'John Doe',
        email: 'demo@mail.com',
        employeeId: 'EMP001',
        role: 'employee',
        department: 'Engineering',
        position: 'Software Developer'
      };
      
      setTimeout(() => {
        Object.defineProperty(this, 'status', { value: 200 });
        Object.defineProperty(this, 'statusText', { value: 'OK' });
        Object.defineProperty(this, 'responseText', { value: JSON.stringify(response) });
        Object.defineProperty(this, 'readyState', { value: 4 });
        
        if (this.onreadystatechange) {
          this.onreadystatechange(new Event('readystatechange') as any);
        }
      }, 100);
      
      return;
    }
    
    // Handle attendance
    if (this._url.includes('/attendance')) {
      const response = [
        {
          id: '1',
          userId: '1',
          date: new Date().toISOString().split('T')[0],
          checkIn: '09:00:00',
          checkOut: null,
          status: 'present',
          totalHours: 0
        }
      ];
      
      setTimeout(() => {
        Object.defineProperty(this, 'status', { value: 200 });
        Object.defineProperty(this, 'statusText', { value: 'OK' });
        Object.defineProperty(this, 'responseText', { value: JSON.stringify(response) });
        Object.defineProperty(this, 'readyState', { value: 4 });
        
        if (this.onreadystatechange) {
          this.onreadystatechange(new Event('readystatechange') as any);
        }
      }, 100);
      
      return;
    }
    
    // Handle leave balances
    if (this._url.includes('/leave-balances')) {
      const response = {
        annual: 20,
        sick: 10,
        personal: 5,
        used: {
          annual: 2,
          sick: 1,
          personal: 0
        }
      };
      
      setTimeout(() => {
        Object.defineProperty(this, 'status', { value: 200 });
        Object.defineProperty(this, 'statusText', { value: 'OK' });
        Object.defineProperty(this, 'responseText', { value: JSON.stringify(response) });
        Object.defineProperty(this, 'readyState', { value: 4 });
        
        if (this.onreadystatechange) {
          this.onreadystatechange(new Event('readystatechange') as any);
        }
      }, 100);
      
      return;
    }
    
    // Handle leave requests
    if (this._url.includes('/leave-requests')) {
      const response = [];
      
      setTimeout(() => {
        Object.defineProperty(this, 'status', { value: 200 });
        Object.defineProperty(this, 'statusText', { value: 'OK' });
        Object.defineProperty(this, 'responseText', { value: JSON.stringify(response) });
        Object.defineProperty(this, 'readyState', { value: 4 });
        
        if (this.onreadystatechange) {
          this.onreadystatechange(new Event('readystatechange') as any);
        }
      }, 100);
      
      return;
    }
    
    // Handle admin settings
    if (this._url.includes('/admin/settings')) {
      const response = {
        companyName: 'Demo Company',
        workingHours: 8,
        timezone: 'UTC'
      };
      
      setTimeout(() => {
        Object.defineProperty(this, 'status', { value: 200 });
        Object.defineProperty(this, 'statusText', { value: 'OK' });
        Object.defineProperty(this, 'responseText', { value: JSON.stringify(response) });
        Object.defineProperty(this, 'readyState', { value: 4 });
        
        if (this.onreadystatechange) {
          this.onreadystatechange(new Event('readystatechange') as any);
        }
      }, 100);
      
      return;
    }
    
    // Handle activity logs
    if (this._url.includes('/activity-logs')) {
      const response = [
        {
          id: '1',
          userId: '1',
          action: 'login',
          description: 'User logged in successfully',
          timestamp: new Date().toISOString()
        }
      ];
      
      setTimeout(() => {
        Object.defineProperty(this, 'status', { value: 200 });
        Object.defineProperty(this, 'statusText', { value: 'OK' });
        Object.defineProperty(this, 'responseText', { value: JSON.stringify(response) });
        Object.defineProperty(this, 'readyState', { value: 4 });
        
        if (this.onreadystatechange) {
          this.onreadystatechange(new Event('readystatechange') as any);
        }
      }, 100);
      
      return;
    }
    
    // Handle common post-login API calls
    if (this._url.includes('/dashboard') || this._url.includes('/stats')) {
      const response = {
        totalTasks: 5,
        completedTasks: 2,
        pendingTasks: 3,
        attendance: { present: 20, absent: 2 },
        leaveBalance: { annual: 18, sick: 9, personal: 5 }
      };
      
      setTimeout(() => {
        Object.defineProperty(this, 'status', { value: 200 });
        Object.defineProperty(this, 'statusText', { value: 'OK' });
        Object.defineProperty(this, 'responseText', { value: JSON.stringify(response) });
        Object.defineProperty(this, 'readyState', { value: 4 });
        
        console.log('Dashboard/Stats response:', response);
        
        if (this.onreadystatechange) {
          this.onreadystatechange(new Event('readystatechange') as any);
        }
      }, 100);
      
      return;
    }
    
    // Handle user profile calls
    if (this._url.includes('/users/') && !this._url.includes('/users/profile')) {
      const response = {
        id: '1',
        name: 'John Doe',
        email: 'demo@mail.com',
        employeeId: 'EMP001',
        role: 'employee',
        department: 'Engineering',
        position: 'Software Developer'
      };
      
      setTimeout(() => {
        Object.defineProperty(this, 'status', { value: 200 });
        Object.defineProperty(this, 'statusText', { value: 'OK' });
        Object.defineProperty(this, 'responseText', { value: JSON.stringify(response) });
        Object.defineProperty(this, 'readyState', { value: 4 });
        
        console.log('User profile response:', response);
        
        if (this.onreadystatechange) {
          this.onreadystatechange(new Event('readystatechange') as any);
        }
      }, 100);
      
      return;
    }
    
    // Catch-all for any other API calls
    console.log('Unhandled API call:', this._url, 'Method:', this._method);
    
    // Provide appropriate default responses based on URL pattern
    let defaultResponse;
    if (this._url.includes('/users/') || this._url.includes('/profile')) {
      defaultResponse = {
        id: '1',
        name: 'John Doe',
        email: 'demo@mail.com',
        employeeId: 'EMP001',
        role: 'employee',
        department: 'Engineering',
        position: 'Software Developer'
      };
    } else if (this._url.includes('/dashboard') || this._url.includes('/stats')) {
      defaultResponse = {
        totalTasks: 5,
        completedTasks: 2,
        pendingTasks: 3,
        attendance: { present: 20, absent: 2 },
        leaveBalance: { annual: 18, sick: 9, personal: 5 }
      };
    } else {
      defaultResponse = { success: true, message: 'Mock response', data: [] };
    }
    
    setTimeout(() => {
      Object.defineProperty(this, 'status', { value: 200 });
      Object.defineProperty(this, 'statusText', { value: 'OK' });
      Object.defineProperty(this, 'responseText', { value: JSON.stringify(defaultResponse) });
      Object.defineProperty(this, 'readyState', { value: 4 });
      
      console.log('Sending default response for:', this._url, defaultResponse);
      
      if (this.onreadystatechange) {
        this.onreadystatechange(new Event('readystatechange') as any);
      }
    }, 100);
    
    return;
  }
  
  // For non-demo or non-API calls, use original send
  return originalXHRSend.call(this, body);
};

console.log('Simple mock API interceptor loaded (XMLHttpRequest)');
