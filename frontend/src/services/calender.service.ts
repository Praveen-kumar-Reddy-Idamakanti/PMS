// src/services/calendarService.ts
import { fetchWithAuth } from "../lib/api"; // Using fetchWithAuth

const API_BASE_URL = import.meta.env.VITE_API_URL; // adjust if needed

export interface CalendarDay {
  date: string;
  status: "present" | "absent" | "leave" | "holiday" | "future" | "task_due" | null;
  holiday_name?: string | null;
  leave_reason?: string | null;
  task_id?: string | number | null;
  task_title?: string | null;
  task_description?: string | null;
  checkin_time?: string | null;
  checkout_time?: string | null;
  type?: 'attendance' | 'task';
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
  const res = await fetchWithAuth(`/calendar/${userId}?month=${month}`, { // Using fetchWithAuth
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json(); // fetchWithAuth returns Response object, need to parse JSON
}

export async function fetchDateDetails(
  userId: number,
  date: string,
  token: string
): Promise<DateDetail> {
  const res = await fetchWithAuth(`/calendar/${userId}/${date}`, { // Using fetchWithAuth
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json(); // fetchWithAuth returns Response object, need to parse JSON
}

// Fetch tasks for a specific month for the specified user
export async function fetchTasksForMonth(userId: number, month: string, token: string): Promise<CalendarDay[]> {
  try {
    // Get tasks assigned to the current user
    const response = await fetchWithAuth(`/tasks?assignedTo=${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch tasks');
    }

    const tasks = await response.json();
    
    // Filter tasks for the requested month and convert to calendar events
    return tasks
      .filter((task: any) => {
        if (!task.dueDate) return false;
        try {
          const taskDate = new Date(task.dueDate);
          // Check if the task is in the requested month and year
          return taskDate.getMonth() + 1 === parseInt(month.split('-')[1]) && 
                 taskDate.getFullYear() === parseInt(month.split('-')[0]);
        } catch (e) {
          console.error('Error parsing task date:', task.dueDate, e);
          return false;
        }
      })
      .map((task: any) => ({
        date: task.dueDate.split('T')[0], // Extract just the date part
        status: 'task_due' as const,
        task_title: task.title,
        task_description: task.description,
        type: 'task' as const
      }));
  } catch (error) {
    console.error('Error fetching task calendar events:', error);
    return [];
  }
}

export async function createTaskCalendarEvent(
  taskEvent: { taskId: number; userId: number; title: string; description?: string; dueDate: string },
  token: string
): Promise<any> {
  try {
    if (!taskEvent.taskId || !taskEvent.title || !taskEvent.dueDate) {
      throw new Error('Task ID, title, and due date are required');
    }

    if (!token) {
      throw new Error('Authentication token is required');
    }

    const response = await fetchWithAuth(`/task-calendar-events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        taskId: taskEvent.taskId,
        userId: taskEvent.userId,
        title: taskEvent.title,
        description: taskEvent.description,
        dueDate: taskEvent.dueDate
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to create calendar event');
    }

    return await response.json();
  } catch (error) {
    console.error('Error in createTaskCalendarEvent:', error);
    throw error; // Re-throw to be handled by the caller
  }
}
