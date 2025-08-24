import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

export default function TestConnection() {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const testConnection = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    
    try {
      console.log('Testing connection to backend...');
      const response = await fetch('http://localhost:5000/api/test', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        credentials: 'include' // Important for cookies, if using them
      });
      
      console.log('Response status:', response.status);
      
      let data;
      try {
        const text = await response.text();
        console.log('Raw response:', text);
        data = text ? JSON.parse(text) : {};
      } catch (parseError) {
        console.error('Failed to parse JSON:', parseError);
        throw new Error('Received non-JSON response from server');
      }
      
      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }
      
      console.log('Successfully connected to backend:', data);
      setMessage(data.message || 'Connection successful!');
    } catch (err) {
      const errorMessage = err instanceof Error ? 
        `Connection failed: ${err.message}` : 
        'Failed to connect to backend';
      
      console.error('Connection test failed:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-4">
        <h1 className="text-2xl font-bold text-center">Connection Test</h1>
        
        <div className="space-y-2">
          <Button 
            onClick={testConnection}
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Testing...' : 'Test Backend Connection'}
          </Button>
          
          {message && (
            <div className="p-4 bg-green-50 text-green-800 rounded-md">
              <p>✅ {message}</p>
              <p className="text-sm mt-1">Backend is running and accessible!</p>
            </div>
          )}
          
          {error && (
            <div className="p-4 bg-red-50 text-red-800 rounded-md">
              <p>❌ {error}</p>
              <p className="text-sm mt-1">
                Make sure the backend server is running on port 5000.
              </p>
            </div>
          )}
          
          <div className="mt-4 p-4 bg-blue-50 text-blue-800 rounded-md">
            <h3 className="font-medium">Troubleshooting:</h3>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
              <li>Is the backend server running? (check terminal)</li>
              <li>Is CORS properly configured in the backend?</li>
              <li>Check browser's developer console for errors (F12)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
