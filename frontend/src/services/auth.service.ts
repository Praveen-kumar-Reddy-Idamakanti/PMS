import { User, UserRole, CreateUserDto } from '@/types/user';
import api from './api';

// We'll use the shared API instance from api.ts
// which already has interceptors for adding tokens and handling responses

interface LoginCredentials {
  email?: string;
  employeeId?: string;
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
    console.log('Login attempt with credentials:', {
      hasEmail: !!credentials.email,
      hasEmployeeId: !!credentials.employeeId,
      hasPassword: !!credentials.password
    });
    
    // Determine the login type and prepare the request body
    const requestBody = credentials.employeeId 
      ? { employeeId: credentials.employeeId, password: credentials.password }
      : { email: credentials.email, password: credentials.password };
    
    console.log('Sending login request with body:', requestBody);
    
    // Use the shared API instance but with a custom config to skip the auth header
    // since we don't have a token yet
    const response = await api.post<LoginResponse>('/auth/login', requestBody, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: undefined // Ensure no Authorization header is set for login
      }
    });
    
    console.log('Login response:', response.data);
    
    if (!response.data.success || !response.data.token) {
      throw new Error(response.data.message || 'Login failed');
    }
    
    // Store the token in localStorage
    const token = response.data.token;
    localStorage.setItem('token', token);
    
    // Update the default Authorization header for future requests
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    // Store user data in localStorage
    if (response.data.user) {
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    
    return response.data.user;
  } catch (error: any) {
    console.error('Login error:', error);
    
    // Handle different error types
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      const { status, data } = error.response;
      
      if (status === 401) {
        throw new Error(data?.message || 'Invalid credentials. Please try again.');
      }
      
      throw new Error(data?.message || 'Login failed. Please try again.');
    } else if (error.request) {
      // The request was made but no response was received
      throw new Error('No response from server. Please check your connection.');
    } else {
      // Something happened in setting up the request
      throw new Error(getErrorMessage(error));
    }
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
  console.log('Logging out user...');
  
  // Clear auth data from localStorage
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  
  // Clear the Authorization header from the API instance
  delete api.defaults.headers.common['Authorization'];
  
  console.log('User logged out, redirecting to login page');
  
  // Redirect to login page with a full page reload to reset all states
  window.location.href = '/login';
};

/**
 * Gets the current authenticated user
 * @returns Promise that resolves with the current user data or null if not authenticated
 */
export const getCurrentUser = async (): Promise<User | null> => {
  const token = localStorage.getItem('token');
  
  if (!token) {
    console.log('No token found in localStorage');
    return null;
  }

  try {
    console.log('Fetching current user with token:', token ? '***token-present***' : 'no-token');
    
    // Use the shared API instance which already has the token interceptor
    const response = await api.get<{ success: boolean; user: User }>('/auth/me');
    
    console.log('Current user response:', {
      success: response.data.success,
      hasUser: !!response.data.user,
      user: response.data.user ? { 
        id: response.data.user.id,
        name: response.data.user.name,
        role: response.data.user.role 
      } : null
    });
    
    if (response.data && response.data.success && response.data.user) {
      // Update the user data in localStorage
      localStorage.setItem('user', JSON.stringify(response.data.user));
      return response.data.user;
    }
    
    return null;
  } catch (error: any) {
    console.error('Error fetching current user:', {
      name: error.name,
      message: error.message,
      response: error.response ? {
        status: error.response.status,
        data: error.response.data
      } : 'No response',
      stack: error.stack
    });
    
    // If we get a 401, clear the token as it's likely invalid
    if (error.response && error.response.status === 401) {
      console.log('Clearing invalid token due to 401 response');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Clear the Authorization header
      delete api.defaults.headers.common['Authorization'];
    }
    
    return null;
  }
};
