import api from './api';

export interface Activity {
  id: string;
  userId: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  action: string;
  details?: Record<string, any>;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
}

const getActivities = async (): Promise<Activity[]> => {
  const response = await api.get<Activity[]>('/admin/activities');
  return response.data;
};

const logActivity = async (data: Omit<Activity, 'id' | 'timestamp'>): Promise<Activity> => {
  const response = await api.post<Activity>('/admin/activities', data);
  return response.data;
};

const getUserActivities = async (userId: string): Promise<Activity[]> => {
  const response = await api.get<Activity[]>(`/admin/users/${userId}/activities`);
  return response.data;
};

export const activityService = {
  getActivities,
  logActivity,
  getUserActivities,
};