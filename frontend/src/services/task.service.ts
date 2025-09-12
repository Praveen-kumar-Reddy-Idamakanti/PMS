import { fetchWithAuth } from '../lib/api';

export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  status: 'todo' | 'in-progress' | 'review' | 'completed';
  priority: 'low' | 'medium' | 'high';
  tags?: Tag[];
  subtasks?: Subtask[];
  assignedTo?: number;
  assignedBy?: number;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  assignedTo?: number;
  assignedBy?: number;
  completedBy?: number;
  completedAt?: string;
  completionDescription?: string; // New field
}

export interface Tag {
  id: string;
  name: string;
}

export interface ActivityLog {
  id: string;
  userId: number;
  activityType: string;
  details: Record<string, any>;
  timestamp: string;
  user?: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
}

const taskService = {
  getAllTasks: async (): Promise<Task[]> => {
    const response = await fetchWithAuth('/tasks');
    return response.json();
  },

  getTaskById: async (id: string): Promise<Task> => {
    const response = await fetchWithAuth(`/tasks/${id}`);
    return response.json();
  },

  createTask: async (task: Omit<Task, 'id' | 'tags' | 'subtasks'>): Promise<Task> => {
    const response = await fetchWithAuth('/tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    });
    return response.json();
  },

  updateTask: async (id: string, task: Partial<Task>): Promise<Task> => {
    const response = await fetchWithAuth(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(task),
    });
    return response.json();
  },

  deleteTask: async (id: string): Promise<void> => {
    await fetchWithAuth(`/tasks/${id}`, {
      method: 'DELETE',
    });
  },

  // Subtask operations
  createSubtask: async (taskId: string, subtask: Omit<Subtask, 'id'>): Promise<Subtask> => {
    console.log("createSubtask", taskId, subtask);
    
    // Ensure assignedBy is included in the request body
    const requestBody = {
      ...subtask,
      assignedBy: subtask.assignedBy || undefined // Ensure it's not null
    };
    
    console.log("Sending subtask data:", requestBody);
    
    const response = await fetchWithAuth(`/tasks/${taskId}/subtasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody),
    });
    
    const responseData = await response.json();
    console.log("Received response:", responseData);
    return responseData;
  },

  updateSubtask: async (taskId: string, subtaskId: string, subtask: Partial<Subtask>): Promise<Subtask> => {
    console.log("updateSubtask",taskId, subtaskId, subtask);
    const response = await fetchWithAuth(`/tasks/${taskId}/subtasks/${subtaskId}`, {
      method: 'PUT',
      body: JSON.stringify(subtask),
    });
    return response.json();
  },

  deleteSubtask: async (taskId: string, subtaskId: string): Promise<void> => {
    await fetchWithAuth(`/tasks/${taskId}/subtasks/${subtaskId}`, {
      method: 'DELETE',
    });
  },

  // Tag operations
  addTagToTask: async (taskId: string, tagId: string): Promise<Task> => {
    const response = await fetchWithAuth(`/tasks/${taskId}/tags`, {
      method: 'POST',
      body: JSON.stringify({ tagId }),
    });
    return response.json();
  },

  removeTagFromTask: async (taskId: string, tagId: string): Promise<Task> => {
    const response = await fetchWithAuth(`/tasks/${taskId}/tags/${tagId}`, {
      method: 'DELETE',
    });
    return response.json();
  },

  // Activity Logs
  getActivityLogs: async (taskId: string): Promise<ActivityLog[]> => {
    const response = await fetchWithAuth(`/tasks/${taskId}/activity-logs`);
    return response.json();
  },

  getRecentActivity: async (limit: number = 10): Promise<ActivityLog[]> => {
    const response = await fetchWithAuth(`/activity-logs?limit=${limit}`);
    return response.json();
  },

  getUserActivity: async (userId: string, limit: number = 10): Promise<ActivityLog[]> => {
    const response = await fetchWithAuth(`/users/${userId}/activity-logs?limit=${limit}`);
    return response.json();
  },
};

export default taskService;