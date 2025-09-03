import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { format, parseISO, isValid } from 'date-fns';
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react';

import { DataTable } from '@/components/ui/data-table';
import { LeaveRequest } from '@/types/leave';
import leaveService from '@/services/leave.service';
import { useToast } from '@/components/ui/use-toast';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

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
    <Button variant="outline" onClick={resetErrorBoundary}>
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

interface LeaveRequestWithUser extends Omit<LeaveRequest, 'startDate' | 'endDate' | 'createdAt' | 'updatedAt'> {
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  updatedAt?: Date;
  userName: string;
  employeeId: string;
  userEmail: string;
  leaveTypeName: string;
  approvedByUserId?: string;
  approvedByUserName?: string;
  days?: number;
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
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const fetchLeaveRequests = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await leaveService.getLeaveRequests();
      const formattedData = data.map(request => ({
        ...request,
        startDate: new Date(request.startDate),
        endDate: new Date(request.endDate),
        createdAt: new Date(request.createdAt),
        updatedAt: request.updatedAt ? new Date(request.updatedAt) : undefined,
      }));
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
          req.id === requestId 
            ? { 
                ...req, 
                status, 
                updatedAt: new Date(),
                approvedByUserId: 'current-user-id', // Replace with actual user ID from auth context
                approvedByUserName: 'Current User' // Replace with actual user name from auth context
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

  const columns = useMemo<ColumnDef<LeaveRequestWithUser>[]>(
    () => [
      {
        accessorKey: 'userName',
        header: 'User Name',
      },
      {
        accessorKey: 'employeeId',
        header: 'Employee ID',
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
          const status = row.original.status;
          let variant: "default" | "secondary" | "destructive" | "outline" = "outline";
          if (status === 'Approved') variant = "default";
          else if (status === 'Rejected') variant = "destructive";
          else if (status === 'Pending') variant = "secondary";
          return <Badge variant={variant}>{status}</Badge>;
        },
      },
      {
        accessorKey: 'createdAt',
        header: 'Requested On',
        cell: ({ row }) => safeFormatDate(row.original.createdAt, 'MMM d, yyyy'),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const request = row.original;
          if (request.status !== 'Pending') {
            return (
              <Badge variant={request.status === 'Approved' ? 'success' : 'destructive'}>
                {request.status}
              </Badge>
            );
          }
          
          return (
            <div className="flex space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleStatusUpdate(request.id, 'Approved')}
                disabled={isProcessing}
                className="text-green-600 hover:bg-green-100"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Approve
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleStatusUpdate(request.id, 'Rejected')}
                disabled={isProcessing}
                className="text-red-600 hover:bg-red-100"
              >
                <XCircle className="h-4 w-4 mr-1" />
                Reject
              </Button>
            </div>
          );
        },
      },
    ],
    [isProcessing, handleStatusUpdate]
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
          <h1 className="text-2xl font-bold">Leave Requests</h1>
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
    </ErrorBoundary>
  );
};

export default AdminLeaveRequestsPage;
