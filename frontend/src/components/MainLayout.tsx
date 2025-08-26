import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserMenu } from '@/components/UserMenu';
import { cn } from '@/lib/utils';
import { UserRole } from '@/types/user';
import { useEffect } from 'react';

interface MainLayoutProps {
  children?: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user?.isAuthenticated) {
      window.location.href = '/login';
    }
  }, [loading, user]);

  if (loading || !user?.isAuthenticated) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  const location = useLocation();
  const isSuperAdmin = user?.role === UserRole.SUPER_ADMIN;


  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center">
            <img className="w-8 h-8 mr-2" src="./logo.png" alt="Thirdvizion" />
            <h1 className="text-xl font-bold">Thirdvizion</h1>
            <nav className="ml-6 flex items-center space-x-4">
              <Link
                to="/dashboard"
                className={cn(
                  'text-sm font-medium transition-colors hover:text-primary',
                  location.pathname === '/dashboard' ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                Dashboard
              </Link>
              <Link
                to="/calendar"
                className={cn(
                  'text-sm font-medium transition-colors hover:text-primary',
                  location.pathname === '/calendar' ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                Calendar
              </Link>
              <Link
                to="/tasks"
                className={cn(
                  'text-sm font-medium transition-colors hover:text-primary',
                  location.pathname === '/tasks' ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                Tasks
              </Link>
              {isSuperAdmin && (
                <Link
                  to="/admin"
                  className={cn(
                    'text-sm font-medium transition-colors hover:text-primary',
                    location.pathname.startsWith('/admin') ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  Admin
                </Link>
              )}
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            <UserMenu />
          </div>
        </div>
      </header>
      <main className="flex-1 p-4 md:p-6">
        {children || <Outlet />}
      </main>
      <footer className="border-t py-4">
        <div className="container text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} ProjectSync. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
