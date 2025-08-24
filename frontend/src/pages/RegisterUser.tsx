import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SignUpForm } from '@/components/auth/SignUpForm';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/user';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function RegisterUser() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Only allow admin and team leaders to access this page
  const canAccess = user && (
    user.role === UserRole.ADMIN || 
    user.role === UserRole.TEAM_LEADER
  );

  if (!user) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>Please log in to access this page.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/login')}>Go to Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You don't have permission to access this page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSuccess = () => {
    // You can add any success handling here
    // For example, show a success message or redirect
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Button 
        variant="ghost" 
        className="mb-4"
        onClick={() => navigate(-1)}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>
      
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Create New User</CardTitle>
          <CardDescription>
            {user.role === UserRole.ADMIN 
              ? 'Create a new user with any role.' 
              : 'You can create new employees and interns.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignUpForm onSuccess={handleSuccess} />
        </CardContent>
      </Card>
    </div>
  );
}
