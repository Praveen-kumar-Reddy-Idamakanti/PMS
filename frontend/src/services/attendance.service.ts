import axios from 'axios';
import { fetchWithAuth } from '@/lib/api';
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
  isRemote?: boolean;
  reason?: string; // For remote attendance
}) => {
  try {
    const timestamp = new Date();
    // User's timezone offset in hours
    const timezoneOffset = -timestamp.getTimezoneOffset() / 60;
    
    if (data.isRemote) {
      // Remote attendance: create/submit a remote attendance request (approval workflow)
      const response = await fetchWithAuth('/remote-attendance/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          request_date: timestamp.toISOString().split('T')[0], // YYYY-MM-DD
          reason: data.notes || 'Working remotely',
          timezoneOffset,
          ...(data.location && {
            location: {
              latitude: data.location.latitude,
              longitude: data.location.longitude,
              address: data.location.address || 'Remote location'
            }
          })
        }),
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({} as any));
        throw new Error(error.message || 'Failed to create remote attendance request');
      }
      
      const result = await response.json();
      // If backend signals pending approval, reflect that in UI; otherwise treat as checked-in remotely
      if (result?.status === 'pending_approval') {
        return {
          ...result,
          status: 'pending_approval',
          message: result.message || 'Your remote work request has been submitted for approval.',
          isRemote: true
        };
      }
      return {
        ...result,
        status: 'checked_in',
        isRemote: true
      };
    } else {
      // For regular office check-in
      if (!data.location) {
        throw new Error('Location is required for office check-in');
      }
      
      const response = await fetchWithAuth('/attendance/checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isRemote: false,
          notes: data.notes,
          photo: data.photo,
          location: {
            latitude: data.location.latitude,
            longitude: data.location.longitude,
            address: data.location.address || 'Office location'
          }
        }),
      });
      
      if (!response.ok) {
        let serverMsg = 'Failed to check in';
        try {
          const txt = await response.text();
          serverMsg = (JSON.parse(txt).message) || txt || serverMsg;
        } catch (_) {}
        throw new Error(`(${response.status}) ${serverMsg}`);
      }
      
      const result = await response.json();
      return {
        ...result,
        status: 'checked_in',
        isRemote: false
      };
    }
  } catch (error: any) {
    console.error('Check-in error:', error);
    throw new Error(error.message || 'Error checking in');
  }
};

// Check out
const checkOut = async (data: {
  notes?: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  isRemote?: boolean;
}) => {
  try {
    const timestamp = new Date();
    const timezoneOffset = -timestamp.getTimezoneOffset() / 60; // Convert minutes to hours
    
    // Only require location for office checkout
    if (!data.isRemote && !data.location) {
      throw new Error('Location is required for office check-out');
    }
    
    const response = await fetchWithAuth('/attendance/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        isRemote: !!data.isRemote,
        notes: data.notes,
        photo: undefined,
        ...(data.location && {
          location: {
            latitude: data.location.latitude,
            longitude: data.location.longitude,
            address: data.location.address || 'Check-out location'
          }
        })
      }),
    });
    
    if (!response.ok) {
      let serverMsg = 'Failed to check out';
      try {
        const txt = await response.text();
        serverMsg = (JSON.parse(txt).message) || txt || serverMsg;
      } catch (_) {}
      throw new Error(`(${response.status}) ${serverMsg}`);
    }
    
    const result = await response.json();
    return {
      ...result,
      status: 'checked_out',
      isCheckedIn: false,
      needsCheckIn: false,
      isRemote: !!data.isRemote,
      checkOutTime: timestamp.toISOString()
    };
  } catch (error: any) {
    console.error('Check-out error:', error);
    throw new Error(error.message || 'Error checking out');
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
    
    // First, check regular attendance status
    let attendanceStatus = {
      status: 'not_checked_in',
      isCheckedIn: false,
      needsCheckIn: true,
      checkInTime: null,
      checkOutTime: null,
      hoursWorked: 0,
      isRemote: false,
      remoteRequest: null
    };

    try {
      // Check regular attendance first
      const response = await fetchWithAuth(`/attendance/today?date=${today}&timezoneOffset=${timezoneOffset}`);
      if (response.ok) {
        const raw = await response.json();
        const payload = raw?.data || raw; // controller wraps in {success, data}
        if (payload) {
          // Normalize field names from backend (camelCase or snake_case)
          const checkInTime = payload.checkInTime || payload.checkin_time || null;
          const checkOutTime = payload.checkOutTime || payload.checkout_time || null;
          const hoursWorked = payload.hoursWorked ?? payload.total_hours ?? 0;
          const isRemote = payload.isRemote ?? payload.is_remote ?? (payload.mode === 'remote') ?? false;
          const derivedStatus = checkOutTime
            ? 'checked_out'
            : checkInTime
            ? 'checked_in'
            : payload.status || 'not_checked_in';
          attendanceStatus = {
            ...attendanceStatus,
            status: derivedStatus,
            isCheckedIn: derivedStatus === 'checked_in',
            needsCheckIn: derivedStatus !== 'checked_in',
            checkInTime,
            checkOutTime,
            hoursWorked: Number(hoursWorked) || 0,
            isRemote: !!isRemote
          };
        }
      }
    } catch (error) {
      console.error('Error checking regular attendance status:', error);
      // Continue with remote check if regular check fails
    }

    // Check for remote attendance requests (approval workflow)
    try {
      const remoteResponse = await fetchWithAuth(`/remote-attendance/my-requests?startDate=${today}&endDate=${today}`);
      if (remoteResponse.ok) {
        const remoteRequests = await remoteResponse.json();
        const todayRequest = Array.isArray(remoteRequests)
          ? remoteRequests.find((req: any) => req.request_date === today && (req.status === 'approved' || req.status === 'pending'))
          : null;

        if (todayRequest) {
          attendanceStatus = {
            ...attendanceStatus,
            status: todayRequest.status === 'approved' ? 'checked_in' : 'pending_approval',
            isCheckedIn: todayRequest.status === 'approved',
            needsCheckIn: todayRequest.status !== 'approved',
            isRemote: true,
            remoteRequest: todayRequest
          };

          // If approved but no actual check-in record exists, default to 10:00 AM local and compute hours
          if (todayRequest.status === 'approved' && !attendanceStatus.checkInTime) {
            const nowLocal = new Date();
            const defaultCheckIn = new Date(nowLocal);
            defaultCheckIn.setHours(10, 0, 0, 0); // 10:00 AM local time
            attendanceStatus.checkInTime = defaultCheckIn.toISOString();

            if (!attendanceStatus.checkOutTime) {
              const diffMs = nowLocal.getTime() - defaultCheckIn.getTime();
              const diffHrs = diffMs / (1000 * 60 * 60);
              attendanceStatus.hoursWorked = Math.max(0, Number(diffHrs.toFixed(2)));
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking remote attendance status:', error);
      // Ignore and return whatever we have from /attendance/today
    }

    return attendanceStatus;
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
