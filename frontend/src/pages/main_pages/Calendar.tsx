import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle, XCircle, Clock, Plane, ClipboardList } from "lucide-react"; // Added ClipboardList
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { format, addMonths, subMonths, getDay, isSameDay } from "date-fns";
import {
  fetchMonthlyCalendar,
  fetchDateDetails,
  fetchTasksForMonth,
  CalendarDay,
  DateDetail,
} from "@/services/calender.service";
import CalendarHeader from "@/components/calender/CalendarHeader";
import CalendarGrid from "@/components/calender/CalendarGrid";
import MonthlySummary from "@/components/calender/MonthlySummary";
import DateDetails from "@/components/calender/DateDetails";

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [records, setRecords] = useState<CalendarDay[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [details, setDetails] = useState<DateDetail | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id;
  const token = localStorage.getItem("token") || "";

  // Fetch both attendance and task due dates
  useEffect(() => {
    const fetchData = async () => {
      if (!userId) return; // Don't fetch if no user
      try {
        const month = format(currentDate, "yyyy-MM");
        console.log(`[DEBUG][Frontend] Requesting calendar data for userId=${userId}, month=${month}`);
        
        // Fetch both attendance and task data in parallel
        const [attendanceData, tasksData] = await Promise.all([
          fetchMonthlyCalendar(parseInt(userId), month, token),
          fetchTasksForMonth(parseInt(userId), month, token)
        ]);

        // Process attendance data
        const processedAttendance = attendanceData.map((day): CalendarDay => ({
          ...day,
          date: day.date,
          type: 'attendance' as const,
          // Mark Sundays as holidays
          ...(getDay(new Date(day.date)) === 0 
            ? { status: 'holiday' as const, holiday_name: 'Sunday' } 
            : {})
        }));

        // Combine attendance and task data
        const combinedData = [
          ...processedAttendance,
          ...tasksData
        ];

        setRecords(combinedData);
        
        // Debug: log all status counts
        const statusCounts = combinedData.reduce((acc, day) => {
          acc[day.status || 'unknown'] = (acc[day.status || 'unknown'] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        console.log(`[DEBUG][Frontend] Calendar for ${month}:`, statusCounts);
      } catch (err) {
        console.error("Failed to fetch calendar data:", err);
      }
    };
    
    fetchData();
  }, [currentDate, userId, token]);

  const handleDateSelect = (date: Date) => {
    // Toggle selection if clicking the same date
    if (isSameDay(date, selectedDate)) {
      // Only clear if clicking the same date again
      setSelectedDate(new Date());
      setDetails(null);
      return;
    }
    
    // Select the new date
    setSelectedDate(date);
    
    // Fetch details for the selected date
    const fetchDetails = async () => {
      if (!userId) return;
      try {
        const dateStr = format(date, "yyyy-MM-dd");
        const details = await fetchDateDetails(parseInt(userId), dateStr, token);
        setDetails(details);
      } catch (error) {
        console.error("Error fetching date details:", error);
      }
    };
    fetchDetails();
  };

  const getStatusConfig = (status: CalendarDay["status"] | DateDetail["type"] | string) => {
    switch (status) {
      case "present":
        return { 
          color: "bg-green-100", 
          textColor: "text-green-800", 
          icon: CheckCircle, 
          label: "Present" 
        };
      case "absent":
        return { 
          color: "bg-red-100", 
          textColor: "text-red-800", 
          icon: XCircle, 
          label: "Absent" 
        };
      case "leave":
        return { 
          color: "bg-yellow-100", 
          textColor: "text-yellow-800", 
          icon: Plane, 
          label: "Leave" 
        };
      case "holiday":
        return { 
          color: "bg-purple-100", 
          textColor: "text-purple-800", 
          icon: Clock, 
          label: "Holiday" 
        };
      case "task_due":
        return { 
          color: "bg-blue-100", 
          textColor: "text-blue-800", 
          icon: ClipboardList, 
          label: "Task Due" 
        };
      default:
        return null;
    }
  };

  const navigateMonth = (dir: "prev" | "next") => {
    setCurrentDate((prev) => (dir === "prev" ? subMonths(prev, 1) : addMonths(prev, 1)));
    setSelectedDate(null);
    setDetails(null);
  };

  const stats = {
    present: records.filter((r) => r.status === "present").length,
    absent: records.filter((r) => r.status === "absent").length,
    leave: records.filter((r) => r.status === "leave").length,
    totalWorkDays: records.filter((r) => r.status !== "holiday" && getDay(new Date(r.date)) !== 0).length,
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card shadow-soft">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-xl font-bold text-foreground">Calendar</h1>
            <Badge variant="outline">Attendance Tracking</Badge>
          </div>
          <CalendarHeader currentDate={currentDate} onNavigate={navigateMonth} />
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Calendar grid */}
          <div className="lg:col-span-3">
            <Card className="shadow-medium">
              <CardHeader>
                <CardTitle>Monthly Attendance</CardTitle>
                <CardDescription>Click a date to view details</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg p-4 bg-background">
                  <CalendarGrid
                    currentDate={currentDate}
                    records={records}
                    selectedDate={selectedDate}
                    onSelectDate={handleDateSelect}
                    getStatusConfig={getStatusConfig}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <MonthlySummary {...stats} />
            {selectedDate && (
              <DateDetails date={selectedDate} details={details} getStatusConfig={getStatusConfig} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
