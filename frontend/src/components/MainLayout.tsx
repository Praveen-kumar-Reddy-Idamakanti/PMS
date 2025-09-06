import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserMenu } from '@/components/UserMenu';
import { cn } from '@/lib/utils';
import { UserRole } from '@/types/user';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';

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
        <div className="container flex h-16 items-center justify-between px-4 relative">
          <div className="flex items-center">
            <img className="w-8 h-8 mr-2" src="/logo.png" alt={"Thirdvision labs"} />
            <h1 className="text-xl font-bold">
              Thirdvision labs
            </h1>
            {/* Desktop nav */}
            <nav className="ml-6 hidden md:flex items-center space-x-4">
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
              <Link
                to="/requests"
                className={cn(
                  'text-sm font-medium transition-colors hover:text-primary',
                  location.pathname === '/requests' ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                Requests
              </Link>
              <Link
                to="/events"
                className={cn(
                  'text-sm font-medium transition-colors hover:text-primary',
                  location.pathname === '/events' ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                Events
              </Link>
              {isSuperAdmin && (
                <Link
                  to="/admin"
                  className={cn(
                    'text-sm font-medium transition-colors hover:text-primary',
                    (location.pathname === '/admin' || location.pathname.startsWith('/admin/')) ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  Admin
                </Link>
              )}
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            {/* Mobile hamburger */}
            <div className="md:hidden">
              <MobileNav />
            </div>
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

function MobileNav() {
  const location = useLocation();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === UserRole.SUPER_ADMIN;
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <Button variant="outline" size="icon" onClick={() => setOpen((v) => !v)} aria-label="Open navigation">
        <Menu className="h-5 w-5" />
      </Button>
      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-md border bg-background shadow-lg z-30">
          <nav className="py-2">
            <Link to="/dashboard" onClick={() => setOpen(false)}
              className={cn('block px-4 py-2 text-sm hover:bg-accent', location.pathname === '/dashboard' ? 'text-primary' : '')}>
              Dashboard
            </Link>
            <Link to="/calendar" onClick={() => setOpen(false)}
              className={cn('block px-4 py-2 text-sm hover:bg-accent', location.pathname === '/calendar' ? 'text-primary' : '')}>
              Calendar
            </Link>
            <Link to="/tasks" onClick={() => setOpen(false)}
              className={cn('block px-4 py-2 text-sm hover:bg-accent', location.pathname === '/tasks' ? 'text-primary' : '')}>
              Tasks
            </Link>
            <Link to="/requests" onClick={() => setOpen(false)}
              className={cn('block px-4 py-2 text-sm hover:bg-accent', location.pathname === '/requests' ? 'text-primary' : '')}>
              Requests
            </Link>
            <Link to="/events" onClick={() => setOpen(false)}
              className={cn('block px-4 py-2 text-sm hover:bg-accent', location.pathname === '/events' ? 'text-primary' : '')}>
              Events
            </Link>
            {isSuperAdmin && (
              <Link to="/admin" onClick={() => setOpen(false)}
                className={cn('block px-4 py-2 text-sm hover:bg-accent', (location.pathname === '/admin' || location.pathname.startsWith('/admin/')) ? 'text-primary' : '')}>
                Admin
              </Link>
            )}
          </nav>
        </div>
      )}
    </div>
  );
}
