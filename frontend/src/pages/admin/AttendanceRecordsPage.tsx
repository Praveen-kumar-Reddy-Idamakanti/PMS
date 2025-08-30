import { useQuery } from "@tanstack/react-query";
import { attendanceService } from "@/services/attendance.service";
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { LoadingGif } from "@/components/ui/LoadingGif";
import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface AttendanceApiResponse {
  id: string;
  user_id: string | number;
  name?: string;
  employee_id?: string;
  checkin_time?: string | null;
  checkout_time?: string | null;
  total_hours?: number;
  status?: 'present' | 'absent' | 'late' | 'half-day';
  date?: string;
  timestamp?: string;
  type?: 'checkin' | 'checkout';
}

interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  employeeId?: string;
  checkIn?: string | null;
  checkOut?: string | null;
  totalHours?: number;
  status?: 'present' | 'absent' | 'late' | 'half-day';
  date?: string;
}

export const AttendanceRecordsPage = () => {
  const [startDate, setStartDate] = useState<Date | undefined>(() => {
    const date = new Date();
    date.setDate(1); // First day of current month
    return date;
  });
  
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());

  const { data: attendanceData, isLoading } = useQuery<AttendanceRecord[]>({
    queryKey: ['attendance-records', startDate, endDate],
    queryFn: async () => {
      if (!startDate || !endDate) return [];
      const response = await attendanceService.getAttendanceSummary({
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
      }) as unknown as AttendanceApiResponse[];
      
      // Group records by user and date
      const recordsByUserAndDate: Record<string, AttendanceRecord> = {};
      
      response.forEach(record => {
        const date = record.date || (record.checkin_time ? record.checkin_time.split('T')[0] : '');
        const key = `${record.user_id}_${date}`;
        
        if (!recordsByUserAndDate[key]) {
          recordsByUserAndDate[key] = {
            id: record.id,
            userId: record.user_id?.toString() || '',
            userName: record.name || 'Unknown User',
            employeeId: record.employee_id,
            date: date,
            status: record.status || 'absent'
          };
        }
        
        // Update check-in/check-out times
        if (record.checkin_time) {
          recordsByUserAndDate[key].checkIn = record.checkin_time;
        }
        if (record.checkout_time) {
          recordsByUserAndDate[key].checkOut = record.checkout_time;
        }
        if (record.total_hours) {
          recordsByUserAndDate[key].totalHours = record.total_hours;
        }
      });
      
      return Object.values(recordsByUserAndDate);
    },
  });

  if (isLoading) return <LoadingGif text="Loading attendance records..." />;

  return (
    <div className="space-y-4 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Attendance Records</h1>
      </div>

      <div className="flex items-center space-x-4 mb-6">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">From:</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[240px] justify-start text-left font-normal",
                  !startDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={setStartDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">To:</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[240px] justify-start text-left font-normal",
                  !endDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={setEndDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Employee</TableHead>
              <TableHead>Employee ID</TableHead>
              <TableHead>Check In</TableHead>
              <TableHead>Check Out</TableHead>
              <TableHead>Total Hours</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {attendanceData?.map((record) => (
              <TableRow key={`${record.userId}-${record.date}`}>
                <TableCell>{record.date ? format(new Date(record.date), 'PPP') : '-'}</TableCell>
                <TableCell>{record.userName || 'Unknown User'}</TableCell>
                <TableCell>{record.employeeId || 'N/A'}</TableCell>
                <TableCell>{record.checkIn ? format(new Date(record.checkIn), 'PPpp') : '-'}</TableCell>
                <TableCell>{record.checkOut ? format(new Date(record.checkOut), 'PPpp') : '-'}</TableCell>
                <TableCell>{record.totalHours?.toFixed(2) || '0.00'} hrs</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    record.status === 'present' ? 'bg-green-100 text-green-800' :
                    record.status === 'absent' ? 'bg-red-100 text-red-800' :
                    record.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {record.status || 'Unknown'}
                  </span>
                </TableCell>
              </TableRow>
            ))}
            {!attendanceData?.length && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No attendance records found for the selected date range
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AttendanceRecordsPage;
