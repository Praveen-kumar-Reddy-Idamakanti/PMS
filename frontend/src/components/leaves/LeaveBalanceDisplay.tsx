import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LeaveBalance, LeaveType } from '@/types/leave';
import leaveService from '@/services/leave.service';
import { useToast } from '@/components/ui/use-toast';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';

interface LeaveBalanceDisplayProps {
  refreshKey?: number;
}

export const LeaveBalanceDisplay: React.FC<LeaveBalanceDisplayProps> = ({ refreshKey = 0 }) => {
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
  }, [toast, user?.id, refreshKey]);

  if (isLoading) {
    return <div className="flex justify-center items-center h-32"><LoadingSpinner /></div>;
  }

  // Always show all leave types, with their balance if available
  const allLeaveBalances = leaveTypes
    .filter(type => type.isActive || type.is_active)
    .map(type => {
      const balance = balances.find(b => 
        String(b.leave_type_id) === String(type.id) || 
        String(b.leaveTypeId) === String(type.id)
      );
      
      const remainingDays = balance ? (balance.balance ?? balance.remainingDays) : (type.yearly_quota ?? type.yearlyQuota ?? 0);
      
      return {
        id: type.id,
        name: type.name,
        remainingDays,
        isActive: type.isActive ?? Boolean(type.is_active),
        yearlyQuota: type.yearly_quota ?? type.yearlyQuota ?? 0,
        isBalanceAvailable: !!balance
      };
    });

  if (allLeaveBalances.length === 0) {
    return <p className="text-muted-foreground">No leave types found.</p>;
  }

  // Transform backend snake_case to frontend camelCase
  const transformedBalances = balances.map(balance => {
    const leaveTypeId = balance.leave_type_id ?? balance.leaveTypeId;
    const remainingDays = balance.balance ?? balance.remainingDays;
    const year = balance.year;
    
    return {
      id: balance.id,
      userId: balance.user_id ?? balance.userId,
      leaveTypeId,
      remainingDays,
      year,
      // Include other fields if needed
      leaveTypeName: balance.leave_type,
      monthlyQuota: balance.monthly_quota,
      yearlyQuota: balance.yearly_quota,
    };
  });

  const getLeaveTypeName = (leaveTypeId: string | number, leaveTypeName?: string) => {
    if (leaveTypeName) return leaveTypeName;
    
    // Handle both string and number IDs
    const type = leaveTypes.find(t => 
      String(t.id) === String(leaveTypeId) || 
      t.id === leaveTypeId
    );
    return type ? type.name : `Leave Type (ID: ${leaveTypeId})`;
  };

  return (
    <div className="grid gap-4">
      <h3 className="text-lg font-medium">Your Leave Balance</h3>
      {allLeaveBalances.map((balance) => (
        <Card key={balance.id}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {balance.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{balance.remainingDays} days</div>
            <p className="text-xs text-muted-foreground">
              {balance.isBalanceAvailable ? 'Remaining balance' : 'Yearly quota'}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
