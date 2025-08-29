import { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { useQuery } from '@tanstack/react-query';
import { attendanceService } from '@/services/attendance.service';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { ColumnDef } from '@tanstack/react-table';
import { Skeleton } from '@/components/ui/skeleton';

type AttendanceStatus = 'present' | 'absent' | 'late' | 'half-day';

interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  checkIn: string;
  checkOut?: string;
  totalHours?: number;
  status: AttendanceStatus;
}

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

export const AdminAttendanceView = () => {
  const [activeTab, setActiveTab] = useState('daily');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedWeek, setSelectedWeek] = useState(format(new Date(), 'yyyy-\'W\'ww'));
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  
  const weekRange = useMemo(() => getWeekRange(selectedWeek), [selectedWeek]);

  // Fetch daily attendance
  const { data: dailyData = [], isLoading: isLoadingDaily } = useQuery<AttendanceRecord[]>({
    queryKey: ['adminAttendance', 'daily', selectedDate],
    queryFn: () => attendanceService.getAttendanceByDate({ date: selectedDate }),
    enabled: activeTab === 'daily',
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch weekly attendance
  const { data: weeklyData = [], isLoading: isLoadingWeekly } = useQuery<AttendanceRecord[]>({
    queryKey: ['adminAttendance', 'weekly', selectedWeek],
    queryFn: () => attendanceService.getAttendanceSummary({
      startDate: format(weekRange.start, 'yyyy-MM-dd'),
      endDate: format(weekRange.end, 'yyyy-MM-dd'),
    }),
    enabled: activeTab === 'weekly',
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch monthly attendance
  const { data: monthlyData = [], isLoading: isLoadingMonthly } = useQuery<AttendanceRecord[]>({
    queryKey: ['adminAttendance', 'monthly', selectedMonth],
    queryFn: () => {
      const start = startOfMonth(new Date(selectedMonth));
      const end = endOfMonth(start);
      return attendanceService.getAttendanceSummary({
        startDate: format(start, 'yyyy-MM-dd'),
        endDate: format(end, 'yyyy-MM-dd'),
      });
    },
    enabled: activeTab === 'monthly',
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

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
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Attendance Records</CardTitle>
        <p className="text-sm text-muted-foreground">
          Viewing {activeTab} attendance for {renderDateRange}
        </p>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="daily">Daily</TabsTrigger>
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
          </TabsList>

          <TabsContent value="daily" className="mt-4">
            <div className="mb-4">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full max-w-xs p-2 border rounded-md text-sm"
              />
            </div>
            {renderContent()}
          </TabsContent>

          <TabsContent value="weekly" className="mt-4">
            <div className="mb-4">
              <input
                type="week"
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value)}
                className="w-full max-w-xs p-2 border rounded-md text-sm"
              />
            </div>
            {renderContent()}
          </TabsContent>

          <TabsContent value="monthly" className="mt-4">
            <div className="mb-4">
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full max-w-xs p-2 border rounded-md text-sm"
              />
            </div>
            {renderContent()}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
