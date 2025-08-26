import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AttendanceStatusCard } from "@/components/attendance/AttendanceStatusCard";
import { CheckInOutModal } from "@/components/attendance/CheckInOutModal";
import { Badge } from "@/components/ui/badge";
import { 
  LogOut, 
  Clock, 
  Calendar, 
  Users, 
  CheckCircle,
  ClipboardList,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { attendanceService } from "@/services/attendance.service";
import { useQuery, useQueryClient } from "@tanstack/react-query";

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
  notes?: string;
  photo?: string; // Base64 encoded image string
  type: 'checkin' | 'checkout';
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  const [isCheckOutModalOpen, setIsCheckOutModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [hoursWorked, setHoursWorked] = useState(0);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  interface TodayStatus {
    isCheckedIn: boolean;
    checkInTime: string | null;
    hoursWorked: number;
  }

  // Define the query function
  const fetchTodayStatus = useCallback(async (): Promise<TodayStatus> => {
    try {
      console.log('Fetching today\'s attendance status...');
      const response = await attendanceService.getTodaysStatus();
      console.log('Today\'s status response:', response.data);
      return response.data as TodayStatus;
    } catch (error) {
      console.error('Error fetching today\'s status:', error);
      return { isCheckedIn: false, checkInTime: null, hoursWorked: 0 };
    }
  }, []);

  // Fetch today's attendance status
  const { 
    data: todayStatus,
    isLoading: isLoadingTodayStatus, 
    error: todayStatusError,
    refetch: refetchTodayStatus 
  } = useQuery<TodayStatus>({
    queryKey: ['todayAttendance'],
    queryFn: fetchTodayStatus,
    initialData: () => {
      const storedStatus = localStorage.getItem('todayAttendance');
      return storedStatus 
        ? JSON.parse(storedStatus) 
        : { isCheckedIn: false, checkInTime: null, hoursWorked: 0 };
    },
    refetchInterval: 60000, // Refetch every minute to update hours worked
  });

  // Update local state and localStorage when todayStatus changes
  useEffect(() => {
    if (todayStatus) {
      console.log('Updating local state with today\'s status:', todayStatus);
      setIsCheckedIn(todayStatus.isCheckedIn || false);
      setCheckInTime(todayStatus.checkInTime || null);
      setHoursWorked(todayStatus.hoursWorked || 0);
      
      // Persist to localStorage for better UX on refresh
      localStorage.setItem('todayAttendance', JSON.stringify(todayStatus));
    }
  }, [todayStatus]);

  // Handle query errors
  useEffect(() => {
    if (todayStatusError) {
      console.error('Error in today\'s status query:', todayStatusError);
      toast({
        title: 'Error',
        description: 'Failed to fetch today\'s attendance status',
        variant: 'destructive',
      });
    }
  }, [todayStatusError]);

  interface WeeklySummary {
    totalHours: number;
    changeFromLastWeek: number;
  }

  // Fetch weekly hours summary
  const { 
    data: weeklySummary,
    error: weeklySummaryError 
  } = useQuery<WeeklySummary>({
    queryKey: ['weeklySummary'],
    queryFn: async (): Promise<WeeklySummary> => {
      try {
        const response = await attendanceService.getAttendanceSummary({
          startDate: format(new Date(new Date().setDate(new Date().getDate() - 7)), 'yyyy-MM-dd'),
          endDate: format(new Date(), 'yyyy-MM-dd')
        });
        return response.data as WeeklySummary;
      } catch (error) {
        console.error('Error fetching weekly summary:', error);
        return { totalHours: 0, changeFromLastWeek: 0 };
      }
    },
    initialData: { totalHours: 0, changeFromLastWeek: 0 },
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  // Handle weekly summary errors
  useEffect(() => {
    if (weeklySummaryError) {
      toast({
        title: 'Error',
        description: 'Failed to fetch weekly summary data',
        variant: 'destructive',
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

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
  }, [navigate]);

  const handleCheckIn = async (data: CheckInOutData) => {
    setIsLoading(true);
    
    try {
      const checkInData: any = {
        type: 'checkin',
        location: data.location ? {
          latitude: data.location.latitude,
          longitude: data.location.longitude,
          address: data.location.address || 'Location not available'
        } : undefined,
        notes: 'Checked in from dashboard'
      };

      // Only include photo if it exists
      if (data.photo) {
        checkInData.photo = data.photo;
      }

      const response = await attendanceService.checkIn(checkInData);
      
      // Immediately update the UI state
      const now = new Date().toISOString();
      setIsCheckedIn(true);
      setCheckInTime(now);
      setHoursWorked(0);
      
      // Invalidate and refetch today's status to ensure data consistency
      await queryClient.invalidateQueries({ 
        queryKey: ['todayAttendance'],
        refetchType: 'active' // Force immediate refetch
      });
      
      toast({
        title: 'Checked in successfully!',
        description: 'Your attendance has been recorded.',
      });
      
      setIsCheckInModalOpen(false);
    } catch (error) {
      toast({
        title: "Check-in failed",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckOut = async (data: CheckInOutData) => {
    setIsLoading(true);
    
    try {
      await attendanceService.checkOut({
        location: data.location ? {
          latitude: data.location.latitude,
          longitude: data.location.longitude,
          address: data.location.address || 'Location not available'
        } : undefined,
        notes: 'Checked out from dashboard'
      });
      
      // Immediately update the UI state
      setIsCheckedIn(false);
      setCheckInTime(null);
      setHoursWorked(0);
      
      // Invalidate and refetch today's status to ensure data consistency
      await queryClient.invalidateQueries({ 
        queryKey: ['todayAttendance'],
        refetchType: 'active' // Force immediate refetch
      });
      
      toast({
        title: 'Checked out successfully!',
        description: 'Your working hours have been recorded.',
      });
      
      setIsCheckOutModalOpen(false);
    } catch (error) {
      toast({
        title: "Check-out failed",
        description: "Please try again.",
        variant: "destructive",
      });
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

  if (!user) {
    return <div>Loading...</div>;
  }

  const attendanceData = {
    hoursWorked,
    status: getAttendanceStatus(),
    checkInTime,
    checkOutTime: isCheckedIn ? undefined : new Date().toISOString(),
    date: format(new Date(), 'EEEE, MMMM do, yyyy'),
    isCheckedIn,
  };

  return (
    <div className="min-h-screen bg-background">
      

      <div className="container mx-auto px-4 py-6">
        {/* Welcome Section */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-foreground">
                Welcome back, {user.name}! 👋
              </h2>
              <Badge variant="outline" className="px-2 py-1 text-xs">
                {user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase()}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">
              {format(new Date(), 'EEEE, MMMM do, yyyy')}
            </p>
          </div>
          {(user.role === 'admin' || user.role === 'team_leader') && (
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
          {/* Attendance Status */}
          <div className="lg:col-span-2">
            <AttendanceStatusCard attendance={attendanceData} />
          </div>

          {/* Quick Actions */}
          <Card className="shadow-medium">
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
              {!isCheckedIn ? (
                <Button
                  variant="status"
                  className="w-full"
                  onClick={() => setIsCheckInModalOpen(true)}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Check In
                </Button>
              ) : (
                <Button
                  variant="status-warning"
                  className="w-full"
                  onClick={() => setIsCheckOutModalOpen(true)}
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Check Out
                </Button>
              )}
              
              <Button variant="outline" className="w-full" onClick={() => navigate('/calendar')}>
                <Calendar className="w-4 h-4 mr-2" />
                View Calendar
              </Button>
              
              <Button variant="outline" className="w-full" onClick={() => navigate('/tasks')}>
                <ClipboardList className="w-4 h-4 mr-2" />
                My Tasks
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="shadow-soft hover:shadow-medium transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                This Week
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-800">
                {weeklySummary?.totalHours ? `${weeklySummary.totalHours.toFixed(1)}h` : '0h'}
              </div>
              <p className="text-xs text-gray-500">
                {weeklySummary?.changeFromLastWeek ? 
                  `${weeklySummary.changeFromLastWeek >= 0 ? '+' : ''}${weeklySummary.changeFromLastWeek.toFixed(1)}h from last week` : 
                  'No data from last week'}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-soft hover:shadow-medium transition-shadow">
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

          <Card className="shadow-soft hover:shadow-medium transition-shadow">
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

          <Card className="shadow-soft hover:shadow-medium transition-shadow">
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
        onClose={() => setIsCheckInModalOpen(false)}
        type="checkin"
        onSubmit={handleCheckIn}
        isLoading={isLoading}
      />

      {/* Check Out Modal */}
      <CheckInOutModal
        isOpen={isCheckOutModalOpen}
        onClose={() => setIsCheckOutModalOpen(false)}
        type="checkout"
        onSubmit={handleCheckOut}
        isLoading={isLoading}
      />
    </div>
  );
}