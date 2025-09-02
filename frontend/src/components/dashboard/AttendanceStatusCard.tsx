import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, LogIn, LogOut } from "lucide-react";

export interface AttendanceStatusCardProps {
  status: "checked_in" | "checked_out" | "not_checked_in" | "pending_approval";
  hoursWorked: number;
  checkInTime: string | null;
  checkOutTime: string | null;
}

export function AttendanceStatusCard({
  status,
  hoursWorked,
  checkInTime,
  checkOutTime,
}: AttendanceStatusCardProps) {
  return (
    <Card className="shadow-medium hover:border-orange-500">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Clock className="w-5 h-5 text-primary" />
          <span>Attendance Status</span>
        </CardTitle>
        <CardDescription>Your daily attendance summary</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Status:</span>
          <Badge
            variant={
              status === "checked_in"
                ? "default"
                : status === "checked_out"
                ? "secondary"
                : "outline"
            }
          >
            {status === "checked_in"
              ? "Checked In"
              : status === "checked_out"
              ? "Checked Out"
              : status === "pending_approval"
              ? "Pending Approval"
              : "Not Checked In"}
          </Badge>
        </div>

        {/* Hours worked */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Hours Worked:</span>
          <span className="text-sm">{hoursWorked} hrs</span>
        </div>

        {/* Check-in/out times */}
        <div className="flex items-center justify-between">
          <span className="flex items-center text-sm font-medium">
            <LogIn className="w-4 h-4 mr-1 text-green-500" /> In:
          </span>
          <span className="text-sm">{checkInTime || '--:--'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center text-sm font-medium">
            <LogOut className="w-4 h-4 mr-1 text-red-500" /> Out:
          </span>
          <span className="text-sm">{checkOutTime || '--:--'}</span>
        </div>
      </CardContent>
    </Card>
  );
}
