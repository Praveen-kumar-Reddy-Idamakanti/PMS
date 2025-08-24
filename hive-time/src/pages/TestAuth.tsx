import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';

const TestAuth: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('test@example.com');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userData, setUserData] = useState<any>(null);
  const [token, setToken] = useState('');
  
  const { user, login, logout: contextLogout, loading: authLoading } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    // Auto-fill with test credentials
    setEmail('test@example.com');
    setPassword('password123');
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const success = await login(email, password);
      if (success) {
        setError('');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    contextLogout();
    setUserData(null);
    setToken('');
  };

  const fetchUserData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch('http://localhost:5000/api/auth/user', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'x-auth-token': localStorage.getItem('token') || ''
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.msg || 'Failed to fetch user data');
      }
      
      setUserData(data.user);
      setToken(localStorage.getItem('token') || '');
      
    } catch (err: any) {
      setError(err.message || 'Failed to fetch user data');
      console.error('Error fetching user data:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Authentication Test</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Login</CardTitle>
          <CardDescription>Test the authentication flow</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="test@example.com"
                disabled={loading}
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {loading ? 'Logging in...' : 'Login'}
              </Button>
              {user && (
                <Button type="button" variant="outline" onClick={handleLogout}>
                  Logout
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>User Data</CardTitle>
          <CardDescription>Current authentication state</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium">Auth Context State:</h3>
              <pre className="bg-muted p-4 rounded-md mt-2 text-sm overflow-x-auto">
                {JSON.stringify({
                  isAuthenticated: !!user,
                  user,
                  loading: authLoading
                }, null, 2)}
              </pre>
            </div>
            
            <div>
              <h3 className="font-medium">Local Storage Token:</h3>
              <div className="bg-muted p-4 rounded-md mt-2 text-sm overflow-x-auto whitespace-nowrap overflow-hidden text-ellipsis">
                {localStorage.getItem('token') || 'No token found'}
              </div>
            </div>
            
            <div>
              <h3 className="font-medium">API User Data:</h3>
              <div className="flex justify-between items-center mb-2">
                <span>Fetched user data from /api/auth/user</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={fetchUserData}
                  disabled={loading || !user}
                >
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {loading ? 'Loading...' : 'Fetch User Data'}
                </Button>
              </div>
              <pre className="bg-muted p-4 rounded-md text-sm overflow-x-auto">
                {userData ? JSON.stringify(userData, null, 2) : 'No data fetched'}
              </pre>
            </div>
            
            <div>
              <h3 className="font-medium">Cookies:</h3>
              <pre className="bg-muted p-4 rounded-md text-sm overflow-x-auto">
                {document.cookie || 'No cookies found'}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TestAuth;
