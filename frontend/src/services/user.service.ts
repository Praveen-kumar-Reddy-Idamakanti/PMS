import api from './api';
import { User, UserRole } from '@/types/user';

const getAllUsers = async (): Promise<User[]> => {
  try {
    const response = await api.get('/admin/users');
    // The backend returns { success: boolean, data: User[] }
    if (response.data && response.data.success && Array.isArray(response.data.data)) {
      return response.data.data;
    }
    console.error('Unexpected response format from /admin/users:', response.data);
    return [];
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
};

const updateUserRole = async (userId: string, role: UserRole): Promise<User> => {
  const response = await api.patch(`/admin/users/${userId}/role`, { role });
  return response.data;
};

const deleteUser = async (userId: string): Promise<void> => {
  await api.delete(`/admin/users/${userId}`);
};

const createUser = async (userData: Omit<User, 'id' | 'createdAt'>): Promise<User> => {
  const response = await api.post('/admin/users', userData);
  return response.data;
};


export const userService = {
  getAllUsers,
  updateUserRole,
  deleteUser,
  createUser,
};

export type UserService = typeof userService;
