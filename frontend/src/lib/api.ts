const API_BASE_URL = 'http://localhost:5001/api';

// Helper function to handle API requests
export async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token');
  
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  headers.set('Accept', 'application/json');
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
    mode: 'cors',
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(errorData.msg || 'Request failed');
    (error as any).response = errorData;
    throw error;
  }
  
  return response;
}

interface LoginData {
  email: string;
  password: string;
}

interface RegisterData extends LoginData {
  name: string;
}

export const authService = {
  async login(credentials: LoginData) {
    try {
      const response = await fetchWithAuth('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials)
      });
      
      const data = await response.json();
      
      // Store the token in localStorage if it exists in the response
      if (data.token) {
        localStorage.setItem('token', data.token);
      }
      
      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  async register(userData: RegisterData) {
    try {
      const response = await fetchWithAuth('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData)
      });
      
      const data = await response.json();
      
      // Store the token in localStorage if it exists in the response
      if (data.token) {
        localStorage.setItem('token', data.token);
      }
      
      return data;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  },

  async getCurrentUser() {
    try {
      const response = await fetchWithAuth('/auth/user', {
        method: 'GET'
      });
      
      return response.json();
    } catch (error) {
      console.error('Error fetching current user:', error);
      throw error;
    }
  },
};

export const setAuthToken = (token: string | null) => {
  if (token) {
    localStorage.setItem('token', token);
  } else {
    localStorage.removeItem('token');
  }
};

export const getAuthToken = (): string | null => {
  return localStorage.getItem('token');
};
