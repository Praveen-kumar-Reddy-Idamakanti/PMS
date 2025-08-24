import { createContext, useState, useContext, useEffect, useCallback, ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import * as authService from '@/services/auth.service';

interface User {
  id: string;
  name: string;
  email: string;
  isAuthenticated: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to get auth token from localStorage
const getAuthToken = () => {
  return localStorage.getItem('token');};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const checkAuth = useCallback(async (): Promise<User | null> => {
    setLoading(true);
    const token = getAuthToken();
    
    if (!token) {
      setLoading(false);
      setUser(null);
      return null;
    }

    try {
      const user = await authService.getCurrentUser();
      
      if (user) {
        const userData: User = {
          id: user.id,
          name: user.name,
          email: user.email,
          isAuthenticated: true,
        };
        setUser(userData);
        setLoading(false);
        return userData;
      }
      
      // If we got here, the token might be invalid
      localStorage.removeItem('token');
      setUser(null);
      setLoading(false);
      return null;
      
    } catch (error) {
      console.error('Failed to verify token:', error);
      localStorage.removeItem('token');
      setUser(null);
      setLoading(false);
      return null;
    }
  }, []);

  // Check authentication status on initial load and when path changes
  useEffect(() => {
    let mounted = true;

    const verifyAuth = async () => {
      if (!mounted) return;

      const currentPath = location.pathname;
      const isAuthRoute = currentPath === '/login' || currentPath === '/register';
      const isPublicRoute = isAuthRoute || currentPath === '/';

      try {
        setLoading(true);
        const user = await checkAuth();

        if (!mounted) return;

        if (user) {
          // If user is logged in but on auth page, redirect to dashboard
          if (isAuthRoute) {
            navigate('/dashboard', { 
              replace: true,
              state: { from: location.state?.from || location }
            });
          }
        } else {
          // If user is not logged in and not on a public route, redirect to login
          if (!isPublicRoute) {
            navigate('/login', { 
              replace: true,
              state: { from: location }
            });
          }
        }
      } catch (error) {
        console.error('Auth verification error:', error);
        if (!mounted) return;

        // Clear any invalid token
        localStorage.removeItem('token');
        setUser(null);

        // Only redirect if not already on a public route
        if (!isPublicRoute) {
          navigate('/login', { 
            replace: true,
            state: { 
              from: location,
              error: 'Your session has expired. Please log in again.'
            }
          });
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    verifyAuth();

    // Set up a timer to check auth status periodically
    const authCheckInterval = setInterval(verifyAuth, 5 * 60 * 1000); // Check every 5 minutes

    return () => {
      mounted = false;
      clearInterval(authCheckInterval);
    };
  }, [checkAuth, navigate, location]);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      const user = await authService.login({ email, password });
      
      setUser({
        id: user.id,
        name: user.name,
        email: user.email,
        isAuthenticated: true
      });
      
      toast({
        title: 'Login successful',
        description: `Welcome back, ${user.name}`,
        variant: 'default',
      });
      
      // Redirect to the intended URL or home
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
      return true;
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An error occurred during login';
      
      toast({
        title: 'Login failed',
        description: errorMessage,
        variant: 'destructive',
      });
      
      // Clear any invalid token
      if (error instanceof Error && error.message.includes('token')) {
        localStorage.removeItem('token');
      }
      
      return false;
    } finally {
      setLoading(false);
    }
  }, [navigate, toast, location.state]);

  const logout = useCallback(async () => {
    try {
      // Clear all auth-related data
      localStorage.removeItem('token');
      document.cookie = 'token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      
      // Reset user state
      setUser(null);
      
      // Show logout message
      toast({
        title: 'Logged out',
        description: 'You have been successfully logged out.',
      });
      
      // Navigate to login page
      navigate('/login', { replace: true });
      
    } catch (error) {
      console.error('Error during logout:', error);
      // Fallback to full page reload on error
      navigate('/login', { replace: true });
    }
  }, [toast, navigate]);

  const contextValue = {
    user: user,
    loading: loading,
    login: login,
    logout: logout,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
