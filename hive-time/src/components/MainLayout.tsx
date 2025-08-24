import { Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserMenu } from '@/components/UserMenu';
import { Button } from '@/components/ui/button';
import { LogIn } from 'lucide-react';
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

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold">ProjectSync</h1>
          </div>
          <div className="flex items-center space-x-4">
            <UserMenu />
          </div>
        </div>
      </header>
      <main className="flex-1 container py-6">
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
