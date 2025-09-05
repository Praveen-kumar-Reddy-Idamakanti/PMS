import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5001/api',
  timeout: 10000, // 10 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Add a request interceptor to include the auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    console.log('API Request:', {
      url: config.url,
      method: config.method,
      hasToken: !!token,
      headers: config.headers
    });
    
    if (token) {
      // Use standard Authorization header with Bearer token
      config.headers['Authorization'] = `Bearer ${token}`;
      console.log('Added Authorization header to request');
    } else {
      console.warn('No token found in localStorage');
    }
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', {
      url: response.config.url,
      status: response.status,
      data: response.data
    });
    return response;
  },
  (error) => {
    if (error.response) {
      // Handle specific status codes
      if (error.response.status === 401 || error.response.status === 403) {
        // Handle unauthorized/forbidden (token expired, invalid, etc.)
        // Only clear auth and redirect if this is not a leave history request
        const isLeaveHistoryRequest = error.config.url?.includes('/leave-requests/user/');
        
        if (!isLeaveHistoryRequest) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          // Only redirect if not already on the login page
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }
        
        // Return a rejected promise with a more descriptive error
        return Promise.reject(new Error(
          error.response.data?.message || 'Authentication required. Please log in again.'
        ));
      }
      
      // For 404 Not Found, include the URL in the error message
      if (error.response.status === 404) {
        const errorMessage = `Resource not found: ${error.config.url}`;
        console.error(errorMessage);
        return Promise.reject(new Error(errorMessage));
      }
      
      // For other 4xx/5xx errors, include the error message from the server if available
      if (error.response.status >= 400) {
        // If there's a response with a message, use that
        if (error.response.data?.message) {
          return Promise.reject(new Error(error.response.data.message));
        }
        // For validation errors or other structured errors
        if (error.response.data?.error) {
          return Promise.reject(new Error(error.response.data.error));
        }
        const errorMessage = error.response.data?.message || 
                           `Request failed with status ${error.response.status}`;
        return Promise.reject(new Error(errorMessage));
      }
    } else if (error.request) {
      // The request was made but no response was received
      const errorMessage = 'No response received from the server. Please check your connection.';
      console.error(errorMessage, error.request);
      return Promise.reject(new Error(errorMessage));
    } else {
      // Something happened in setting up the request
      const errorMessage = `Request setup error: ${error.message}`;
      console.error(errorMessage);
      return Promise.reject(new Error(errorMessage));
    }
    
    // Default error handling
    return Promise.reject(error);
  }
);

export default api;
