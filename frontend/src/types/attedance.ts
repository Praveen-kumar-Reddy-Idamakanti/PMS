export type AttendanceStatus =
  | "not_checked_in"
  | "checked_in"
  | "pending_approval"
  | "checked_out";

export interface RemoteRequest {
  id: string | number;
  status: "pending" | "approved" | "rejected";
  request_date: string;
  reason?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AttendanceAction {
  id?: string;
  type: "checkin" | "checkout";
  timestamp: string;
  notes?: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
}

export interface TodayStatus {
  status: AttendanceStatus;
  isCheckedIn: boolean;
  needsCheckIn: boolean;
  checkInTime: string | null;
  checkOutTime: string | null;
  hoursWorked: number;
  isRemote: boolean;
  remoteRequest?: RemoteRequest | null;
  lastAction?: AttendanceAction | null;
}
