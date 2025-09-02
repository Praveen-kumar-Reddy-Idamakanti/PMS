import { fetchWithAuth } from '@/lib/api';
import { RemoteRequest } from '@/types/remoteRequest';

export interface CreateRemoteRequestData {
  request_date: string;
  reason: string;
  timezoneOffset?: number;
}

export interface GetRequestsParams {
  status?: 'pending' | 'approved' | 'rejected';
  startDate?: string;
  endDate?: string;
}

class RemoteAttendanceService {
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Request failed');
    }
    return response.json();
  }

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
      return this.handleResponse<RemoteRequest[]>(response);
    } catch (error) {
      console.error('Error fetching remote attendance requests:', error);
      throw error;
    }
  }

  /**
   * Create a new remote attendance request
   */
  async createRequest(data: CreateRemoteRequestData): Promise<RemoteRequest> {
    try {
      const response = await fetchWithAuth('/remote-attendance/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          request_date: data.request_date,
          reason: data.reason,
          timezoneOffset: data.timezoneOffset
        }),
      });

      return this.handleResponse<RemoteRequest>(response);
    } catch (error) {
      console.error('Error creating remote attendance request:', error);
      throw error;
    }
  }
}

export const remoteAttendanceService = new RemoteAttendanceService();
