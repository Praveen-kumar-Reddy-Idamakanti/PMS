export interface LeaveType {
  id: string | number;
  name: string;
  
  // Frontend fields (camelCase)
  yearlyQuota?: number;
  carryForward?: number;
  isActive?: boolean;
  monthlyQuota?: number;
  
  // Backend fields (snake_case)
  yearly_quota?: number;
  carry_forward?: number;
  is_active?: boolean | number;
  monthly_quota?: number;
  created_at?: string;
  updated_at?: string;
}

export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected' | 'pending' | 'approved' | 'rejected';

export interface LeaveRequest {
  id: number;
  user_id: number;
  leave_type_id: number;
  start_date: string;
  end_date: string;
  reason: string;
  status: string;
  created_at: string;
  updated_at: string;
  approved_by?: number;
  days: number;
  leave_type?: string;
  // Extended fields for admin view
  user_name?: string;
  user_email?: string;
  employee_id?: string | null;
  leave_type_name?: string;
  approved_by_user_name?: string | null;
  name: string;
  email: string;
  employeeId: string | null;
  leaveType?: {
    name: string;
  };
  approvedByUser?: {
    name: string;
  };
}

export interface LeaveBalance {
  // Frontend fields (camelCase)
  id: string | number;
  userId: string | number;
  leaveTypeId: string | number;
  remainingDays: number;
  year: number;
  
  // Backend fields (snake_case)
  user_id?: string | number;
  leave_type_id?: string | number;
  leave_type?: string;
  balance?: number;
  created_at?: string;
  updated_at?: string;
  monthly_quota?: number;
  yearly_quota?: number;
  carry_forward_allowed?: number;
  carry_forward_limit?: number;
}

export interface RemoteWorkRequest {
  id: string;
  userId: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  createdAt: string;
  updatedAt: string;
}
