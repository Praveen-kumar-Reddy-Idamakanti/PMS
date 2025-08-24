import { AxiosError } from 'axios';
import api from './api';

export interface User {
  id: string;
  name: string;
  email: string;
}

interface LoginResponse {
  success: boolean;
  message: string;
  token: string;
  user: User;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

interface ErrorResponse extends Error {
  response?: {
    data?: {
      message?: string;
    };
    status?: number;
  };
  message: string;
}

// Helper to extract error message from error object
const getErrorMessage = (error: unknown): string => {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const err = error as ErrorResponse;
    return (
      err.response?.data?.message ||
      err.message ||
      'An unknown error occurred'
    );
  }
  return 'An unknown error occurred';
};

/**
 * Logs in a user with the provided credentials
 * @param credentials User login credentials
 * @returns Promise that resolves with the logged-in user data
 * @throws Error with a user-friendly message if login fails
 */
export const login = async (credentials: { email: string; password: string }): Promise<User> => {
  try {
    const response = await api.post<LoginResponse>('/auth/login', credentials);
    console.log('Login response:', response.data);
    
    if (response.data.success && response.data.token && response.data.user) {
      const { token, user } = response.data;
      
      // Store the token for future requests
      localStorage.setItem('token', token);
      
      return user;
    }
    
    throw new Error(response.data.message || 'Invalid response from server');
  } catch (error) {
    console.error('Login error:', error);
    throw new Error(getErrorMessage(error));
  }
};

interface GetCurrentUserResponse {
  success: boolean;
  user: User;
  message?: string;
}

/**
 * Gets the currently authenticated user
 * @returns Promise that resolves with the current user or null if not authenticated
 * @throws Error if there's a server error
 */
export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;

    const response = await api.get<GetCurrentUserResponse>('/auth/user');
    
    if (response.data.success && response.data.user) {
      return response.data.user;
    }
    
    // If the token is invalid, clear it
    localStorage.removeItem('token');
    return null;
  } catch (error) {
    console.error('Error fetching current user:', error);
    
    const err = error as ErrorResponse;
    
    // If the error is 401 (Unauthorized) or 403 (Forbidden), clear the token
    if (err.response?.status === 401 || err.response?.status === 403) {
      localStorage.removeItem('token');
      return null;
    }
    
    // For server errors, log the full error but don't expose details to the user
    if (err.response?.status && err.response.status >= 500) {
      console.error('Server error:', error);
      throw new Error('Unable to fetch user information. Please try again later.');
    }
    
    // For other errors, just return null
    return null;
  }
};

interface LogoutResponse {
  success: boolean;
  message?: string;
}

/**
 * Logs out the current user
 * @returns Promise that resolves when logout is complete
 * @throws Error only if there's a server error (5xx)
 */
export const logout = async (): Promise<void> => {
  try {
    await api.post<LogoutResponse>('/auth/logout');
  } catch (error) {
    const err = error as ErrorResponse;
    
    // Don't fail the logout process for client-side errors
    if (err.response?.status && err.response.status >= 500) {
      console.error('Server error during logout:', error);
      throw new Error('Failed to complete logout on the server');
    }
    
    // Log but don't throw for other errors (like network issues)
    console.warn('Non-critical logout error:', error);
  } finally {
    // Always remove the token from localStorage
    localStorage.removeItem('token');
  }
};
