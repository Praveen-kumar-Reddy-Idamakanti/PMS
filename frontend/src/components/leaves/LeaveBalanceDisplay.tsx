import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LeaveBalance, LeaveType } from '@/types/leave';
import leaveService from '@/services/leave.service';
import { useToast } from '@/components/ui/use-toast';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';

export const LeaveBalanceDisplay: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }
      try {
        const [fetchedBalances, fetchedTypesResponse] = await Promise.all([
          leaveService.getLeaveBalances(user.id),
          leaveService.getLeaveTypes(),
        ]);
        setBalances(fetchedBalances);
        
        // Handle both array and { success, data } response formats
        const leaveTypesData = Array.isArray(fetchedTypesResponse) 
          ? fetchedTypesResponse 
          : (fetchedTypesResponse.data || []);
        setLeaveTypes(leaveTypesData);
      } catch (error) {
        console.error('Failed to fetch leave data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load leave balances. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [toast, user?.id]);

  if (isLoading) {
    return <div className="flex justify-center items-center h-32"><LoadingSpinner /></div>;
  }

  if (balances.length === 0) {
    return <p className="text-muted-foreground">No leave balances found.</p>;
  }

  const getLeaveTypeName = (leaveTypeId: string) => {
    const type = leaveTypes.find(t => t.id === leaveTypeId);
    return type ? type.name : 'Unknown Leave Type';
  };

  return (
    <div className="grid gap-4">
      {balances.map((balance) => (
        <Card key={balance.id}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {getLeaveTypeName(balance.leaveTypeId)}
            </CardTitle>
            {/* Icon can be added here */}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{balance.remainingDays} days</div>
            <p className="text-xs text-muted-foreground">
              Balance for {balance.year}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
