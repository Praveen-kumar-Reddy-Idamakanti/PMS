import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/user';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
  redirectTo?: string;
  children?: React.ReactNode;
}

export const ProtectedRoute = ({
  allowedRoles = [],
  redirectTo = '/login',
  children
}: ProtectedRouteProps & { children?: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>; // Or a loading spinner
  }

  // If user is not logged in, redirect to login
  if (!user) {
    return <Navigate to={redirectTo} replace />;
  }

  // If no specific roles are required, allow access
  if (allowedRoles.length === 0) {
    return children ? <>{children}</> : <Outlet />;
  }

  // Check if user has any of the required roles
  const hasRequiredRole = allowedRoles.some(role => user.role === role);

  if (!hasRequiredRole) {
    // User doesn't have required role, redirect to dashboard or home
    return <Navigate to="/dashboard" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};
