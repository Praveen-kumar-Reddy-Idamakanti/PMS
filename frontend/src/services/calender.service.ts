// src/services/calendarService.ts
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL; // adjust if needed

export interface CalendarDay {
  date: string;
  status: "present" | "absent" | "leave" | "holiday" | "future" | null;
  holiday_name?: string | null;
  leave_reason?: string | null;
  checkin_time?: string | null;
  checkout_time?: string | null;
}

export interface DateDetail {
  type: "present" | "absent" | "leave" | "holiday" | "future";
  name?: string;        // for holiday
  reason?: string;      // for leave
  status?: string;      // leave status
  checkin?: string;     // for present
  checkout?: string;    // for present
  total_hours?: number; // for present
}

export async function fetchMonthlyCalendar(
  userId: number,
  month: string,
  token: string
): Promise<CalendarDay[]> {
  const res = await axios.get(`${API_BASE_URL}/calendar/${userId}`, {
    params: { month },
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

export async function fetchDateDetails(
  userId: number,
  date: string,
  token: string
): Promise<DateDetail> {
  const res = await axios.get(`${API_BASE_URL}/calendar/${userId}/${date}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}
