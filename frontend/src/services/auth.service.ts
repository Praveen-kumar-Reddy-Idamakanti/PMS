import axios from 'axios';
import { User, UserRole, CreateUserDto } from '@/types/user';

const API_URL = 'http://localhost:5001/api'; // Update with your backend URL

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to add the auth token to requests
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

// Add a response interceptor to handle common errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      const { status, data } = error.response;
      
      if (status === 401) {
        // Unauthorized - token is invalid or expired
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
      
      // You can add more specific error handling here
      return Promise.reject({
        status,
        message: data?.message || 'An error occurred',
      });
    } else if (error.request) {
      // The request was made but no response was received
      return Promise.reject({
        status: 0,
        message: 'No response from server. Please check your connection.',
      });
    } else {
      // Something happened in setting up the request that triggered an Error
      return Promise.reject({
        status: -1,
        message: error.message || 'An error occurred',
      });
    }
  }
);

interface LoginCredentials {
  email: string;
  password: string;
}

interface LoginResponse {
  success: boolean;
  token: string;
  user: User;
  message?: string;
}

export const getErrorMessage = (error: any): string => {
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  if (error?.message) {
    return error.message;
  }
  return 'An unknown error occurred';
};

/**
 * Logs in a user with the provided credentials
 * @param credentials User login credentials
 * @returns Promise that resolves with the logged-in user data
 * @throws Error with a user-friendly message if login fails
 */
export const login = async (credentials: LoginCredentials): Promise<User> => {
  try {
    const response = await api.post<LoginResponse>('/auth/login', credentials);
    
    if (response.data.success && response.data.token && response.data.user) {
      const { token, user } = response.data;
      
      // Ensure the user object has all required fields
      const userData: User = {
        id: user.id,
        name: user.name,
        email: user.email,
        employeeId: user.employeeId,
        role: user.role, // Default to EMPLOYEE if role is not provided
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };
      
      // Store the token for future requests
      localStorage.setItem('token', token);
      
      // Store complete user data
      localStorage.setItem('user', JSON.stringify(userData));
      
      return userData;
    } else {
      throw new Error(response.data.message || 'Login failed');
    }
  } catch (error) {
    console.error('Login error:', error);
    throw new Error(getErrorMessage(error));
  }
};

/**
 * Registers a new user
 * @param userData User registration data
 * @returns Promise that resolves with the created user data
 * @throws Error with a user-friendly message if registration fails
 */
export const registerUser = async (userData: CreateUserDto): Promise<User> => {
  try {
    const response = await api.post<{ success: boolean; user: User; message?: string }>(
      '/auth/register',
      userData
    );
    
    if (response.data.success && response.data.user) {
      return response.data.user;
    } else {
      throw new Error(response.data.message || 'Registration failed');
    }
  } catch (error) {
    console.error('Registration error:', error);
    throw new Error(getErrorMessage(error));
  }
};

/**
 * Logs out the current user
 */
export const logout = (): void => {
  // Clear auth data
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  
  // Redirect to login page
  window.location.href = '/login';
};

/**
 * Gets the current authenticated user
 * @returns Promise that resolves with the current user data
 */
export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
    
    const response = await api.get<{ success: boolean; user: User }>('/auth/user');
    
    if (response.data.success && response.data.user) {
      const user = response.data.user;
      
      // Ensure the user object has all required fields
      const userData: User = {
        id: user.id,
        name: user.name,
        email: user.email,
        employeeId: user.employeeId,
        role: user.role || UserRole.EMPLOYEE, // Default to EMPLOYEE if role is not provided
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };
      
      // Update stored user data
      localStorage.setItem('user', JSON.stringify(userData));
      return userData;
    }
    
    return null;
  } catch (error: any) {
    console.error('Error fetching current user:', error);
    
    // Clear auth data on any error
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // If the error already has a message from the API interceptor, just rethrow it
    if (error.message && error.message !== 'Network Error') {
      throw error;
    }
    
    // For network errors or errors without a message
    throw new Error(error.message || 'Failed to authenticate. Please try again.');
  }
};
