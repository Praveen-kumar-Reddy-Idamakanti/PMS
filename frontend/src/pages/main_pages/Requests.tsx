import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Plus, Calendar, Filter } from 'lucide-react';
import { remoteAttendanceService, CreateRemoteRequestData } from '@/services/remoteAttendance.service';
import { RemoteRequest } from '@/types/remoteRequest';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LeaveRequestPage } from './LeaveRequestPage';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function Requests() {
  const [requests, setRequests] = useState<RemoteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<CreateRemoteRequestData>({
    request_date: '',
    reason: ''
  });

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const data = await remoteAttendanceService.getMyRequests();
      setRequests(data);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast.error('Failed to load remote work requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.request_date || !formData.reason.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      setCreating(true);
      await remoteAttendanceService.createRequest(formData);
      toast.success('Remote work request submitted successfully');
      setIsDialogOpen(false);
      setFormData({ request_date: '', reason: '' });
      await fetchRequests();
    } catch (error) {
      console.error('Error creating request:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create request');
    } finally {
      setCreating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      approved: 'bg-green-100 text-green-800 border-green-300',
      rejected: 'bg-red-100 text-red-800 border-red-300',
    };
    
    return (
      <Badge variant="outline" className={`${statusMap[status as keyof typeof statusMap]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getStatusStats = () => {
    const pending = requests.filter(r => r.status === 'pending').length;
    const approved = requests.filter(r => r.status === 'approved').length;
    const rejected = requests.filter(r => r.status === 'rejected').length;
    return { pending, approved, rejected, total: requests.length };
  };

  const stats = getStatusStats();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-3xl font-bold tracking-tight mb-6">My Requests</h1>

        <Tabs defaultValue="leave" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="leave">Leave Requests</TabsTrigger>
            <TabsTrigger value="remote-work">Remote Work Requests</TabsTrigger>
          </TabsList>

          <TabsContent value="leave">
            <LeaveRequestPage />
          </TabsContent>

          <TabsContent value="remote-work">
            {/* Remote Work Request Content */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Calendar className="w-6 h-6 text-primary" />
                  <h2 className="text-xl font-bold text-foreground">Remote Work Requests</h2>
                  <Badge variant="outline">{stats.total} Total</Badge>
                </div>
                
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      New Request
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Request Remote Work</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateRequest} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="request_date">Request Date</Label>
                        <Input
                          id="request_date"
                          type="date"
                          value={formData.request_date}
                          onChange={(e) => setFormData(prev => ({ ...prev, request_date: e.target.value }))}
                          min={new Date().toISOString().split('T')[0]} // Prevent past dates
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reason">Reason for Remote Work</Label>
                        <Textarea
                          id="reason"
                          placeholder="Please provide a reason for your remote work request..."
                          value={formData.reason}
                          onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                          rows={4}
                          required
                        />
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setIsDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" disabled={creating}>
                          {creating ? <LoadingSpinner /> : 'Submit Request'}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Requests</p>
                        <p className="text-2xl font-bold">{stats.total}</p>
                      </div>
                      <Calendar className="w-8 h-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Pending</p>
                        <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                      </div>
                      <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                        <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Approved</p>
                        <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
                      </div>
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Rejected</p>
                        <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
                      </div>
                      <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                        <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Requests Table */}
              <Card>
                <CardHeader>
                  <CardTitle>My Remote Work Requests</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-center">
                        <LoadingSpinner />
                        <p className="text-muted-foreground">Loading requests...</p>
                      </div>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Request Date</TableHead>
                          <TableHead>Reason</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Submitted On</TableHead>
                          <TableHead>Reviewed On</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {requests.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8">
                              <div className="text-center">
                                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                                <p className="text-muted-foreground">No remote work requests found</p>
                                <p className="text-sm text-muted-foreground">
                                  Click "New Request" to submit your first remote work request
                                </p>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          requests.map((request) => (
                            <TableRow key={request.request_id}>
                              <TableCell className="font-medium">
                                {format(new Date(request.request_date), 'MMM dd, yyyy')}
                              </TableCell>
                              <TableCell className="max-w-xs">
                                <div className="truncate" title={request.reason}>
                                  {request.reason}
                                </div>
                              </TableCell>
                              <TableCell>{getStatusBadge(request.status)}</TableCell>
                              <TableCell>
                                {format(new Date(request.created_at), 'MMM dd, yyyy HH:mm')}
                              </TableCell>
                              <TableCell>
                                {request.approved_at || request.rejected_at ? (
                                  format(
                                    new Date(request.approved_at || request.rejected_at!), 
                                    'MMM dd, yyyy HH:mm'
                                  )
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}