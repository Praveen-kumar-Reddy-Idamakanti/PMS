import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { attendanceService } from "@/services/attendance.service";
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { LoadingGif } from "@/components/ui/LoadingGif";

export const AttendanceManagement = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [selectedUser, setSelectedUser] = useState<string>('all');

  const { data: attendanceData, isLoading } = useQuery({
    queryKey: ['admin-attendance', date],
    queryFn: async () => {
      if (!date) return [];
      const formattedDate = format(date, 'yyyy-MM-dd');
      const data = await attendanceService.getAttendanceByDate({ date: formattedDate });
      console.log('Attendance Data:', data);
      return data;
    },
  });

  const { data: users } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => attendanceService.getUsers(),
  });

  if (isLoading) return <LoadingGif text="Loading attendance data..." />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 mb-4">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-[280px] justify-start text-left font-normal",
                !date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, "PPP") : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        <select
          className="bg-background border rounded p-2 text-sm"
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
        >
          <option value="all">All Users</option>
          {Array.isArray(users) && users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Check In</TableHead>
              <TableHead>Check Out</TableHead>
              <TableHead>Total Hours</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.isArray(attendanceData) && attendanceData.map((record) => (
              <TableRow key={record.id}>
                <TableCell>{record.userName || 'Unknown User'}</TableCell>
                <TableCell>
                  {record.checkIn ? format(new Date(record.checkIn), 'PPpp') : 'Not checked in'}
                </TableCell>
                <TableCell>
                  {record.checkOut ? format(new Date(record.checkOut), 'PPpp') : 'Not checked out'}
                </TableCell>
                <TableCell>
                  {record.totalHours ? `${record.totalHours.toFixed(2)}h` : 'Not checked out'}
                </TableCell>
                <TableCell>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    record.status === 'present' 
                      ? 'bg-green-100 text-green-800' 
                      : record.status === 'half-day'
                      ? 'bg-yellow-100 text-yellow-800'
                      : record.status === 'late'
                      ? 'bg-orange-100 text-orange-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {record.status === 'present' ? 'Present' : 
                     record.status === 'half-day' ? 'Half Day' :
                     record.status === 'late' ? 'Late' : 'Absent'}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

