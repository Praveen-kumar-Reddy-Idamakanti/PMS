import { useQuery } from "@tanstack/react-query";
import { attendanceService } from "@/services/attendance.service";
import type { AttendanceSummary, AttendanceRecord } from "@/services/attendance.service";
import * as React from 'react';
import { format } from 'date-fns';
import { ArrowLeft, Calendar as CalendarIcon, FileDown, FileText, FileType } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import * as XLSX from 'xlsx';
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
  
  const handleExportToExcel = () => {
    if (!userStats.length || !startDate || !endDate) return;
    
    // Format date range for display
    const startFormatted = format(startDate, 'MMM d, yyyy');
    const endFormatted = format(endDate, 'MMM d, yyyy');
    const monthYear = format(startDate, 'MMMM yyyy');
    
    // Prepare data for Excel
    const data = userStats.map(stat => ({
      'Month': monthYear,
      'Date Range': `${startFormatted} to ${endFormatted}`,
      'Employee Name': stat.userName,
      'Employee ID': stat.employeeId || 'N/A',
      'Days Worked': stat.daysWorked,
      'Total Check-ins': stat.totalCheckIns,
      'Total Check-outs': stat.totalCheckOuts,
      'Total Hours': stat.totalHours.toFixed(2),
      'Average Hours/Day': stat.avgHoursPerDay.toFixed(2)
    }));
    
    // Auto-size columns
    const wscols = [
      {wch: 15}, // Month
      {wch: 25}, // Date Range
      {wch: 25}, // Employee Name
      {wch: 15}, // Employee ID
      {wch: 12}, // Days Worked
      {wch: 15}, // Total Check-ins
      {wch: 15}, // Total Check-outs
      {wch: 12}, // Total Hours
      {wch: 15}  // Average Hours/Day
    ];
    
    // Create worksheet with auto-sized columns
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = wscols;
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance Summary');
    
    // Generate file name with month and year
    const formattedMonthYear = format(startDate, 'MMMM_yyyy');
    const fileName = `Attendance_Summary_${formattedMonthYear}.xlsx`;
    
    // Save the file
    XLSX.writeFile(wb, fileName);
  };
  
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
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-full"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Attendance Summary</h1>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline"
              className="gap-2 border-orange-500 text-orange-500 hover:bg-orange-50 hover:text-orange-600"
              disabled={!userStats.length}
            >
              <FileDown className="h-4 w-4" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem 
              onClick={handleExportToExcel}
              className="flex items-center gap-2 cursor-pointer"
            >
              <FileText className="h-4 w-4 text-green-600" />
              <span>Export to Excel</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="flex items-center gap-2 text-muted-foreground cursor-not-allowed"
              disabled
            >
              <FileText className="h-4 w-4 text-red-500 opacity-50" />
              <span>Export to PDF (Coming Soon)</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="flex items-center gap-2 text-muted-foreground cursor-not-allowed"
              disabled
            >
              <FileType className="h-4 w-4 text-blue-500 opacity-50" />
              <span>Export to Word (Coming Soon)</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
