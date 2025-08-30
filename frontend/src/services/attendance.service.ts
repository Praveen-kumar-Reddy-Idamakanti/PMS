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
      config.headers.Authorization = `Bearer ${token}`;
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

interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  checkIn: string;
  checkOut?: string;
  totalHours?: number;
  status: 'present' | 'absent' | 'late' | 'half-day';
}

const getAttendanceByDate = async (params: AttendanceByDateParams): Promise<AttendanceRecord[]> => {
  try {
    const { date, userId } = params;
    interface AttendanceApiResponse {
      id: string;
      user_id: number;
      employee_id?: string;
      name: string;
      email: string;
      checkin_time: string | null;
      checkout_time: string | null;
      total_hours: number;
      status: 'present' | 'absent' | 'late' | 'half-day';
      date?: string;
    }

    const response = await api.get<{ data: AttendanceApiResponse[] }>('/admin/attendance', {
      params: {
        date,
        userId,
      },
    });

    // Map the backend response to the frontend's expected format
    return response.data?.data?.map(record => ({
      id: record.id,
      userId: record.user_id.toString(),
      userName: record.name,
      employeeId: record.employee_id || undefined, // Use employee_id from backend if available
      checkIn: record.checkin_time,
      checkOut: record.checkout_time,
      totalHours: record.total_hours,
      status: record.status,
      date: record.date || (record.checkin_time ? record.checkin_time.split('T')[0] : '')
    })) || [];
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

const getAttendanceSummary = async (params: AttendanceSummaryParams): Promise<AttendanceRecord[]> => {
  try {
    const { startDate, endDate, userId } = params;
    const response = await api.get<{ data: any[] }>('/admin/attendance', {
      params: {
        startDate,
        endDate,
        userId,
      },
    });
    
    // Transform the response to match the expected format
    return response.data?.data?.map(record => ({
      id: record.id,
      userId: record.user_id.toString(),
      userName: record.name,
      employeeId: record.employee_id || undefined, // Use employee_id from backend if available
      checkIn: record.checkin_time,
      checkOut: record.checkout_time,
      totalHours: record.total_hours || 0,
      status: record.status || 'present', // Default to 'present' if status not provided
      date: record.date || (record.checkin_time ? record.checkin_time.split('T')[0] : '')
    })) || [];
  } catch (error: any) {
    console.error('Error fetching attendance summary:', error);
    throw error.response?.data || { message: 'Error fetching attendance summary' };
  }
};

const getEmployeeAttendance = async (userId: string, params: { startDate?: string; endDate?: string } = {}) => {
  try {
    const { startDate, endDate } = params;
    const response = await api.get(`/admin/attendance/employee/${userId}`, {
      params: {
        startDate,
        endDate,
      },
    });
    return response.data?.data || [];
  } catch (error: any) {
    throw error.response?.data || { message: 'Error fetching employee attendance' };
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
