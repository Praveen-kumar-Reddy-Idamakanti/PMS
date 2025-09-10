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
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Tag {
  id: string;
  name: string;
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
    const response = await fetchWithAuth(`/tasks/${taskId}/subtasks`, {
      method: 'POST',
      body: JSON.stringify(subtask),
    });
    return response.json();
  },

  updateSubtask: async (taskId: string, subtaskId: string, subtask: Partial<Subtask>): Promise<Subtask> => {
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
};

export default taskService;