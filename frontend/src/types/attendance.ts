export type AttendanceStatus = 'present' | 'absent' | 'late' | 'half-day' | 'on-leave';

export interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  employeeId?: string;
  role?: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  totalHours: number;
  status: AttendanceStatus;
  isRemote?: boolean;
  remoteStatus?: string | null;
  remoteReason?: string | null;
  mode?: 'office' | 'remote';
  notes?: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  photo?: string;
}

export interface UserAttendanceStats {
  userId: string;
  userName: string;
  employeeId?: string;
  totalPresent: number;
  totalAbsent: number;
  totalLate: number;
  totalHalfDay: number;
  totalCheckIns: number;
  totalCheckOuts: number;
  totalHoursWorked: number;
  lastCheckIn?: string;
  lastCheckOut?: string;
}
