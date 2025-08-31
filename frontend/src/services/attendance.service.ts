import axios from 'axios';
import { API_BASE_URL } from '../config';
import { debug, debugApi } from '../utils/debug';

const API_URL = API_BASE_URL; // Remove /attendance from base URL

// Set up default config for http requests
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Add request interceptor for debugging
api.interceptors.request.use(
  config => {
    debugApi.request(config);
    return config;
  },
  error => {
    debug('API Request Error', error.message, error);
    return Promise.reject(error);
  }
);

// Add response interceptor for debugging
api.interceptors.response.use(
  response => debugApi.response(response),
  error => debugApi.error(error)
);

// Add a request interceptor to include the auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['x-auth-token'] = token;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Check in
const checkIn = async (data: {
  notes?: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  photo?: string; // Base64 encoded image
}) => {
  try {
    // Ensure we send the current date in ISO format with timezone offset
    const timestamp = new Date();
    const timezoneOffset = -timestamp.getTimezoneOffset() / 60; // Convert minutes to hours
    
    const response = await api.post('/attendance/checkin', {
      ...data,
      timezoneOffset // Send the client's timezone offset
    });
    return response.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Error checking in' };
  }
};

// Check out
const checkOut = async (data: {
  notes?: string;
  location?: {
    latitude: number;
    longitude: number;
    address: string;
  };
}) => {
  try {
    // Ensure we send the current date in ISO format with timezone offset
    const timestamp = new Date();
    const timezoneOffset = -timestamp.getTimezoneOffset() / 60; // Convert minutes to hours
    
    const response = await api.post('/attendance/checkout', {
      ...data,
      timezoneOffset // Send the client's timezone offset
    });
    return response.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Error checking out' };
  }
};

// Helper function to format date in local timezone
const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Get today's status with timezone support
const getTodaysStatus = async () => {
  try {
    // Get the user's timezone offset in hours
    const timezoneOffset = -new Date().getTimezoneOffset() / 60;
    
    // Get today's date in local timezone
    const today = formatLocalDate(new Date());
    const response = await api.get(`/attendance/today?date=${today}&timezoneOffset=${timezoneOffset}`);
    
    // Handle case where data is nested under data property
    const responseData = response.data?.data || response.data;
    
    // Handle case where status is 'checked_out' but checkInTime exists
    const status = responseData.status || 'not_checked_in';
    const isCheckedIn = status === 'checked_in';
    const isCheckedOut = status === 'checked_out';
    
    // Transform the response to match our expected format
    const result = {
      status,
      isCheckedIn,
      needsCheckIn: !isCheckedIn && !isCheckedOut, // Only need check-in if not checked in or out
      checkInTime: responseData.checkInTime || null,
      checkOutTime: responseData.checkOutTime || null,
      hoursWorked: responseData.hoursWorked || 0,
      lastAction: responseData.lastAction || null
    };
    
    console.log('Processed status:', result); // Debug log
    return result;
  } catch (error: any) {
    console.error('Error in getTodaysStatus:', error);
    // Return default status on error
    return {
      status: 'not_checked_in',
      isCheckedIn: false,
      needsCheckIn: true,
      checkInTime: null,
      checkOutTime: null,
      hoursWorked: 0,
      lastAction: null
    };
  }
};

// Get attendance records
const getAttendanceRecords = async (params: {
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
  userId?: number;
}) => {
  try {
    const response = await api.get('/attendance/records', { params });
    return response.data;
  } catch (error: any) {
    console.error('Error in getAttendanceRecords:', error);
    throw error.response?.data || { message: 'Error fetching attendance records' };
  }
};

// Admin methods
interface AttendanceByDateParams {
  date: string;
  userId?: string;
}

interface AttendanceSummaryParams {
  startDate: string;
  endDate: string;
  userId?: string;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  role?: string;
  employeeId?: string;
  date: string;
  checkIn?: string | null;
  checkOut?: string | null;
  totalHours?: number;
  status: 'present' | 'absent' | 'late' | 'half-day';
}

export interface AttendanceSummary {
  records: AttendanceRecord[];
  stats: {
    totalCheckIns: number;
    totalCheckOuts: number;
    totalWorkingHours: number;
    averageHoursPerDay: number;
    daysWorked: number;
  };
}

const getAttendanceByDate = async (params: AttendanceByDateParams): Promise<AttendanceRecord[]> => {
  try {
    const { date, userId } = params;
    interface AttendanceApiResponse {
      id: string;
      user_id: number;
      employee_id?: string | null;
      name: string;
      email: string;
      role?: string;
      checkin_time: string | null;
      checkout_time: string | null;
      total_hours: number;
      status: 'present' | 'absent' | 'late' | 'half-day';
      date?: string;
      pairs?: Array<{
        checkin_time?: string;
        checkout_time?: string;
        total_hours?: number;
        status?: 'present' | 'absent' | 'late' | 'half-day';
      }>;
    }

    const [usersResponse, attendanceResponse] = await Promise.all([
      api.get<{data: Array<{id: string; role: string}>}>('/admin/users'),
      api.get<{ data: AttendanceApiResponse[] }>('/admin/attendance', {
        params: {
          date,
          userId,
        },
      })
    ]);

    const users = usersResponse.data?.data || [];
    const userRoles = new Map(users.map(user => [user.id, user.role]));

    // Map the backend response to the frontend's expected format
    return attendanceResponse.data?.data?.flatMap(record => {
      const userRole = userRoles.get(record.user_id.toString()) || 'employee';
      
      // If there are pairs, create a record for each pair
      if (record.pairs?.length > 0) {
        return record.pairs.map((pair: any, index: number) => ({
          id: `${record.id}_${index}`,
          userId: record.user_id.toString(),
          userName: record.name || 'Unknown User',
          role: userRole,
          employeeId: record.employee_id || undefined,
          date: record.date || new Date().toISOString().split('T')[0],
          checkIn: pair.checkin_time || null,
          checkOut: pair.checkout_time || null,
          totalHours: pair.total_hours || 0,
          status: pair.status || record.status || 'present'
        }));
      }
      // If no pairs, use the main record
      return {
        id: record.id,
        userId: record.user_id.toString(),
        userName: record.name || 'Unknown User',
        role: userRole,
        employeeId: record.employee_id || undefined,
        date: record.date || new Date().toISOString().split('T')[0],
        checkIn: record.checkin_time || null,
        checkOut: record.checkout_time || null,
        totalHours: record.total_hours || 0,
        status: record.status || 'present'
      };
    }) || [];
  } catch (error: any) {
    console.error('Error fetching attendance by date:', error);
    throw error.response?.data || { message: 'Error fetching attendance by date' };
  }
};

const getUsers = async () => {
  try {
    const response = await api.get<{ data: Array<{ id: string; name: string; email: string }> }>('/admin/users');
    return response.data?.data || [];
  } catch (error: any) {
    console.error('Error fetching users:', error);
    throw error.response?.data || { message: 'Error fetching users' };
  }
};

const getAttendanceSummary = async (params: AttendanceSummaryParams): Promise<AttendanceSummary> => {
  try {
    const { startDate, endDate, userId } = params;
    const response = await api.get<{ data: any[] }>('/admin/attendance', {
      params: {
        startDate,
        endDate,
        userId,
      },
    });
    
    // First, get all users to map roles
    const usersResponse = await api.get<{data: Array<{id: string; role: string}>}>('/admin/users');
    const users = usersResponse.data?.data || [];
    const userRoles = new Map(users.map(user => [user.id, user.role]));
    
    // Transform the response to match the expected format
    const records = response.data?.data?.flatMap(record => {
      const userRole = userRoles.get(record.user_id.toString()) || 'employee';
      const recordDate = record.date || new Date().toISOString().split('T')[0];
      
      // Always process the main record first
      const mainRecord = {
        id: record.id,
        userId: record.user_id.toString(),
        userName: record.name || 'Unknown User',
        role: userRole,
        employeeId: record.employee_id || undefined,
        date: recordDate,
        checkIn: record.checkin_time || null,
        checkOut: record.checkout_time || null,
        totalHours: record.total_hours || 0,
        status: record.status || 'present'
      };
      
      // If there are pairs, create a record for each pair
      if (record.pairs?.length > 0) {
        return [
          mainRecord,
          ...record.pairs.map((pair: any, index: number) => ({
            id: `${record.id}_pair_${index}`,
            userId: record.user_id.toString(),
            userName: record.name || 'Unknown User',
            role: userRole,
            employeeId: record.employee_id || undefined,
            date: recordDate,
            checkIn: pair.checkin_time || null,
            checkOut: pair.checkout_time || null,
            totalHours: pair.total_hours || 0,
            status: pair.status || record.status || 'present'
          }))
        ];
      }
      
      return [mainRecord];
    }) || [];

    // Calculate statistics
    const stats = {
      totalCheckIns: records.filter(r => r.checkIn).length,
      totalCheckOuts: records.filter(r => r.checkOut).length,
      totalWorkingHours: Number(records.reduce((sum, record) => sum + (record.totalHours || 0), 0).toFixed(2)),
      daysWorked: new Set(records.map(r => r.checkIn?.split('T')[0])).size,
    };

    return {
      records,
      stats: {
        ...stats,
        averageHoursPerDay: stats.daysWorked > 0 ? Number((stats.totalWorkingHours / stats.daysWorked).toFixed(2)) : 0,
      },
    };
  } catch (error: any) {
    console.error('Error fetching attendance summary:', error);
    throw error.response?.data || { message: 'Error fetching attendance summary' };
  }
};

const getEmployeeAttendance = async (userId: string, params: { startDate?: string; endDate?: string } = {}) => {
  try {
    const { startDate, endDate } = params;
    const response = await api.get(`/attendance/me`, {
      params: {
        startDate,
        endDate,
      },
    });
    
    // Ensure the response format matches what the frontend expects
    const data = response.data?.data || response.data || [];
    return { data }; // Wrap in data object to match expected format
  } catch (error: any) {
    console.error('Error in getEmployeeAttendance:', error);
    throw error.response?.data || { message: 'Error fetching attendance records' };
  }
};

export const attendanceService = {
  checkIn,
  checkOut,
  getTodaysStatus,
  getAttendanceRecords,
  getAttendanceSummary,
  getAttendanceByDate,
  getUsers,
  getEmployeeAttendance,
};
