import React, { useEffect, useState, useCallback } from 'react';
import { useAttendance } from '../../hooks/useAttendance';
import { debug } from '../../utils/debug';

interface AttendanceRecord {
  id: number;
  userId: number;
  type: 'checkin' | 'checkout';
  timestamp: string;
  notes?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  createdAt: string;
  updatedAt: string;
}

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { format, parseISO, isSameDay } from 'date-fns';
import { Button } from '../ui/button';
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { cn } from '../../lib/utils';

// Debug component name for consistent logging
const COMPONENT_NAME = 'AttendanceRecords';

export const AttendanceRecords = () => {
  const { records, loading, fetchAttendanceRecords } = useAttendance();
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(new Date().setDate(1)), // Start of current month
    to: new Date(), // Today
  });

  // Log component mount and initial state
  useEffect(() => {
    debug(COMPONENT_NAME, 'Component mounted', { 
      recordCount: records?.length || 0,
      dateRange,
      loading 
    });
    
    return () => {
      debug(COMPONENT_NAME, 'Component unmounted');
    };
  }, []);

  // Group records by date with debugging
  const groupedRecords = React.useMemo(() => {
    debug(COMPONENT_NAME, 'Grouping records', { recordCount: records?.length || 0 });
    return (records || []).reduce((acc, record) => {
      const date = record.timestamp.split('T')[0];
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(record);
      return acc;
    }, {} as Record<string, AttendanceRecord[]>);
  }, [records]);

  // Fetch records when date range changes
  useEffect(() => {
    if (dateRange.from && dateRange.to) {
      const params = {
        startDate: dateRange.from.toISOString().split('T')[0],
        endDate: dateRange.to.toISOString().split('T')[0],
      };
      
      debug(COMPONENT_NAME, 'Fetching attendance records', { params });
      
      fetchAttendanceRecords(params)
        .then(() => {
          debug(COMPONENT_NAME, 'Successfully fetched attendance records', { 
            recordCount: records?.length || 0 
          });
        })
        .catch(error => {
          debug(COMPONENT_NAME, 'Error fetching attendance records', { 
            error: error.message,
            fullError: error 
          });
        });
    }
  }, [dateRange, fetchAttendanceRecords, records?.length]);

  // Calculate total hours for a day
  const calculateTotalHours = (records: AttendanceRecord[]) => {
    const typedRecords = records as AttendanceRecord[];
    const checkIns = typedRecords
      .filter((r): r is AttendanceRecord & { type: 'checkin' } => r.type === 'checkin')
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
    const checkOuts = typedRecords
      .filter((r): r is AttendanceRecord & { type: 'checkout' } => r.type === 'checkout')
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    let totalHours = 0;
    const pairs = Math.min(checkIns.length, checkOuts.length);
    
    for (let i = 0; i < pairs; i++) {
      const checkInTime = new Date(checkIns[i].timestamp).getTime();
      const checkOutTime = new Date(checkOuts[i].timestamp).getTime();
      totalHours += (checkOutTime - checkInTime) / (1000 * 60 * 60);
    }

    return totalHours.toFixed(2);
  };

  // Find check-in and check-out records for a specific date
  const getCheckInOutRecords = (date: string) => {
    const dayRecords = groupedRecords[date] || [];
    const checkIn = dayRecords.find((r: AttendanceRecord) => r.type === 'checkin');
    const checkOut = dayRecords.find((r: AttendanceRecord) => r.type === 'checkout');
    return { checkIn, checkOut };
  };

  // Render records for a specific date
  const renderRecordsForDate = (date: string) => {
    const dayRecords: AttendanceRecord[] = groupedRecords[date] || [];
    const { checkIn, checkOut } = getCheckInOutRecords(date);
    const totalHours = calculateTotalHours(dayRecords);

    return (
      <TableRow key={date}>
        <TableCell className="font-medium">
          {format(parseISO(date), 'EEE, MMM d, yyyy')}
        </TableCell>
        <TableCell>
          {checkIn ? format(parseISO(checkIn.timestamp), 'h:mm a') : '-'}
        </TableCell>
        <TableCell>
          {checkOut ? format(parseISO(checkOut.timestamp), 'h:mm a') : '-'}
        </TableCell>
        <TableCell>
          {checkIn && checkOut 
            ? totalHours + ' hrs' 
            : '-'}
        </TableCell>
        <TableCell className="max-w-[200px] truncate">
          {checkIn?.address || '-'}
        </TableCell>
        <TableCell className="max-w-[200px] truncate">
          {checkIn?.notes || checkOut?.notes || '-'}
        </TableCell>
      </TableRow>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-medium">Attendance History</CardTitle>
        <div className="flex items-center space-x-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant="outline"
                className={cn(
                  'w-[260px] justify-start text-left font-normal',
                  !dateRange && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, 'MMM d, yyyy')} - {format(dateRange.to, 'MMM d, yyyy')}
                    </>
                  ) : (
                    format(dateRange.from, 'MMM d, yyyy')
                  )
                ) : (
                  <span>Pick a date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={(range) => {
                  if (range?.from && range.to) {
                    setDateRange({
                      from: range.from,
                      to: range.to
                    });
                  }
                }}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : Object.keys(groupedRecords).length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No attendance records found for the selected period.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Check In</TableHead>
                <TableHead>Check Out</TableHead>
                <TableHead>Total Hours</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(groupedRecords)
                .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
                .map(([date]) => renderRecordsForDate(date))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
