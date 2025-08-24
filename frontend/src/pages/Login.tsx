import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LoginForm } from '@/components/auth/LoginForm';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface LoginCredentials {
  identifier: string;
  password: string;
}

interface LocationState {
  from?: {
    pathname: string;
  };
  error?: string;
}

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const { login, user, loading: authLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const locationState = location.state as LocationState | undefined;

  // Handle redirect if already authenticated
  useEffect(() => {
    if (user?.isAuthenticated && !isLoading) {
      const redirectPath = locationState?.from?.pathname || '/dashboard';
      // Only navigate if we're not already on the target path
      if (location.pathname !== redirectPath) {
        navigate(redirectPath, { replace: true });
      }
    }
  }, [user, navigate, locationState, isLoading, location.pathname]);

  // Show session expired message if redirected from auth check
  useEffect(() => {
    if (locationState?.error) {
      toast({
        title: 'Session Expired',
        description: locationState.error,
        variant: 'destructive',
      });
      // Clear the error from state to prevent showing it again on refresh
      window.history.replaceState({}, document.title);
    }
  }, [locationState, toast]);

  const handleLogin = async (credentials: { identifier: string; password: string }) => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      const success = await login(credentials.identifier, credentials.password);
      if (!success) {
        throw new Error('Login failed. Please check your email and password.');
      }
      
      // Clear any error state from location
      if (locationState?.error) {
        window.history.replaceState({}, document.title);
      }
      
      // Navigate to dashboard or previous location
      const redirectPath = locationState?.from?.pathname || '/dashboard';
      if (location.pathname !== redirectPath) {
        navigate(redirectPath, { replace: true });
      }
      
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      
      if (!errorMessage.includes('Network Error')) {
        toast({
          title: 'Login Failed',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            ProjectSync
          </h1>
          <p className="text-muted-foreground">
            Project Management & Attendance System
          </p>
        </div>
        
        <LoginForm onLogin={handleLogin} isLoading={isLoading} />
        
        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>Demo credentials:</p>
          <p className="font-mono text-xs mt-1">
            Email: admin@example.com | Password: admin123
          </p>
        </div>
      </div>
    </div>
  );
}