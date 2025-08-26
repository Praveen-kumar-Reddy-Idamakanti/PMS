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
    address: string;
  };
}) => {
  try {
    const response = await api.post('/attendance/checkin', data);
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
    const response = await api.post('/checkout', data);
    return response.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Error checking out' };
  }
};

// Get today's status
const getTodaysStatus = async () => {
  try {
    const response = await api.get('/attendance/today');
    return response.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Error fetching today\'s status' };
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

// Get attendance summary
const getAttendanceSummary = async (params: {
  startDate?: string;
  endDate?: string;
  userId?: number;
}) => {
  try {
    const response = await api.get('/attendance/summary', { params });
    return response.data;
  } catch (error: any) {
    console.error('Error in getAttendanceSummary:', error);
    throw error.response?.data || { message: 'Error fetching attendance summary' };
  }
};

// Admin methods
const getAttendanceByDate = async (date: Date) => {
  const response = await api.get('/admin/attendance', {
    params: {
      date: date.toISOString().split('T')[0]
    }
  });
  // Ensure we return an array, even if the response is empty or malformed
  return Array.isArray(response.data?.data) ? response.data.data : [];
};

const getUsers = async () => {
  const response = await api.get('/admin/users');
  // Ensure we return an array, even if the response is empty or malformed
  return Array.isArray(response.data?.data) ? response.data.data : [];
};

export const attendanceService = {
  checkIn,
  checkOut,
  getTodaysStatus,
  getAttendanceRecords,
  getAttendanceSummary,
  getAttendanceByDate,
  getUsers,
};
