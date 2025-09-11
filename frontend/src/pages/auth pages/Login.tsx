import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LoginForm } from '@/components/auth/LoginForm';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingGif } from '@/components/ui/LoadingGif';

interface LoginCredentials {
  email?: string;
  employeeId?: string;
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

  const handleLogin = async (credentials: { email?: string; employeeId?: string; password: string }) => {
    console.log('Login form submitted with credentials:', credentials);
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      console.log('Calling login function with credentials...');
      const success = await login(credentials);
      console.log('Login result:', { success, user });
      
      if (success) {
        // Navigate after successful login
        const redirectPath = locationState?.from?.pathname || '/dashboard';
        console.log('Login successful, redirecting to:', redirectPath);
        navigate(redirectPath, { replace: true });
        
        toast({
          title: 'Login successful',
          description: `Welcome back!`,
        });
      } else {
        console.log('Login failed: Invalid credentials');
      }
    } catch (error) {
      console.error('Login error details:', error);
      console.error('Login error:', error);
      let errorMessage = 'Invalid credentials';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      toast({
        title: 'Login failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Thirdvizion Labs
          </h1>
          <p className="text-muted-foreground">
            Login
          </p>
        </div>
        
        {isLoading || authLoading ? (
          <div className="min-h-screen flex items-center justify-center">
            <LoadingGif text="Authenticating..." />
          </div>
        ) : (
          <LoginForm onLogin={handleLogin} isLoading={isLoading} />
        )}
        
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