import api from './api';

export interface ActivityUser {
  id: string;
  name: string;
  email: string;
  employeeId?: string;
}

export interface Activity {
  id: string;
  userId: string;
  user?: ActivityUser;
  userEmail?: string;
  userName?: string;
  activityType: string;
  details: Record<string, any>;
  ipAddress: string | null;
  userAgent: string | null;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number | null;
    page: number;
    limit: number;
    totalPages: number | null;
  };
}

interface ActivityFilters {
  page?: number;
  limit?: number;
  action?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

const getActivities = async (filters: ActivityFilters = {}): Promise<PaginatedResponse<Activity>> => {
  try {
    const response = await api.get<PaginatedResponse<Activity>>('/admin/activity-logs', { params: filters });
    return response.data;
  } catch (error) {
    console.error('Failed to fetch activities:', error);
    throw error;
  }
};

const logActivity = async (data: {
  activityType: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}): Promise<Activity> => {
  try {
    const response = await api.post<{ success: boolean; data: Activity }>('admin/activity-logs', data);
    return response.data.data;
  } catch (error) {
    console.error('Failed to log activity:', error);
    throw error;
  }
};

const getUserActivities = async (userId: string, filters: Omit<ActivityFilters, 'userId'> = {}): Promise<PaginatedResponse<Activity>> => {
  try {
    const response = await api.get<PaginatedResponse<Activity>>(
      `/admin/activity-logs/user/${userId}`,
      { params: filters }
    );
    return response.data;
  } catch (error) {
    console.error(`Failed to fetch activities for user ${userId}:`, error);
    throw error;
  }
};

export const activityService = {
  getActivities,
  logActivity,
  getUserActivities,
};