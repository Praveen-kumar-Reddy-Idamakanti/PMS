import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { 
  Clock, 
  Calendar, 
  Users, 
  CheckCircle,
  ClipboardList,
  Loader2,
  LogOut,
  LogIn
} from "lucide-react";
import { CheckInOutModal } from "@/components/attendance/CheckInOutModal";
import { toast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { attendanceService } from "@/services/attendance.service";
import { useAuth } from "@/contexts/AuthContext";

interface User {
  id: string;
  name: string;
  email: string;
  employeeId: string;
  role: string;
}

interface CheckInOutData {
  location?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  latitude?: number;
  longitude?: number;
  address?: string;
  notes?: string;
  photo?: string;
  type: 'checkin' | 'checkout';
  timestamp?: string;
}

export interface TodayStatus {
  status: 'checked_in' | 'checked_out' | 'not_checked_in';
  isCheckedIn: boolean;
  needsCheckIn: boolean;
  checkInTime: string | null;
  checkOutTime: string | null;
  hoursWorked: number;
  lastAction?: {
    id: string;
    type: 'checkin' | 'checkout';
    timestamp: string;
    notes?: string;
    location?: {
      latitude: number;
      longitude: number;
      address?: string;
    };
  } | null;
}

export default function Dashboard() {
  const { user: currentUser } = useAuth();
  // Initialize hooks
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // State for modal visibility and loading states
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  const [isCheckOutModalOpen, setIsCheckOutModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // State for attendance tracking
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [checkOutTime, setCheckOutTime] = useState<string | null>(null);
  const [hoursWorked, setHoursWorked] = useState(0);

  // Define the query function with proper typing
  const fetchTodayStatus = useCallback(async (): Promise<TodayStatus> => {
    try {
      console.log('Fetching today\'s attendance status...');
      const response = await attendanceService.getTodaysStatus();
      console.log('Today\'s status response:', response);
      
      // Ensure we have a valid response with required fields
      const status: TodayStatus = {
        status: response.status || 'not_checked_in',
        isCheckedIn: response.status === 'checked_in',
        needsCheckIn: response.status !== 'checked_in',
        checkInTime: response.checkInTime || null,
        checkOutTime: response.checkOutTime || null,
        hoursWorked: response.hoursWorked || 0,
        lastAction: response.lastAction || null
      };
      
      return status;
    } catch (error) {
      console.error('Error fetching today\'s status:', error);
      return { 
        status: 'not_checked_in',
        isCheckedIn: false, 
        needsCheckIn: true,
        checkInTime: null, 
        checkOutTime: null,
        hoursWorked: 0 
      };
    }
  }, []);

  // Fetch today's attendance status
  const { 
    data: todayStatus, 
    isLoading: isLoadingStatus, 
    error: statusError 
  } = useQuery<TodayStatus>({
    queryKey: ['todayStatus'],
    queryFn: fetchTodayStatus,
    refetchInterval: 60000, // Refetch every minute to update hours worked
    initialData: () => {
      // Initial data to prevent loading states if we have data in cache
      const cachedData = queryClient.getQueryData<TodayStatus>(['todayStatus']);
      return cachedData || {
        status: 'not_checked_in',
        isCheckedIn: false,
        needsCheckIn: true,
        checkInTime: null,
        checkOutTime: null,
        hoursWorked: 0,
        lastAction: null
      };
    }
  });

  // Update local state when query data changes
  useEffect(() => {
    if (todayStatus) {
      setIsCheckedIn(todayStatus.isCheckedIn);
      setCheckInTime(todayStatus.checkInTime);
      setHoursWorked(todayStatus.hoursWorked);
    }
  }, [todayStatus]);

  // Update local state and localStorage when todayStatus changes
  useEffect(() => {
    if (todayStatus) {
      console.log('Updating local state with today\'s status:', todayStatus);
      const checkedIn = todayStatus.status === 'checked_in';
      setIsCheckedIn(checkedIn);
      setCheckInTime(todayStatus.checkInTime || null);
      setHoursWorked(todayStatus.hoursWorked || 0);
      
      // Persist to localStorage for better UX on refresh
      localStorage.setItem('todayAttendance', JSON.stringify(todayStatus));
      
      // Update modal states based on current status
      if (checkedIn) {
        setIsCheckInModalOpen(false);
        setIsCheckOutModalOpen(false);
      }
    }
  }, [todayStatus]);

  // Handle query errors
  useEffect(() => {
    if (statusError) {
      console.error('Error in today\'s status query:', statusError);
      toast({
        title: 'Error',
        description: 'Failed to fetch today\'s attendance status',
        variant: 'destructive',
      });
    }
  }, [statusError]);

  interface WeeklySummary {
    totalHours: number;
    changeFromLastWeek: number;
  }

  // Fetch weekly hours summary
  const { 
    data: weeklySummary = { totalHours: 0, changeFromLastWeek: 0 },
    error: weeklySummaryError,
    isLoading: isLoadingWeeklySummary
  } = useQuery<WeeklySummary, Error>({
    queryKey: ['weeklySummary'],
    queryFn: async (): Promise<WeeklySummary> => {
      if (!currentUser?.id) return { totalHours: 0, changeFromLastWeek: 0 };
      
      try {
        const response = await attendanceService.getEmployeeAttendance(currentUser.id, {
          startDate: format(new Date(new Date().setDate(new Date().getDate() - 7)), 'yyyy-MM-dd'),
          endDate: format(new Date(), 'yyyy-MM-dd')
        });
        
        console.log('Weekly summary response:', response);
        
        // Handle the response structure - response.data contains the array
        const attendanceRecords = response.data || [];
        
        // Calculate total hours from attendance records
        const totalHours = attendanceRecords.reduce((sum: number, record: any) => {
          const hours = record.totalHours || 0;
          console.log(`Record date: ${record.date}, hours: ${hours}`);
          return sum + hours;
        }, 0);
        
        console.log('Calculated total hours:', totalHours);
        
        // For demo purposes, we'll use a fixed change value
        // In a real app, you'd compare with the previous period
        const changeFromLastWeek = 0; 
        
        return { totalHours, changeFromLastWeek };
      } catch (error) {
        console.error('Error fetching weekly summary:', error);
        return { totalHours: 0, changeFromLastWeek: 0 };
      }
    },
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  // Handle weekly summary errors
  useEffect(() => {
    if (weeklySummaryError) {
      console.error('Error fetching weekly summary:', weeklySummaryError);
      toast({
        title: 'Error',
        description: 'Failed to load weekly summary',
        variant: 'destructive'
      });
    }
  }, [weeklySummaryError]);


  // Load user data
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      navigate('/login');
      return;
    }
  }, [navigate]);

  const handleCheckIn = async (data: CheckInOutData) => {
    setIsLoading(true);
    
    try {
      // First get current status to prevent race conditions
      const currentStatus = await attendanceService.getTodaysStatus();
      
      if (currentStatus.status === 'checked_in') {
        throw new Error('You have already checked in today');
      }
      
      if (currentStatus.status === 'checked_out') {
        throw new Error('You have already checked out for today');
      }

      const checkInData: any = {
        ...data,
        type: 'checkin',
        timestamp: new Date().toISOString(),
      };
      
      // Check if we have valid location data
      if (!data.location?.latitude || !data.location?.longitude) {
        throw new Error('Please allow location access to check in');
      }

      // Call the checkIn service with the location data
      await attendanceService.checkIn(checkInData);
      
      // Invalidate and refetch today's status
      await queryClient.invalidateQueries({ queryKey: ['todayStatus'] });
      
      // Get the updated status
      const updatedStatus = await queryClient.fetchQuery({
        queryKey: ['todayStatus'],
        queryFn: attendanceService.getTodaysStatus,
      });
      
      // Verify the check-in was successful
      if (updatedStatus?.status === 'checked_in' || updatedStatus?.isCheckedIn) {
        toast({
          title: 'Checked in successfully!',
          description: `You're now checked in at ${new Date().toISOString()}`,
        });
        setIsCheckInModalOpen(false);
      } else {
        console.error('Check-in verification failed. Status:', updatedStatus);
        throw new Error('Failed to verify check-in status. Please refresh and try again.');
      }
    } catch (error) {
      console.error('Check-in error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An error occurred during check-in';
      toast({
        title: 'Check-in failed',
        description: errorMessage,
        variant: 'destructive',
      });
      throw error; // Re-throw to allow the modal to handle the error
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckOut = async (data: CheckInOutData) => {
    setIsLoading(true);
    try {
      // First, refresh the latest status from the server
      await queryClient.invalidateQueries({ queryKey: ['todayStatus'] });
      const currentStatus = await queryClient.fetchQuery({
        queryKey: ['todayStatus'],
        queryFn: fetchTodayStatus,
      });

      // If already checked out, just show message and close modal
      if (currentStatus.status === 'checked_out') {
        toast({
          title: 'Already Checked Out',
          description: 'Your check-out was already recorded.',
          variant: 'default'
        });
        setIsCheckOutModalOpen(false);
        return true;
      }

      // If not checked in, prevent check out
      if (currentStatus.status !== 'checked_in') {
        throw new Error('You need to check in before checking out');
      }

      // Proceed with check out
      const checkOutData: any = {
        ...data,
        type: 'checkout',
        timestamp: new Date().toISOString(),
      };

      const response = await attendanceService.checkOut(checkOutData);
      
      // Refresh the latest status after check out
      await queryClient.invalidateQueries({ queryKey: ['todayStatus'] });
      
      // Show success message
      toast({
        title: 'Checked Out Successfully',
        description: `You've checked out at ${new Date().toISOString()}`,
        variant: 'default'
      });
      
      setIsCheckOutModalOpen(false);
      return true;
    } catch (error) {
      console.error('Check-out error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An error occurred during check-out';
      toast({
        title: 'Check-out failed',
        description: errorMessage,
        variant: 'destructive',
      });
      throw error; // Re-throw to allow the modal to handle the error
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/login');
  };

  const getAttendanceStatus = (): 'excellent' | 'warning' | 'critical' => {
    if (hoursWorked >= 8.5) return 'excellent';
    if (hoursWorked >= 6 && hoursWorked < 8.5) return 'warning';
    return 'critical';
  };

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading user data...</span>
      </div>
    );
  }

  const attendanceData = {
    hoursWorked,
    status: getAttendanceStatus(),
    checkInTime: todayStatus?.checkInTime || checkInTime,
    checkOutTime: todayStatus?.checkOutTime || (isCheckedIn ? undefined : new Date().toISOString()),
    date: format(new Date(), 'EEEE, MMMM do, yyyy'),
    isCheckedIn: todayStatus?.status === 'checked_in' || isCheckedIn,
  };

  const renderAttendanceStatus = () => (
    <div className="lg:col-span-2">
      {/* Attendance Status */}
      <Card className="shadow-medium hover:border-orange-500">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-primary" />
            <span>Attendance Status</span>
          </CardTitle>
          <CardDescription>
            Your current attendance status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Status:</span>
            <Badge variant={todayStatus?.status === 'checked_out' ? 'secondary' : 'default'}> 
              {todayStatus?.status === 'checked_in' ? 'Checked In' : 
               todayStatus?.status === 'checked_out' ? 'Checked Out' : 'Not Checked In'}
            </Badge>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Hours Worked:</span>
            <span className="text-sm font-medium">{hoursWorked.toFixed(1)}h</span>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Check-in Time:</span>
            <span className="text-sm font-medium">
              {attendanceData.checkInTime ? format(parseISO(attendanceData.checkInTime), 'h:mm a') : '--:--'}
            </span>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Check-out Time:</span>
            <span className="text-sm font-medium">
              {attendanceData.checkOutTime ? format(parseISO(attendanceData.checkOutTime), 'h:mm a') : '--:--'}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderCheckInButton = () => (
    <Button
      onClick={() => setIsCheckInModalOpen(true)}
      disabled={isLoading || isLoadingStatus}
      className="w-full"
    >
      {isLoading || isLoadingStatus ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <LogIn className="mr-2 h-4 w-4" />
      )}
      Check In
    </Button>
  );

  const renderCheckOutButton = () => (
    <Button
      onClick={() => setIsCheckOutModalOpen(true)}
      disabled={isLoading || isLoadingStatus}
      variant="outline"
      className="w-full"
    >
      {isLoading || isLoadingStatus ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <LogOut className="mr-2 h-4 w-4" />
      )}
      Check Out
    </Button>
  );

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container mx-auto px-4 py-6">
        {/* Welcome Section */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-foreground">
                Welcome back, {currentUser?.name || 'User'}! 
              </h2>
              <Badge variant="outline" className="px-2 py-1 text-xs">
                {currentUser?.role ? currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1).toLowerCase() : 'User'}
              </Badge>
            </div>
            <p className="mt-1">
              <span className="text-orange-500">{format(new Date(), 'do ')}</span>
              <span className="text-foreground">{format(new Date(), ',EEEE, ')}</span>
              <span className="text-foreground">{format(new Date(), 'MMMM yyyy,')}</span>
            </p>
          </div>
          {(currentUser?.role === 'admin' || currentUser?.role === 'team_leader') && (
            <Button 
              variant="outline" 
              onClick={() => navigate('/register')}
              className="flex items-center gap-2"
            >
              <Users className="h-4 w-4" />
              Register New User
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {renderAttendanceStatus()}

          {/* Quick Actions */}
          <Card className="shadow-medium hover:border-orange-500">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-primary" />
                <span>Quick Actions</span>
              </CardTitle>
              <CardDescription>
                Manage your attendance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="mt-6 space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Status:</span>
                  <Badge variant={todayStatus?.status === 'checked_out' ? 'secondary' : 'default'}> 
                    {todayStatus?.status === 'checked_in' ? 'Checked In' : 
                     todayStatus?.status === 'checked_out' ? 'Checked Out' : 'Not Checked In'}
                  </Badge>
                </div>
                
                {todayStatus?.status === 'checked_out' ? (
                  <Button
                    variant="outline"
                    className="w-full cursor-not-allowed opacity-70"
                    disabled
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Check In (Completed for today)
                  </Button>
                ) : todayStatus?.status === 'checked_in' ? (
                  renderCheckOutButton()
                ) : (
                  renderCheckInButton()
                )}
              </div>
              <Button variant="outline" className="w-full border-cyan-500" onClick={() => navigate('/calendar')}>
                <Calendar className="w-4 h-4 mr-2 " />
                View Calendar
              </Button>
              
              <Button variant="outline" className="w-full border-cyan-500" onClick={() => navigate('/tasks')}>
                <ClipboardList className="w-4 h-4 mr-2" />
                My Tasks
              </Button>
            </CardContent>
          </Card>
        </div> 

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="shadow-soft hover:shadow-medium transition-shadow hover:border-orange-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                This Week
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-800">
                {isLoadingWeeklySummary ? 'Loading...' : `${weeklySummary.totalHours.toFixed(1)}h`}
              </div>
              <p className="text-xs text-gray-500">
{isLoadingWeeklySummary ? '...' : 
                  weeklySummary.changeFromLastWeek !== undefined ? 
                    `${weeklySummary.changeFromLastWeek >= 0 ? '+' : ''}${weeklySummary.changeFromLastWeek.toFixed(1)}h from last week` : 
                    'No data from last week'}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-soft hover:shadow-medium transition-shadow hover:border-orange-500  ">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">8</div>
              <p className="text-xs text-muted-foreground">
                3 due this week
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-soft hover:shadow-medium transition-shadow hover:border-orange-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Team Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">2</div>
              <p className="text-xs text-muted-foreground">
                Meeting at 2 PM today
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-soft hover:shadow-medium transition-shadow hover:border-orange-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Attendance Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-status-excellent">96%</div>
              <p className="text-xs text-muted-foreground">
                This month
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Check In Modal */}
      <CheckInOutModal
        isOpen={isCheckInModalOpen}
        onClose={() => !isLoading && setIsCheckInModalOpen(false)}
        type="checkin"
        onSubmit={handleCheckIn}
        isLoading={isLoading}
      />
      <CheckInOutModal
        isOpen={isCheckOutModalOpen}
        onClose={() => !isLoading && setIsCheckOutModalOpen(false)}
        type="checkout"
        onSubmit={handleCheckOut}
        isLoading={isLoading}
      />
    </div>
  );
};
