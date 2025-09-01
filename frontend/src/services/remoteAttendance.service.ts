import { fetchWithAuth } from '@/lib/api';
import { RemoteRequest } from '@/types/remoteRequest';

export interface CreateRemoteRequestData {
  request_date: string;
  reason: string;
}

export interface GetRequestsParams {
  status?: 'pending' | 'approved' | 'rejected';
  startDate?: string;
  endDate?: string;
}

class RemoteAttendanceService {
  /**
   * Get user's remote attendance requests
   */
  async getMyRequests(params?: GetRequestsParams): Promise<RemoteRequest[]> {
    try {
      const searchParams = new URLSearchParams();
      
      if (params?.status) {
        searchParams.append('status', params.status);
      }
      if (params?.startDate) {
        searchParams.append('startDate', params.startDate);
      }
      if (params?.endDate) {
        searchParams.append('endDate', params.endDate);
      }

      const queryString = searchParams.toString();
      const url = `/remote-attendance/my-requests${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetchWithAuth(url);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch requests');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching remote attendance requests:', error);
      throw error;
    }
  }

  /**
   * Create a new remote attendance request
   */
  async createRequest(data: CreateRemoteRequestData): Promise<void> {
    try {
      const response = await fetchWithAuth('/remote-attendance/request', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create request');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating remote attendance request:', error);
      throw error;
    }
  }
}

export const remoteAttendanceService = new RemoteAttendanceService();
