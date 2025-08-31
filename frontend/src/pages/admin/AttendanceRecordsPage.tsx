import { useQuery } from "@tanstack/react-query";
import { attendanceService } from "@/services/attendance.service";
import type { AttendanceSummary, AttendanceRecord } from "@/services/attendance.service";
import * as React from 'react';
import { format } from 'date-fns';
import { ArrowLeft, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { LoadingGif } from "@/components/ui/LoadingGif";
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface UserStats {
  userId: string;
  userName: string;
  employeeId: string | null;
  totalCheckIns: number;
  totalCheckOuts: number;
  totalHours: number;
  daysWorked: Set<string>;
}

const useAttendanceData = (startDate?: Date, endDate?: Date) => {
  return useQuery<AttendanceSummary>({
    queryKey: ['attendance-records', startDate, endDate],
    queryFn: async (): Promise<AttendanceSummary> => {
      if (!startDate || !endDate) return { 
        records: [],
        stats: {
          totalCheckIns: 0,
          totalCheckOuts: 0,
          totalWorkingHours: 0,
          averageHoursPerDay: 0,
          daysWorked: 0
        }
      };
      
      return attendanceService.getAttendanceSummary({
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
      });
    },
    enabled: !!startDate && !!endDate
  });
};

const useUserStats = (attendanceSummary?: AttendanceSummary) => {
  return useMemo(() => {
    if (!attendanceSummary?.records) return [];
    
    const userMap = new Map<string, UserStats>();
    
    // Process all records
    attendanceSummary.records.forEach(record => {
      if (!record.date) return; // Skip records without a date
      
      const userId = record.userId;
      if (!userMap.has(userId)) {
        userMap.set(userId, {
          userId,
          userName: record.userName,
          employeeId: record.employeeId,
          totalCheckIns: 0,
          totalCheckOuts: 0,
          totalHours: 0,
          daysWorked: new Set()
        });
      }
      
      const user = userMap.get(userId)!;
      const recordDate = new Date(record.date).toISOString().split('T')[0];
      
      // Count check-ins and check-outs
      if (record.checkIn) {
        user.totalCheckIns++;
        user.daysWorked.add(recordDate);
      }
      if (record.checkOut) {
        user.totalCheckOuts++;
      }
      
      // Only add hours if we have a valid check-in/check-out pair
      if (record.checkIn && record.checkOut) {
        user.totalHours += record.totalHours || 0;
      }
    });
    
    // Calculate averages and return the results
    return Array.from(userMap.values()).map(user => ({
      ...user,
      daysWorked: user.daysWorked.size,
      avgHoursPerDay: user.daysWorked.size > 0 
        ? parseFloat((user.totalHours / user.daysWorked.size).toFixed(2)) 
        : 0,
      totalHours: parseFloat(user.totalHours.toFixed(2))
    }));
  }, [attendanceSummary]);
};

export const AttendanceRecordsPage = () => {
  const navigate = useNavigate();
  
  const [startDate, setStartDate] = useState<Date | undefined>(() => {
    const date = new Date();
    date.setDate(1);
    return date;
  });
  
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const { data: attendanceSummary, isLoading } = useAttendanceData(startDate, endDate);
  const userStats = useUserStats(attendanceSummary);

  if (isLoading) return <LoadingGif text="Loading attendance records..." />;

  return (
    <div className="space-y-4 p-6">
      <div className="flex justify-between items-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="rounded-full"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Attendance Summary</h1>
        <div className="w-8"></div> {/* Spacer for alignment */}
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full md:w-[240px] justify-start text-left font-normal',
                  !startDate && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, 'PPP') : <span>Start date</span>}
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

          <span className="self-center hidden md:inline">to</span>
          <span className="self-center md:hidden">End Date</span>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full md:w-[240px] justify-start text-left font-normal',
                  !endDate && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, 'PPP') : <span>End date</span>}
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
              <TableHead>Employee</TableHead>
              <TableHead>Employee ID</TableHead>
              <TableHead>Days Worked</TableHead>
              <TableHead>Total Check-ins</TableHead>
              <TableHead>Total Check-outs</TableHead>
              <TableHead>Total Hours</TableHead>
              <TableHead>Avg. Hours/Day</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {userStats.length > 0 ? (
              userStats.map((user) => (
                <TableRow key={`${user.userId}-${user.employeeId}`}>
                  <TableCell className="font-medium">{user.userName}</TableCell>
                  <TableCell>{user.employeeId || 'N/A'}</TableCell>
                  <TableCell>{user.daysWorked}</TableCell>
                  <TableCell>{user.totalCheckIns}</TableCell>
                  <TableCell>{user.totalCheckOuts}</TableCell>
                  <TableCell>{user.totalHours.toFixed(2)} hrs</TableCell>
                  <TableCell>{user.avgHoursPerDay.toFixed(2)} hrs</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {isLoading ? 'Loading...' : 'No attendance data found for the selected date range'}
                </TableCell>
              </TableRow>
            )}
            
            {attendanceSummary?.stats && (
              <TableRow className="bg-gray-50 font-medium">
                <TableCell colSpan={2} className="text-right">Summary:</TableCell>
                <TableCell>{attendanceSummary.records?.length ? new Set(attendanceSummary.records.map(r => r.date)).size : 0} days</TableCell>
                <TableCell>{attendanceSummary.stats.totalCheckIns}</TableCell>
                <TableCell>{attendanceSummary.stats.totalCheckOuts}</TableCell>
                <TableCell>{attendanceSummary.stats.totalWorkingHours.toFixed(2)} hrs</TableCell>
                <TableCell>
                  {attendanceSummary.stats.averageHoursPerDay.toFixed(2)} hrs
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
