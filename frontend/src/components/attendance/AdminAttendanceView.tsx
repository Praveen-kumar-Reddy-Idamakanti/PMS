import { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { useQuery } from '@tanstack/react-query';
import { attendanceService } from '@/services/attendance.service';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO, differenceInHours, parse } from 'date-fns';
import { ColumnDef } from '@tanstack/react-table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AttendanceRecord, AttendanceStatus, UserAttendanceStats } from '@/types/attendance';

const statusConfig = {
  present: { label: 'Present', className: 'bg-green-100 text-green-800' },
  absent: { label: 'Absent', className: 'bg-red-100 text-red-800' },
  late: { label: 'Late', className: 'bg-yellow-100 text-yellow-800' },
  'half-day': { label: 'Half Day', className: 'bg-blue-100 text-blue-800' },
} as const;

const AttendanceStatusBadge = ({ status }: { status: AttendanceStatus }) => {
  const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-800' };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
};

const attendanceColumns: ColumnDef<AttendanceRecord>[] = [
  {
    accessorKey: 'userName',
    header: 'Employee',
  },
  {
    accessorKey: 'date',
    header: 'Date',
    cell: ({ row }) => 
      row.original.checkIn ? format(parseISO(row.original.checkIn), 'MMM d, yyyy') : '--',
  },
  {
    accessorKey: 'checkInTime',
    header: 'Check In',
    cell: ({ row }) => 
      row.original.checkIn ? format(parseISO(row.original.checkIn), 'h:mm a') : '--',
  },
  {
    accessorKey: 'checkOut',
    header: 'Check Out',
    cell: ({ row }) => 
      row.original.checkOut ? format(parseISO(row.original.checkOut), 'h:mm a') : '--',
  },
  {
    accessorKey: 'totalHours',
    header: 'Hours Worked',
    cell: ({ row }) => 
      row.original.totalHours ? `${row.original.totalHours.toFixed(1)}h` : '--',
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <AttendanceStatusBadge status={row.original.status} />,
  },
];

const getWeekRange = (weekString: string) => {
  try {
    const [year, week] = weekString.split('-W').map(Number);
    const start = startOfWeek(new Date(year, 0, 1 + (week - 1) * 7), { weekStartsOn: 0 });
    const end = endOfWeek(start, { weekStartsOn: 0 });
    return { start, end };
  } catch (error) {
    const now = new Date();
    return {
      start: startOfWeek(now, { weekStartsOn: 0 }),
      end: endOfWeek(now, { weekStartsOn: 0 })
    };
  }
};

const calculateUserStats = (records: AttendanceRecord[]): UserAttendanceStats[] => {
  const userMap = new Map<string, UserAttendanceStats>();

  records.forEach(record => {
    if (!userMap.has(record.userId)) {
      userMap.set(record.userId, {
        userId: record.userId,
        userName: record.userName || 'Unknown User',
        employeeId: record.employeeId || 'N/A',
        totalPresent: 0,
        totalAbsent: 0,
        totalLate: 0,
        totalHalfDay: 0,
        totalCheckIns: 0,
        totalCheckOuts: 0,
        totalHoursWorked: 0,
      });
    }

    const userStats = userMap.get(record.userId)!;
    
    if (record.checkIn) {
      userStats.totalCheckIns++;
      userStats.lastCheckIn = record.checkIn;
    }
    
    if (record.checkOut) {
      userStats.totalCheckOuts++;
      userStats.lastCheckOut = record.checkOut;
    }

    // Calculate hours worked using the backend's totalHours if available
    if (record.totalHours) {
      userStats.totalHoursWorked += record.totalHours;
    } else if (record.checkIn && record.checkOut) {
      // Fallback to frontend calculation if totalHours is not provided
      try {
        const checkInTime = parseISO(record.checkIn);
        const checkOutTime = parseISO(record.checkOut);
        const hoursWorked = differenceInHours(checkOutTime, checkInTime, { roundingMethod: 'floor' });
        userStats.totalHoursWorked += Math.max(0, hoursWorked);
      } catch (error) {
        console.error('Error calculating hours worked:', error);
      }
    }

    // Update status counts
    if (record.status) {
      switch (record.status.toLowerCase()) {
        case 'present':
          userStats.totalPresent++;
          break;
        case 'absent':
          userStats.totalAbsent++;
          break;
        case 'late':
          userStats.totalLate++;
          break;
        case 'half-day':
        case 'half_day':
        case 'halfday':
          userStats.totalHalfDay++;
          break;
      }
    }
  });

  return Array.from(userMap.values()).sort((a, b) => 
    a.userName.localeCompare(b.userName)
  );
};

export const AdminAttendanceView = () => {
  const [activeTab, setActiveTab] = useState('daily');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedWeek, setSelectedWeek] = useState(format(new Date(), 'yyyy-\'W\'ww'));
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  
  const weekRange = useMemo(() => getWeekRange(selectedWeek), [selectedWeek]);

  // Fetch daily attendance
  const { data: dailyData = [], isLoading: isLoadingDaily } = useQuery<AttendanceRecord[]>({
    queryKey: ['adminAttendance', 'daily', selectedDate],
    queryFn: async () => {
      try {
        return await attendanceService.getAttendanceByDate({
          date: format(new Date(selectedDate), 'yyyy-MM-dd')
        });
      } catch (error) {
        console.error('Error fetching daily attendance:', error);
        throw error;
      }
    },
    enabled: activeTab === 'daily',
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch weekly attendance
  const { data: weeklyData = [], isLoading: isLoadingWeekly } = useQuery<AttendanceRecord[]>({
    queryKey: ['adminAttendance', 'weekly', selectedWeek],
    queryFn: async () => {
      try {
        return await attendanceService.getAttendanceSummary({
          startDate: format(weekRange.start, 'yyyy-MM-dd'),
          endDate: format(weekRange.end, 'yyyy-MM-dd'),
        });
      } catch (error) {
        console.error('Error fetching weekly attendance:', error);
        throw error;
      }
    },
    enabled: activeTab === 'weekly',
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch monthly attendance
  const { data: monthlyData = [], isLoading: isLoadingMonthly } = useQuery<AttendanceRecord[]>({
    queryKey: ['adminAttendance', 'monthly', selectedMonth],
    queryFn: async () => {
      try {
        const start = startOfMonth(new Date(selectedMonth));
        const end = endOfMonth(start);
        return await attendanceService.getAttendanceSummary({
          startDate: format(start, 'yyyy-MM-dd'),
          endDate: format(end, 'yyyy-MM-dd'),
        });
      } catch (error) {
        console.error('Error fetching monthly attendance:', error);
        throw error;
      }
    },
    enabled: activeTab === 'monthly',
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Calculate statistics
  const dailyStats = useMemo(() => calculateUserStats(dailyData), [dailyData]);
  const weeklyStats = useMemo(() => calculateUserStats(weeklyData), [weeklyData]);
  const monthlyStats = useMemo(() => calculateUserStats(monthlyData), [monthlyData]);

  const statsColumns = [
    { header: 'Employee', accessorKey: 'userName' },
    { header: 'Employee ID', accessorKey: 'employeeId' },
    { header: 'Present', accessorKey: 'totalPresent' },
    { header: 'Absent', accessorKey: 'totalAbsent' },
    { header: 'Late', accessorKey: 'totalLate' },
    { header: 'Half Days', accessorKey: 'totalHalfDay' },
    { header: 'Check-ins', accessorKey: 'totalCheckIns' },
    { header: 'Check-outs', accessorKey: 'totalCheckOuts' },
    { 
      header: 'Total Hours',
      accessorKey: 'totalHoursWorked',
      cell: ({ row }: { row: any }) => `${row.original.totalHoursWorked.toFixed(1)}h`
    },
    {
      header: 'Last Activity',
      accessorKey: 'lastCheckIn',
      cell: ({ row }: { row: any }) => {
        const lastActivity = row.original.lastCheckIn || row.original.lastCheckOut;
        return lastActivity ? format(parseISO(lastActivity), 'MMM d, yyyy HH:mm') : '--';
      }
    }
  ];

  const isLoading = useMemo(() => {
    return (activeTab === 'daily' && isLoadingDaily) ||
           (activeTab === 'weekly' && isLoadingWeekly) ||
           (activeTab === 'monthly' && isLoadingMonthly);
  }, [activeTab, isLoadingDaily, isLoadingWeekly, isLoadingMonthly]);

  const currentData = useMemo(() => {
    if (activeTab === 'daily') return dailyData;
    if (activeTab === 'weekly') return weeklyData;
    return monthlyData;
  }, [activeTab, dailyData, weeklyData, monthlyData]);

  const renderDateRange = useMemo(() => {
    if (activeTab === 'daily') {
      return format(parseISO(selectedDate), 'MMMM d, yyyy');
    } else if (activeTab === 'weekly') {
      return `${format(weekRange.start, 'MMM d')} - ${format(weekRange.end, 'MMM d, yyyy')}`;
    } else {
      const month = new Date(selectedMonth);
      return format(month, 'MMMM yyyy');
    }
  }, [activeTab, selectedDate, selectedMonth, weekRange]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="p-4 space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      );
    }
    return (
      <DataTable
        columns={attendanceColumns}
        data={currentData}
        isLoading={isLoading}
      />
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Attendance Management</h2>
        <p className="text-muted-foreground">View and manage employee attendance records</p>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="daily">Daily</TabsTrigger>
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Daily Attendance - {format(new Date(), 'MMMM d, yyyy')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-4">Attendance Summary</h3>
                {isLoadingDaily ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : (
                  <ScrollArea className="h-[400px] rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {statsColumns.map((column) => (
                            <TableHead key={column.accessorKey}>
                              {column.header}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dailyStats.map((stat) => (
                          <TableRow key={stat.userId}>
                            {statsColumns.map((column) => (
                              <TableCell key={`${stat.userId}-${column.accessorKey}`}>
                                {column.cell 
                                  ? column.cell({ row: { original: stat } }) 
                                  : stat[column.accessorKey as keyof UserAttendanceStats]}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-4">Detailed Records</h3>
                <DataTable columns={attendanceColumns} data={dailyData} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="weekly" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>
                  Weekly Attendance - {format(weekRange.start, 'MMM d')} to {format(weekRange.end, 'MMM d, yyyy')}
                </CardTitle>
                <input
                  type="week"
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(e.target.value)}
                  className="rounded-md border p-2 text-sm"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-4">Weekly Summary</h3>
                {isLoadingWeekly ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : (
                  <ScrollArea className="h-[400px] rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {statsColumns.map((column) => (
                            <TableHead key={column.accessorKey}>
                              {column.header}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {weeklyStats.map((stat) => (
                          <TableRow key={stat.userId}>
                            {statsColumns.map((column) => (
                              <TableCell key={`${stat.userId}-${column.accessorKey}`}>
                                {column.cell 
                                  ? column.cell({ row: { original: stat } }) 
                                  : stat[column.accessorKey as keyof UserAttendanceStats]}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-4">Detailed Records</h3>
                <DataTable columns={attendanceColumns} data={weeklyData} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monthly" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>
                  Monthly Attendance - {format(new Date(selectedMonth), 'MMMM yyyy')}
                </CardTitle>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="rounded-md border p-2 text-sm"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-4">Monthly Summary</h3>
                {isLoadingMonthly ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : (
                  <ScrollArea className="h-[400px] rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {statsColumns.map((column) => (
                            <TableHead key={column.accessorKey}>
                              {column.header}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {monthlyStats.map((stat) => (
                          <TableRow key={stat.userId}>
                            {statsColumns.map((column) => (
                              <TableCell key={`${stat.userId}-${column.accessorKey}`}>
                                {column.cell 
                                  ? column.cell({ row: { original: stat } }) 
                                  : stat[column.accessorKey as keyof UserAttendanceStats]}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-4">Detailed Records</h3>
                <DataTable columns={attendanceColumns} data={monthlyData} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
