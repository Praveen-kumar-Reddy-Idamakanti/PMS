import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface AttendanceData {
  hoursWorked: number;
  status: 'excellent' | 'warning' | 'critical';
  checkInTime?: string;
  checkOutTime?: string;
  date: string;
  isCheckedIn: boolean;
}

interface AttendanceStatusCardProps {
  attendance: AttendanceData;
  className?: string;
}

export function AttendanceStatusCard({ attendance, className }: AttendanceStatusCardProps) {
  const getStatusConfig = (status: AttendanceData['status']) => {
    switch (status) {
      case 'excellent':
        return {
          badge: 'status-excellent',
          text: 'Excellent',
          description: '8.5+ hours worked',
          icon: TrendingUp,
        };
      case 'warning':
        return {
          badge: 'status-warning',
          text: 'Warning',
          description: '8-8.5 hours worked',
          icon: Clock,
        };
      case 'critical':
        return {
          badge: 'status-critical',
          text: 'Critical',
          description: 'Less than 8 hours',
          icon: Clock,
        };
    }
  };

  const statusConfig = getStatusConfig(attendance.status);
  const StatusIcon = statusConfig.icon;

  const formatTime = (timeString?: string) => {
    if (!timeString) return '--:--';
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatHours = (hours: number) => {
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return `${wholeHours}h ${minutes}m`;
  };

  return (
    <Card className={cn("shadow-medium hover:shadow-strong transition-all duration-200", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-foreground">
            Today's Attendance
          </CardTitle>
          <Badge 
            variant="outline" 
            className={cn(
              "font-medium",
              attendance.status === 'excellent' && "border-status-excellent text-status-excellent",
              attendance.status === 'warning' && "border-status-warning text-status-warning",
              attendance.status === 'critical' && "border-status-critical text-status-critical"
            )}
          >
            <StatusIcon className="w-3 h-3 mr-1" />
            {statusConfig.text}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {attendance.date}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Hours Worked */}
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Hours Worked</span>
          </div>
          <div className="text-right">
            <div className={cn(
              "text-lg font-bold",
              attendance.status === 'excellent' && "text-status-excellent",
              attendance.status === 'warning' && "text-status-warning",
              attendance.status === 'critical' && "text-status-critical"
            )}>
              {formatHours(attendance.hoursWorked)}
            </div>
            <div className="text-xs text-muted-foreground">
              {statusConfig.description}
            </div>
          </div>
        </div>

        {/* Check-in/Check-out Times */}
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-2 bg-muted/20 rounded-lg">
            <div className="text-xs text-muted-foreground mb-1">Check In</div>
            <div className="font-semibold text-sm">
              {formatTime(attendance.checkInTime)}
            </div>
          </div>
          <div className="text-center p-2 bg-muted/20 rounded-lg">
            <div className="text-xs text-muted-foreground mb-1">Check Out</div>
            <div className="font-semibold text-sm">
              {attendance.isCheckedIn ? (
                <span className="text-status-info">In Progress</span>
              ) : (
                formatTime(attendance.checkOutTime)
              )}
            </div>
          </div>
        </div>

        {/* Current Status */}
        <div className={cn(
          "p-3 rounded-lg border-2 text-center",
          attendance.isCheckedIn && "border-status-info bg-status-info/10",
          !attendance.isCheckedIn && "border-muted bg-muted/10"
        )}>
          <div className="text-sm font-medium">
            {attendance.isCheckedIn ? (
              <span className="text-status-info">Currently Checked In</span>
            ) : (
              <span className="text-muted-foreground">Not Checked In</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}