import { useState, useEffect } from "react";
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
  BarChart3,
  Settings
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface User {
  id: string;
  name: string;
  email: string;
  employeeId: string;
  role: string;
}

interface CheckInOutData {
  photo?: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  timestamp: string;
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

  useEffect(() => {
    // Load user data
    const userData = localStorage.getItem('user');
    if (!userData) {
      navigate('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);

    // Load attendance state
    const attendanceData = localStorage.getItem('attendanceState');
    if (attendanceData) {
      const attendance = JSON.parse(attendanceData);
      setIsCheckedIn(attendance.isCheckedIn);
      setCheckInTime(attendance.checkInTime);
      setHoursWorked(attendance.hoursWorked || 0);
    }

    // Update hours worked every minute if checked in
    const interval = setInterval(() => {
      if (isCheckedIn && checkInTime) {
        const now = new Date();
        const checkIn = new Date(checkInTime);
        const diffMs = now.getTime() - checkIn.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        setHoursWorked(diffHours);
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [navigate, isCheckedIn, checkInTime]);

  const handleCheckIn = async (data: CheckInOutData) => {
    setIsLoading(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const now = new Date().toISOString();
      setIsCheckedIn(true);
      setCheckInTime(now);
      setHoursWorked(0);
      
      // Save to localStorage
      localStorage.setItem('attendanceState', JSON.stringify({
        isCheckedIn: true,
        checkInTime: now,
        hoursWorked: 0,
      }));
      
      toast({
        title: "Checked in successfully!",
        description: `Welcome back, ${user?.name}. Have a productive day!`,
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
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setIsCheckedIn(false);
      
      // Save to localStorage
      localStorage.setItem('attendanceState', JSON.stringify({
        isCheckedIn: false,
        checkInTime: null,
        hoursWorked,
        lastCheckOut: new Date().toISOString(),
      }));
      
      toast({
        title: "Checked out successfully!",
        description: `Great work today! You worked ${Math.floor(hoursWorked)}h ${Math.round((hoursWorked % 1) * 60)}m.`,
      });
      
      setIsCheckOutModalOpen(false);
      setCheckInTime(null);
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
    localStorage.removeItem('attendanceState');
    toast({
      title: "Logged out successfully",
      description: "See you next time!",
    });
    navigate('/login');
  };

  const getAttendanceStatus = (): 'excellent' | 'warning' | 'critical' => {
    if (hoursWorked >= 8.5) return 'excellent';
    if (hoursWorked >= 8) return 'warning';
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
              <div className="text-2xl font-bold text-foreground">32.5h</div>
              <p className="text-xs text-muted-foreground">
                +2.5h from last week
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