import React, { useEffect, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';

import { DataTable } from '@/components/ui/data-table';
import { LeaveRequest, LeaveType } from '@/types/leave';
import leaveService, { type LeaveHistoryResponse } from '@/services/leave.service';
import { useToast } from '@/components/ui/use-toast';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';

interface LeaveTypesResponse {
  success: boolean;
  data: LeaveType[];
}

export const LeaveHistoryTable: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [history, setHistory] = useState<LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypeList] = useState<LeaveType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('LeaveHistoryTable: Component mounted or user changed', { userId: user?.id });
    
    const fetchData = async () => {
      if (!user?.id) {
        console.log('LeaveHistoryTable: No user ID, skipping fetch');
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      try {
        console.log('LeaveHistoryTable: Fetching leave history and types...');
        const [leaveHistoryResponse, leaveTypesResponse] = await Promise.all([
          leaveService.getLeaveHistory(user.id).catch(error => {
            console.warn('Error fetching leave history, will show empty state:', error);
            return { success: true, data: [] }; // Return empty data on error
          }),
          leaveService.getLeaveTypes().catch(error => {
            console.warn('Error fetching leave types:', error);
            return [];
          }),
        ]);
        
        console.log('LeaveHistoryTable: Fetched data:', {
          history: leaveHistoryResponse,
          types: leaveTypesResponse
        });
        
        // Set the history data from the response
        if (leaveHistoryResponse?.success && Array.isArray(leaveHistoryResponse.data)) {
          setHistory(leaveHistoryResponse.data);
        } else {
          console.error('Invalid leave history response format:', leaveHistoryResponse);
          setHistory([]);
        }
        
        // Set leave types
        if (Array.isArray(leaveTypesResponse)) {
          setLeaveTypeList(leaveTypesResponse);
        } else if (leaveTypesResponse && 'data' in leaveTypesResponse) {
          setLeaveTypeList(leaveTypesResponse.data);
        } else {
          console.error('Invalid leave types response format:', leaveTypesResponse);
          setLeaveTypeList([]);
        }
      } catch (error) {
        console.error('LeaveHistoryTable: Failed to fetch data:', error);
        // Don't show error toast here as we're handling errors in the individual requests
        setHistory([]);
        setLeaveTypeList([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [toast, user?.id]);

  const getLeaveTypeName = (request: LeaveRequest) => {
    if (request.leave_type) return request.leave_type;
    const type = leaveTypes.find(t => t.id.toString() === request.leave_type_id.toString());
    return type ? type.name : 'Unknown';
  };

  const columns: ColumnDef<LeaveRequest>[] = [
    {
      accessorKey: 'leave_type',
      header: 'Leave Type',
      cell: ({ row }) => getLeaveTypeName(row.original),
    },
    {
      accessorKey: 'start_date',
      header: 'Start Date',
      cell: ({ row }) => row.original.start_date ? format(new Date(row.original.start_date), 'PPP') : '-',
    },
    {
      accessorKey: 'end_date',
      header: 'End Date',
      cell: ({ row }) => row.original.end_date ? format(new Date(row.original.end_date), 'PPP') : '-',
    },
    {
      accessorKey: 'reason',
      header: 'Reason',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => row.original.status.charAt(0).toUpperCase() + row.original.status.slice(1),
    },
    {
      accessorKey: 'created_at',
      header: 'Requested On',
      cell: ({ row }) => format(new Date(row.original.created_at), 'PPP'),
    },
  ];

  if (isLoading) {
    return <div className="flex justify-center items-center h-32"><LoadingSpinner /></div>;
  }
  
  // Show empty state if no history is available
  if (history.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        <p>No leave history found</p>
      </div>
    );
  }
  
  console.log('LeaveHistoryTable: Rendering with data:', { history, leaveTypes });

  return (
    <DataTable columns={columns} data={history} />
  );
};
