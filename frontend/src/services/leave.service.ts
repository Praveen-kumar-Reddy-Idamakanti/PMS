import api from './api';
import { LeaveRequest, LeaveType, LeaveBalance, RemoteWorkRequest } from '../types/leave';

export interface LeaveHistoryResponse {
  success: boolean;
  data: LeaveRequest[];
}

interface SubmitLeaveRequestData {
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  reason: string;
}

interface SubmitRemoteWorkRequestData {
  startDate: string;
  endDate: string;
  reason: string;
}

const leaveService = {
  getLeaveTypes: async (): Promise<{ success: boolean; data: LeaveType[] } | LeaveType[]> => {
    const response = await api.get('/leave-types');
    return response.data;
  },

  submitLeaveRequest: async (data: SubmitLeaveRequestData): Promise<LeaveRequest> => {
    // Map frontend parameter names to backend expected names
    const requestData = {
      typeId: data.leaveTypeId,
      startDate: data.startDate,
      endDate: data.endDate,
      reason: data.reason
    };
    const response = await api.post('/leave-requests', requestData);
    return response.data;
  },

  getLeaveBalances: async (userId: string): Promise<LeaveBalance[]> => {
    const response = await api.get(`/leave-balances/${userId}`);
    return response.data;
  },

  getLeaveHistory: async (userId: string): Promise<LeaveHistoryResponse> => {
    const response = await api.get(`/leave-requests/user/${userId}`);
    return response.data;
  },

  submitRemoteWorkRequest: async (data: SubmitRemoteWorkRequestData): Promise<RemoteWorkRequest> => {
    const response = await api.post('/remote-attendance', data); // Corrected to match backend
    return response.data;
  },

  getRemoteWorkHistory: async (): Promise<RemoteWorkRequest[]> => {
    const response = await api.get('/remote-attendance/my-requests'); // Corrected to match backend
    return response.data;
  },

  // Admin functions for leave requests
  getAllLeaveRequests: async (): Promise<LeaveRequest[]> => {
    const response = await api.get('/admin/leave-requests');
    return response.data.data; // Backend returns { success, count, data }
  },

  updateLeaveRequestStatus: async (id: string, status: 'approved' | 'rejected'): Promise<LeaveRequest> => {
    const response = await api.patch(`/admin/leave-requests/${id}/status`, { status });
    return response.data.data; // Backend returns { success, message, data }
  },
};

export default leaveService;
