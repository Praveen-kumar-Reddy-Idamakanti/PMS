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
    
    if (response.data?.success && response.data.user) {
      return response.data.user;
    }
    
    // If the response doesn't contain user data, the token might be invalid
    throw new Error('Invalid user data received');
    
  } catch (error: any) {
    console.error('Error fetching current user:', error);
    
    // Handle different types of errors
    if (error.response) {
      // Server responded with an error status code
      if (error.response.status === 401) {
        localStorage.removeItem('token');
        throw new Error('Your session has expired. Please log in again.');
      } else if (error.response.status >= 500) {
        console.error('Server error:', error);
        throw new Error('Unable to fetch user information. Please try again later.');
      }
    } else if (error.message === 'Network Error') {
      // Network error
      localStorage.removeItem('token');
      throw new Error('Unable to connect to the server. Please check your connection.');
    }
    
    // For other errors, re-throw with a generic message
    throw new Error('An error occurred while fetching user information');
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
