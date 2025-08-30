import { createContext, useState, useContext, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import * as authService from '@/services/auth.service';

import { User, UserRole } from '@/types/user';

interface AuthUser extends User {
  isAuthenticated: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (credentials: { email?: string; employeeId?: string; password: string }) => Promise<boolean>;
  logout: () => void;
  hasRole: (role: UserRole) => boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to get auth token from localStorage
const getAuthToken = () => {
  return localStorage.getItem('token');};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const checkAuth = useCallback(async (): Promise<AuthUser | null> => {
    const token = getAuthToken();
    
    if (!token) {
      // If no token, clear any existing user data
      localStorage.removeItem('user');
      setUser(null);
      return null;
    }

    // First try to get user from localStorage if available
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser) as AuthUser;
        // If we have a valid stored user, use it while we verify with the server
        setUser(parsedUser);
      } catch (e) {
        console.error('Error parsing stored user:', e);
        // If we can't parse the stored user, clear it
        localStorage.removeItem('user');
      }
    }
    
    try {
      // Verify with the server
      const user = await authService.getCurrentUser();
      
      if (user) {
        const userData: AuthUser = {
          id: user.id,
          name: user.name,
          email: user.email,
          employeeId: user.employeeId,
          role: user.role,
          isAuthenticated: true,
        };
        // Update both state and localStorage
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        return userData;
      }
      
      // If we get here, the token was valid but no user was returned
      throw new Error('No user data received');
      
    } catch (error: any) {
      console.error('Error verifying user:', error);
      
      // Clear invalid data
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      
      // Don't show error toast for common auth errors
      const silentErrors = [
        'session has expired',
        'User not found',
        'No user data received',
        'Network Error',
        'Failed to authenticate'
      ];
      
      if (!silentErrors.some(msg => error.message?.includes(msg))) {
        // Show error toast for unexpected errors
        toast({
          title: 'Authentication Error',
          description: error.message || 'Failed to verify your session',
          variant: 'destructive',
        });
      }
      
      return null;
    }
  }, []);

  // Check authentication status on initial load and when path changes
  useEffect(() => {
    let mounted = true;
    let isChecking = false;

    const verifyAuth = async () => {
      // Prevent multiple simultaneous auth checks
      if (isChecking || !mounted) return;
      
      isChecking = true;
      const currentPath = location.pathname;
      const isAuthRoute = currentPath === '/login' || currentPath === '/';
      const isPublicRoute = isAuthRoute;
      const token = localStorage.getItem('token');

      try {
        if (!mounted) return;
        
        // If no token and not on a public route, redirect to login
        if (!token) {
          if (!isPublicRoute) {
            navigate('/login', { 
              replace: true,
              state: { from: location }
            });
          }
          return;
        }
        
        // If we have a token, verify it
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
          // Clear invalid token and redirect to login if not on a public route
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
          
          if (!isPublicRoute) {
            navigate('/login', { 
              replace: true,
              state: { 
                from: location,
                error: 'Your session has expired. Please log in again.'
              }
            });
          }
        }
      } catch (error) {
        console.error('Auth verification error:', error);
        if (!mounted) return;

        // Clear any invalid data
        localStorage.removeItem('token');
        localStorage.removeItem('user');
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
          isChecking = false;
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

  const login = useCallback(async (credentials: { email?: string; employeeId?: string; password: string }): Promise<boolean> => {
    try {
      const user = await authService.login(credentials);
      const authUser = { ...user, isAuthenticated: true };
      setUser(authUser);
      localStorage.setItem('user', JSON.stringify(authUser));
      
      toast({
        title: 'Login successful',
        description: `Welcome back, ${user.name}`,
        variant: 'default',
      });
      
      // Don't navigate here - let the useEffect handle the redirect
      return true;
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An error occurred during login';
      
      // Clear any invalid tokens
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      
      toast({
        title: 'Login failed',
        description: errorMessage,
        variant: 'destructive',
      });
      
      return false;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const logout = useCallback(async () => {
    try {
      // Call the server-side logout first
      await authService.logout();
    } catch (error) {
      console.warn('Non-critical error during server logout:', error);
      // Continue with client-side cleanup even if server logout fails
    } finally {
      // Clear all auth-related data
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      document.cookie = 'token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      
      // Reset user state
      setUser(null);
      
      // Show logout message
      toast({
        title: 'Logged out',
        description: 'You have been successfully logged out.',
      });
      
      // Force a full page reload to reset all states
      window.location.href = '/login';
    }
  }, [toast]);

  const hasRole = useCallback((role: UserRole): boolean => {
    if (!user) return false;
    return user.role === role;
  }, [user]);

  const contextValue = useMemo(() => ({
    user,
    loading,
    login,
    logout,
    hasRole,
  }), [user, loading, login, logout, hasRole]);

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
