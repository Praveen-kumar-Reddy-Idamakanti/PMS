import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SignUpForm } from '@/components/auth/SignUpForm';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/user';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
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

  const { toast } = useToast();

  const handleSuccess = () => {
    // Show success toast
    toast({
      title: 'Success',
      description: 'User created successfully!',
      duration: 2000, // 2 seconds
    });
    
    // Redirect to dashboard after a short delay
    setTimeout(() => {
      navigate('/dashboard');
    }, 1000);
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="flex justify-between items-center mb-4">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Badge variant="outline" className="px-3 py-1 text-sm">
          {user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase()}
        </Badge>
      </div>
      
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
