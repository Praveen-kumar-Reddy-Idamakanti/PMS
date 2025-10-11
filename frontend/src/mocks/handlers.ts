import { http, HttpResponse } from 'msw';

// Mock data for demo
const mockUser = {
  id: '1',
  name: 'John Doe',
  email: 'john.doe@company.com',
  employeeId: 'EMP001',
  role: 'employee',
  department: 'Engineering',
  position: 'Software Developer'
};

const mockTasks = [
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
      },
      {
        id: '2',
        title: 'Write user guide',
        description: 'Create step-by-step user guide',
        status: 'in_progress',
        assignedTo: '1',
        assignedBy: '1',
        dueDate: '2024-01-15'
      }
    ]
  },
  {
    id: '2',
    title: 'Code review for new feature',
    description: 'Review the implementation of the new authentication system',
    status: 'pending',
    priority: 'medium',
    assignedTo: '1',
    assignedBy: '1',
    dueDate: '2024-01-20',
    createdAt: '2024-01-05T00:00:00Z',
    updatedAt: '2024-01-05T00:00:00Z',
    subtasks: []
  }
];

const mockEvents = [
  {
    id: '1',
    title: 'Team Meeting',
    description: 'Weekly team standup',
    start: '2024-01-15T10:00:00Z',
    end: '2024-01-15T11:00:00Z',
    type: 'meeting',
    createdBy: '1'
  },
  {
    id: '2',
    title: 'Project Deadline',
    description: 'Final submission for Q1 project',
    start: '2024-01-20T17:00:00Z',
    end: '2024-01-20T17:00:00Z',
    type: 'deadline',
    createdBy: '1'
  }
];

const mockAttendance = [
  {
    id: '1',
    userId: '1',
    date: '2024-01-15',
    checkIn: '09:00:00',
    checkOut: '18:00:00',
    status: 'present',
    totalHours: 9
  }
];

export const handlers = [
  // Auth endpoints
  http.post('/api/auth/login', () => {
    return HttpResponse.json({
      success: true,
      token: 'mock-jwt-token',
      user: mockUser
    });
  }),

  http.post('/api/auth/logout', () => {
    return HttpResponse.json({ success: true });
  }),

  // User endpoints
  http.get('/api/users/profile', () => {
    return HttpResponse.json(mockUser);
  }),

  // Task endpoints
  http.get('/api/tasks', () => {
    return HttpResponse.json(mockTasks);
  }),

  http.get('/api/tasks/:id', ({ params }) => {
    const task = mockTasks.find(t => t.id === params.id);
    if (!task) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json(task);
  }),

  http.post('/api/tasks', async ({ request }) => {
    const newTask = await request.json();
    const task = {
      id: String(mockTasks.length + 1),
      ...newTask,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    mockTasks.push(task);
    return HttpResponse.json(task);
  }),

  http.put('/api/tasks/:id', async ({ params, request }) => {
    const updates = await request.json();
    const taskIndex = mockTasks.findIndex(t => t.id === params.id);
    if (taskIndex === -1) {
      return new HttpResponse(null, { status: 404 });
    }
    mockTasks[taskIndex] = { ...mockTasks[taskIndex], ...updates, updatedAt: new Date().toISOString() };
    return HttpResponse.json(mockTasks[taskIndex]);
  }),

  http.delete('/api/tasks/:id', ({ params }) => {
    const taskIndex = mockTasks.findIndex(t => t.id === params.id);
    if (taskIndex === -1) {
      return new HttpResponse(null, { status: 404 });
    }
    mockTasks.splice(taskIndex, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  // Subtask endpoints
  http.post('/api/tasks/:taskId/subtasks', async ({ params, request }) => {
    const subtask = await request.json();
    const task = mockTasks.find(t => t.id === params.taskId);
    if (!task) {
      return new HttpResponse(null, { status: 404 });
    }
    const newSubtask = {
      id: String(task.subtasks.length + 1),
      ...subtask,
      createdAt: new Date().toISOString()
    };
    task.subtasks.push(newSubtask);
    return HttpResponse.json(newSubtask);
  }),

  // Calendar/Event endpoints
  http.get('/api/events', () => {
    return HttpResponse.json(mockEvents);
  }),

  http.post('/api/events', async ({ request }) => {
    const newEvent = await request.json();
    const event = {
      id: String(mockEvents.length + 1),
      ...newEvent,
      createdBy: '1'
    };
    mockEvents.push(event);
    return HttpResponse.json(event);
  }),

  // Attendance endpoints
  http.get('/api/attendance', () => {
    return HttpResponse.json(mockAttendance);
  }),

  http.post('/api/attendance/checkin', () => {
    return HttpResponse.json({
      success: true,
      message: 'Checked in successfully',
      checkInTime: new Date().toISOString()
    });
  }),

  http.post('/api/attendance/checkout', () => {
    return HttpResponse.json({
      success: true,
      message: 'Checked out successfully',
      checkOutTime: new Date().toISOString()
    });
  }),

  // Leave endpoints
  http.get('/api/leave-requests', () => {
    return HttpResponse.json([]);
  }),

  http.get('/api/leave-balances', () => {
    return HttpResponse.json({
      annual: 20,
      sick: 10,
      personal: 5,
      used: {
        annual: 2,
        sick: 1,
        personal: 0
      }
    });
  }),

  // Admin endpoints
  http.get('/api/admin/users', () => {
    return HttpResponse.json([mockUser]);
  }),

  http.get('/api/admin/settings', () => {
    return HttpResponse.json({
      companyName: 'Demo Company',
      workingHours: 8,
      timezone: 'UTC'
    });
  }),

  // Activity logs
  http.get('/api/activity-logs', () => {
    return HttpResponse.json([
      {
        id: '1',
        userId: '1',
        action: 'task_created',
        description: 'Created new task: Complete project documentation',
        timestamp: '2024-01-10T10:00:00Z'
      }
    ]);
  })
];
