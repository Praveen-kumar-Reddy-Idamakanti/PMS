import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { fetchWithAuth } from '@/lib/api';

import { RemoteRequest } from '@/types/remoteRequest';

export const RemoteAttendanceRequests = () => {
  const [requests, setRequests] = useState<RemoteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);

  const fetchRequests = async () => {
    try {
      const response = await fetchWithAuth('/remote-attendance/pending');
      const data = await response.json();
      if (response.ok) {
        setRequests(data);
      } else {
        throw new Error(data.message || 'Failed to fetch requests');
      }
    } catch (error) {
      console.error('Error fetching remote requests:', error);
      toast.error('Failed to load remote work requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = async (requestId: number) => {
    try {
      setUpdating(requestId);
      const response = await fetchWithAuth(`/remote-attendance/${requestId}/approve`, {
        method: 'PUT',
        body: JSON.stringify({
          comments: 'Approved by admin'
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to approve request');
      }
      
      await fetchRequests();
      toast.success('Request approved successfully');
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error(error.message || 'Failed to approve request');
    } finally {
      setUpdating(null);
    }
  };

  const handleReject = async (requestId: number) => {
    const reason = prompt('Please enter the reason for rejection:');
    if (!reason) return;

    try {
      setUpdating(requestId);
      const response = await fetchWithAuth(`/remote-attendance/${requestId}/reject`, {
        method: 'PUT',
        body: JSON.stringify({
          comments: reason
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to reject request');
      }
      
      await fetchRequests();
      toast.success('Request rejected successfully');
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error(error.message || 'Failed to reject request');
    } finally {
      setUpdating(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    
    return (
      <Badge className={`${statusMap[status as keyof typeof statusMap]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (loading) {
    return <div>Loading remote work requests...</div>;
  }

  return (
    <Card>
    
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Request Date</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Requested On</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4">
                  No pending requests found
                </TableCell>
              </TableRow>
            ) : (
              requests.map((request) => (
                <TableRow key={request.request_id}>
                  <TableCell>{request.user_name}</TableCell>
                  <TableCell>
                    {format(new Date(request.request_date), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    <div className="truncate" title={request.reason}>
                      {request.reason}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(request.status)}</TableCell>
                  <TableCell>
                    {format(new Date(request.created_at), 'MMM dd, yyyy HH:mm')}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleApprove(request.request_id)}
                        disabled={request.status !== 'pending' || updating === request.request_id}
                      >
                        {updating === request.request_id ? 'Approving...' : 'Approve'}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleReject(request.request_id)}
                        disabled={request.status !== 'pending' || updating === request.request_id}
                      >
                        {updating === request.request_id ? 'Rejecting...' : 'Reject'}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default RemoteAttendanceRequests;