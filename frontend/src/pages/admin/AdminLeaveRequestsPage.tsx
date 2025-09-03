import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { format, parseISO, isValid } from 'date-fns';
import { CheckCircle, XCircle, RefreshCw, User, Mail, Calendar, Clock } from 'lucide-react';

import { DataTable } from '@/components/ui/data-table';
import { LeaveRequest } from '@/types/leave';
import leaveService from '@/services/leave.service';
import { useToast } from '@/components/ui/use-toast';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';

// Error boundary component
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback: React.ReactNode;
  onReset: () => void;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, { hasError: boolean }> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by error boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// Error boundary fallback component
const ErrorFallback = ({ error, resetErrorBoundary }: { error: Error, resetErrorBoundary: () => void }) => (
  <div role="alert" className="p-4 border border-red-300 bg-red-50 rounded-md">
    <p className="font-bold text-red-700">Something went wrong:</p>
    <pre className="text-red-600 mb-4">{error.message}</pre>
    <Button
      variant="outline"
      onClick={resetErrorBoundary}
    >
      Try again
    </Button>
  </div>
);

// Utility function to safely format dates
const safeFormatDate = (dateString: string | Date, formatStr: string) => {
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    return isValid(date) ? format(date, formatStr) : 'Invalid date';
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
};

interface LeaveRequestWithUser {
  // Base fields
  id: number;
  userId: number;
  leaveTypeId: number;
  reason: string;
  status: string;
  days: number;
  name: string;
  email: string;
  
  // Date fields
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  updatedAt?: Date;
  
  // User info
  userName: string;
  userEmail: string;
  employeeId: string | null;
  
  // Leave type info
  leaveTypeName: string;
  
  // Approval info
  approvedByUserId?: string | null;
  approvedByUserName?: string | null;
}

// Status filter options
const statusFilterOptions = [
  { value: 'all', label: 'All Statuses' },
  { value: 'Pending', label: 'Pending' },
  { value: 'Approved', label: 'Approved' },
  { value: 'Rejected', label: 'Rejected' },
] as const;

export const AdminLeaveRequestsPage: React.FC = () => {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  
  // Confirmation dialog state
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequestWithUser | null>(null);
  const [pendingAction, setPendingAction] = useState<'approve' | 'reject' | null>(null);

  // Define the API response type - this should match the actual API response
  type LeaveRequestApiResponse = Omit<LeaveRequest, 'startDate' | 'endDate' | 'createdAt' | 'updatedAt'> & {
    startDate: string;
    endDate: string;
    createdAt: string;
    updatedAt?: string;
    // Ensure these fields are required in the response
    userName: string;
    userEmail: string;
    employeeId: string | null;
    leaveTypeId: number | string; // Handle both number and string types
    leaveTypeName: string;
    days: number;
    reason: string;
    status: 'pending' | 'approved' | 'rejected' | 'Pending' | 'Approved' | 'Rejected';
    approvedByUserId?: string | null;
    approvedByUserName?: string | null;
    // Optional nested objects for backward compatibility
    user?: {
      name: string;
      employeeId: string | null;
      email: string;
    };
    leaveType?: {
      name: string;
    };
    approvedByUser?: {
      name: string;
    };
  }

  // Define valid status types
  type LeaveStatus = 'pending' | 'approved' | 'rejected';
  
  // Helper function to safely parse status
  const parseStatus = (status: unknown): LeaveStatus => {
    if (typeof status !== 'string') return 'pending';
    const normalized = status.toLowerCase().trim();
    if (['pending', 'approved', 'rejected'].includes(normalized)) {
      return normalized as LeaveStatus;
    }
    return 'pending';
  };

  const fetchLeaveRequests = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await leaveService.getAllLeaveRequests();
      console.log('Raw API response:', response);
      
      if (!Array.isArray(response)) {
        console.error('Expected array of leave requests, got:', response);
        throw new Error('Invalid response format');
      }
      
      const formattedData = response.map(request => {
        // Parse and normalize status
        const status = parseStatus(request.status);
        
        // Log each request for debugging
        console.log('Processing request:', { 
          id: request.id, 
          originalStatus: request.status,
          normalizedStatus: status
        });
          try {
            // Map the response to match LeaveRequestWithUser interface
            const mappedRequest: LeaveRequestWithUser = {
              // Base fields
              id: request.id,
              userId: request.userId,
              leaveTypeId: request.leaveTypeId,
              reason: request.reason || '',
              status: parseStatus(request.status),
              days: request.days || 0,
              name: request.userName || 'Unknown User',
              email: request.userEmail || '',
              // Date fields
              startDate: new Date(request.startDate),
              endDate: new Date(request.endDate),
              createdAt: new Date(request.createdAt),
              updatedAt: request.updatedAt ? new Date(request.updatedAt) : undefined,
              // User info
              userName: request.userName || 'Unknown User',
              userEmail: request.userEmail || '',
              employeeId: request.employeeId || null,
              // Leave type info
              leaveTypeName: request.leaveTypeName || 'Unknown Type',
              // Approval info
              approvedByUserId: request.approvedByUserId?.toString() || null,
              approvedByUserName: request.approvedByUserName || null,
            };
            
            return mappedRequest;
          } catch (error) {
            console.error('Error processing leave request:', error, request);
            return null;
          }
        })
        .filter((request): request is LeaveRequestWithUser => request !== null);
      
      setLeaveRequests(formattedData);
    } catch (err) {
      console.error('Error fetching leave requests:', err);
      setError('Failed to load leave requests. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaveRequests();
  }, [fetchLeaveRequests]);

  const handleStatusUpdate = useCallback(async (requestId: string, status: 'Approved' | 'Rejected') => {
    try {
      setIsProcessing(true);
      await leaveService.updateLeaveRequestStatus(requestId, status.toLowerCase() as 'approved' | 'rejected');
      
      // Update the local state to reflect the change
      setLeaveRequests(prev => 
        prev.map(req => 
          req.id.toString() === requestId 
            ? { 
                ...req, 
                status, 
                updatedAt: new Date(),
                approvedByUserId: currentUser?.id?.toString() || null,
                approvedByUserName: currentUser?.name || null
              } 
            : req
        )
      );
      
      toast({
        title: 'Success',
        description: `Leave request ${status} successfully`,
        variant: 'default',
      });
    } catch (error) {
      console.error('Error updating leave request status:', error);
      toast({
        title: 'Error',
        description: `Failed to ${status.toLowerCase()} leave request`,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);

  // Handle approve/reject actions
  const handleApproveReject = useCallback(async (request: LeaveRequestWithUser, action: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setPendingAction(action);
    setIsConfirmOpen(true);
  }, []);

  const confirmAction = useCallback(async () => {
    if (!selectedRequest || !pendingAction) return;
    
    setIsProcessing(true);
    try {
      const requestId = selectedRequest.id;
      const status = pendingAction === 'approve' ? 'approved' : 'rejected';
      const response = await leaveService.updateLeaveRequestStatus(requestId.toString(), status);
      
      if (response) {
        toast({
          title: `Leave request ${pendingAction === 'approve' ? 'approved' : 'rejected'} successfully`,
          variant: 'default',
        });
        // Refresh the leave requests
        await fetchLeaveRequests();
      } else {
        throw new Error('Failed to update leave request');
      }
    } catch (error) {
      console.error(`Error ${pendingAction}ing leave request:`, error);
      toast({
        title: `Failed to ${pendingAction} leave request`,
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
      setIsConfirmOpen(false);
      setSelectedRequest(null);
      setPendingAction(null);
    }
  }, [selectedRequest, pendingAction, fetchLeaveRequests, toast]);

  // Filter leave requests by status
  const filteredLeaveRequests = useMemo(() => {
    return leaveRequests.filter(request => {
      if (statusFilter === 'all') return true;
      return request.status === statusFilter;
    });
  }, [leaveRequests, statusFilter]);

  // Pagination
  const paginatedData = useMemo(() => {
    const start = pagination.pageIndex * pagination.pageSize;
    return filteredLeaveRequests.slice(start, start + pagination.pageSize);
  }, [filteredLeaveRequests, pagination.pageIndex, pagination.pageSize]);

  // Reset pagination when filtering or data changes
  useEffect(() => {
    if (filteredLeaveRequests.length <= pagination.pageIndex * pagination.pageSize) {
      setPagination(prev => ({
        ...prev,
        pageIndex: 0
      }));
    }
  }, [filteredLeaveRequests, pagination.pageSize]);

  const handleRefresh = () => {
    fetchLeaveRequests();
  };

  const columns: ColumnDef<LeaveRequestWithUser>[] = useMemo(
    () => [
    {
      accessorKey: 'userName',
      header: 'Employee Name',
    },
    {
      accessorKey: 'employeeId',
      header: 'Employee ID',
      cell: ({ row }) => row.original.employeeId || 'N/A',
    },
    {
      accessorKey: 'leaveTypeName',
      header: 'Leave Type',
    },
    {
      accessorKey: 'startDate',
      header: 'Start Date',
      cell: ({ row }) => safeFormatDate(row.original.startDate, 'MMM d, yyyy'),
    },
    {
      accessorKey: 'endDate',
      header: 'End Date',
      cell: ({ row }) => safeFormatDate(row.original.endDate, 'MMM d, yyyy'),
    },
    {
      accessorKey: 'days',
      header: 'Days',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = parseStatus(row.original.status);
        const variant = {
          approved: 'default',
          rejected: 'destructive',
          pending: 'outline'
        }[status];
        
        return (
          <Badge 
            variant={variant as any} 
            className={status === 'approved' ? 'bg-orange-500 hover:bg-orange-600 text-white' : ''}
          >
            {status}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'createdAt',
      header: 'Requested On',
      cell: ({ row }) => safeFormatDate(row.original.createdAt, 'MMM d, yyyy'),
    },
    {
      id: 'actions',
      header: () => <div className="text-center w-full">Actions</div>,
      cell: ({ row }) => {
        const request = row.original;
        const status = parseStatus(request.status);
        
        // Only show action buttons for pending requests
        if (status !== 'pending') {
          return (
            <div className="flex justify-center">
              <Badge 
                variant={status === 'approved' ? 'default' : 'destructive'}
                className={`${status === 'approved' ? 'bg-orange-500 hover:bg-orange-600' : ''} text-white`}
              >
                {status}
              </Badge>
            </div>
          );
        }
        
        return (
          <div className="flex space-x-3">
            <Button
              variant="default"
              size="sm"
              className="h-9 px-4 bg-orange-500 hover:bg-orange-600 text-white shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-1.5"
              onClick={(e) => {
                e.stopPropagation();
                handleApproveReject(request, 'approve');
              }}
              disabled={isProcessing}
            >
              <CheckCircle className="h-4 w-4" />
              <span>Approve</span>
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="h-9 px-4 shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-1.5"
              onClick={(e) => {
                e.stopPropagation();
                handleApproveReject(request, 'reject');
              }}
              disabled={isProcessing}
            >
              <XCircle className="h-4 w-4" />
              <span>Reject</span>
            </Button>
          </div>
          );
        },
      },
    ],
    [isProcessing, handleApproveReject]
  );

  return (
    <ErrorBoundary
      fallback={
        <ErrorFallback 
          error={new Error('Something went wrong')} 
          resetErrorBoundary={fetchLeaveRequests} 
        />
      }
      onReset={fetchLeaveRequests}
    >
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col space-y-4 md:flex-row md:justify-between md:items-center mb-6">
          <div className="flex items-center space-x-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading || isProcessing}
            >
              {statusFilterOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading || isProcessing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700">{error}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchLeaveRequests}
              className="mt-2 text-red-600 hover:bg-red-100"
              disabled={isLoading || isProcessing}
            >
              Retry
            </Button>
          </div>
        )}

        <div className="bg-white rounded-md border overflow-hidden">
          <DataTable
            columns={columns}
            data={paginatedData}
            isLoading={isLoading || isProcessing}
            pagination={{
              current: pagination.pageIndex + 1,
              pageSize: pagination.pageSize,
              total: filteredLeaveRequests.length,
              onChange: (page, pageSize) => {
                setPagination(prev => ({
                  ...prev,
                  pageIndex: page - 1,
                  pageSize: pageSize || prev.pageSize,
                }));
              },
            }}
          />
        </div>
      </div>
      
      {/* Confirmation Dialog */}
      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction === 'approve' 
                ? 'This will approve the leave request. The employee will be notified.'
                : 'This will reject the leave request. The employee will be notified.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                confirmAction();
              }}
              disabled={isProcessing}
              className={pendingAction === 'reject' ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {isProcessing ? 'Processing...' : pendingAction === 'approve' ? 'Approve' : 'Reject'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ErrorBoundary>
  );
};

export default AdminLeaveRequestsPage;
