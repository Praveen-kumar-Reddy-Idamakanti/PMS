import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  Plane
} from "lucide-react";
import { format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay,
  addMonths,
  subMonths,
  isToday,
  getDay
} from "date-fns";

interface AttendanceRecord {
  date: string;
  status: 'present' | 'absent' | 'leave' | 'holiday';
  hoursWorked?: number;
  checkInTime?: string;
  checkOutTime?: string;
}

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Generate mock attendance data for the current month
    generateMockAttendanceData();
  }, [currentDate]);

  const generateMockAttendanceData = () => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start, end });
    
    const mockData: AttendanceRecord[] = days.map(day => {
      const dayOfWeek = getDay(day);
      const dateStr = format(day, 'yyyy-MM-dd');
      
      // Skip weekends for work days
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        return {
          date: dateStr,
          status: 'holiday',
        };
      }
      
      // Add some variety to the attendance
      const random = Math.random();
      if (random > 0.95) {
        return {
          date: dateStr,
          status: 'absent',
        };
      } else if (random > 0.85) {
        return {
          date: dateStr,
          status: 'leave',
        };
      } else {
        const hoursWorked = 7.5 + Math.random() * 2; // 7.5 to 9.5 hours
        return {
          date: dateStr,
          status: 'present',
          hoursWorked,
          checkInTime: '09:00',
          checkOutTime: format(new Date(Date.now() + hoursWorked * 60 * 60 * 1000), 'HH:mm'),
        };
      }
    });
    
    setAttendanceRecords(mockData);
  };

  const getStatusConfig = (status: AttendanceRecord['status']) => {
    switch (status) {
      case 'present':
        return {
          color: 'bg-status-excellent',
          textColor: 'text-status-excellent',
          icon: CheckCircle,
          label: 'Present',
        };
      case 'absent':
        return {
          color: 'bg-status-critical',
          textColor: 'text-status-critical',
          icon: XCircle,
          label: 'Absent',
        };
      case 'leave':
        return {
          color: 'bg-status-warning',
          textColor: 'text-status-warning',
          icon: Plane,
          label: 'Leave',
        };
      case 'holiday':
        return {
          color: 'bg-muted',
          textColor: 'text-muted-foreground',
          icon: Clock,
          label: 'Holiday',
        };
    }
  };

  const getAttendanceForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return attendanceRecords.find(record => record.date === dateStr);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => 
      direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1)
    );
    setSelectedDate(null);
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Calculate stats for the month
  const monthStats = {
    present: attendanceRecords.filter(r => r.status === 'present').length,
    absent: attendanceRecords.filter(r => r.status === 'absent').length,
    leave: attendanceRecords.filter(r => r.status === 'leave').length,
    totalWorkDays: attendanceRecords.filter(r => r.status !== 'holiday').length,
  };

  const attendanceRate = monthStats.totalWorkDays > 0 
    ? Math.round((monthStats.present / monthStats.totalWorkDays) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card shadow-soft">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/dashboard')}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-xl font-bold text-foreground">Calendar</h1>
            <Badge variant="outline">Attendance Tracking</Badge>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigateMonth('prev')}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="text-lg font-semibold text-foreground min-w-[200px] text-center">
              {format(currentDate, 'MMMM yyyy')}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigateMonth('next')}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-3">
            <Card className="shadow-medium">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CalendarIcon className="w-5 h-5 text-primary" />
                  <span>Monthly Attendance</span>
                </CardTitle>
                <CardDescription>
                  Click on any date to view detailed attendance information
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-2 mb-4">
                  {/* Day headers */}
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
                      {day}
                    </div>
                  ))}
                  
                  {/* Calendar days */}
                  {calendarDays.map((day, index) => {
                    const attendance = getAttendanceForDate(day);
                    const statusConfig = attendance ? getStatusConfig(attendance.status) : null;
                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                    const isTodayDate = isToday(day);
                    
                    return (
                      <button
                        key={index}
                        onClick={() => setSelectedDate(day)}
                        className={`
                          relative p-3 text-center rounded-lg border-2 transition-all duration-200 hover:shadow-medium
                          ${isSameMonth(day, currentDate) ? 'text-foreground' : 'text-muted-foreground opacity-50'}
                          ${isSelected ? 'border-primary shadow-medium' : 'border-transparent'}
                          ${isTodayDate ? 'ring-2 ring-primary ring-offset-2' : ''}
                          hover:border-border
                        `}
                      >
                        <div className="text-sm font-medium mb-1">
                          {format(day, 'd')}
                        </div>
                        
                        {attendance && (
                          <div className={`w-2 h-2 rounded-full mx-auto ${statusConfig?.color}`} />
                        )}
                        
                        {isTodayDate && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-4 pt-4 border-t">
                  {[
                    { status: 'present', label: 'Present' },
                    { status: 'absent', label: 'Absent' },
                    { status: 'leave', label: 'Leave' },
                    { status: 'holiday', label: 'Holiday' },
                  ].map(({ status, label }) => {
                    const config = getStatusConfig(status as AttendanceRecord['status']);
                    const Icon = config.icon;
                    return (
                      <div key={status} className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${config.color}`} />
                        <span className="text-sm text-muted-foreground">{label}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Monthly Stats */}
            <Card className="shadow-medium">
              <CardHeader>
                <CardTitle className="text-lg">Monthly Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center p-4 bg-muted/20 rounded-lg">
                  <div className={`text-2xl font-bold ${attendanceRate >= 90 ? 'text-status-excellent' : attendanceRate >= 80 ? 'text-status-warning' : 'text-status-critical'}`}>
                    {attendanceRate}%
                  </div>
                  <div className="text-sm text-muted-foreground">Attendance Rate</div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-status-excellent/10 rounded-lg">
                    <div className="text-lg font-bold text-status-excellent">{monthStats.present}</div>
                    <div className="text-xs text-muted-foreground">Present</div>
                  </div>
                  <div className="text-center p-3 bg-status-critical/10 rounded-lg">
                    <div className="text-lg font-bold text-status-critical">{monthStats.absent}</div>
                    <div className="text-xs text-muted-foreground">Absent</div>
                  </div>
                  <div className="text-center p-3 bg-status-warning/10 rounded-lg">
                    <div className="text-lg font-bold text-status-warning">{monthStats.leave}</div>
                    <div className="text-xs text-muted-foreground">Leave</div>
                  </div>
                  <div className="text-center p-3 bg-muted/10 rounded-lg">
                    <div className="text-lg font-bold text-muted-foreground">{monthStats.totalWorkDays}</div>
                    <div className="text-xs text-muted-foreground">Work Days</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Selected Date Details */}
            {selectedDate && (
              <Card className="shadow-medium">
                <CardHeader>
                  <CardTitle className="text-lg">
                    {format(selectedDate, 'EEEE, MMMM do')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const attendance = getAttendanceForDate(selectedDate);
                    if (!attendance) {
                      return (
                        <div className="text-center py-4 text-muted-foreground">
                          No attendance data for this date
                        </div>
                      );
                    }

                    const config = getStatusConfig(attendance.status);
                    const Icon = config.icon;

                    return (
                      <div className="space-y-3">
                        <div className="flex items-center justify-center space-x-2">
                          <Icon className={`w-5 h-5 ${config.textColor}`} />
                          <Badge variant="outline" className={`${config.textColor} border-current`}>
                            {config.label}
                          </Badge>
                        </div>

                        {attendance.status === 'present' && attendance.hoursWorked && (
                          <div className="space-y-2">
                            <div className="text-center">
                              <div className="text-lg font-bold text-foreground">
                                {Math.floor(attendance.hoursWorked)}h {Math.round((attendance.hoursWorked % 1) * 60)}m
                              </div>
                              <div className="text-sm text-muted-foreground">Hours Worked</div>
                            </div>
                            
                            {attendance.checkInTime && attendance.checkOutTime && (
                              <div className="grid grid-cols-2 gap-2 text-center">
                                <div className="p-2 bg-muted/20 rounded">
                                  <div className="text-sm font-medium">{attendance.checkInTime}</div>
                                  <div className="text-xs text-muted-foreground">Check In</div>
                                </div>
                                <div className="p-2 bg-muted/20 rounded">
                                  <div className="text-sm font-medium">{attendance.checkOutTime}</div>
                                  <div className="text-xs text-muted-foreground">Check Out</div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}