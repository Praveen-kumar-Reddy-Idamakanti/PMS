import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle, XCircle, Clock, Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { format, addMonths, subMonths, getDay } from "date-fns";
import {
  fetchMonthlyCalendar,
  fetchDateDetails,
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
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [details, setDetails] = useState<DateDetail | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id;
  const token = localStorage.getItem("token") || "";

  useEffect(() => {
    const fetchData = async () => {
      if (!userId) return; // Don't fetch if no user
      try {
        const month = format(currentDate, "yyyy-MM");
        console.log(`[DEBUG][Frontend] Requesting calendar for userId=${userId}, month=${month}`);
        const data = await fetchMonthlyCalendar(parseInt(userId), month, token);
        console.log(`[DEBUG][Frontend] Response:`, data);

        const processedData = data.map((day): CalendarDay => {
          // The date string is in 'YYYY-MM-DD' format.
          // new Date('YYYY-MM-DD') can have timezone issues.
          // A safer way to parse it without timezone shifts is to split it.
          const [year, month, dayOfMonth] = day.date.split('-').map(Number);
          const date = new Date(year, month - 1, dayOfMonth);
          
          if (getDay(date) === 0) { // 0 is Sunday
            return { ...day, status: 'holiday', holiday_name: 'Sunday' };
          }
          return day;
        });

        setRecords(processedData);
        // Debug: log all status counts and days
        const absentDays = processedData.filter(d => d.status === "absent");
        const presentDays = processedData.filter(d => d.status === "present");
        const leaveDays = processedData.filter(d => d.status === "leave");
        const holidayDays = processedData.filter(d => d.status === "holiday");
        console.log(`[DEBUG][Frontend] Calendar for ${month}:`);
        console.log(`  Present: ${presentDays.length} days`, presentDays.map(d => d.date));
        console.log(`  Absent: ${absentDays.length} days`, absentDays.map(d => d.date));
        console.log(`  Leave: ${leaveDays.length} days`, leaveDays.map(d => d.date));
        console.log(`  Holiday: ${holidayDays.length} days`, holidayDays.map(d => d.date));
      } catch (err) {
        console.error("Failed to fetch calendar:", err);
      }
    };
    fetchData();
  }, [currentDate, userId, token]);

  useEffect(() => {
    if (!selectedDate) return;
    const fetchDetailsData = async () => {
      try {
        const dateStr = format(selectedDate, "yyyy-MM-dd");
        const res = await fetchDateDetails(parseInt(userId) , dateStr, token);
        setDetails(res);
      } catch (err) {
        console.error("Failed to fetch date details:", err);
      }
    };
    fetchDetailsData();
  }, [selectedDate, userId, token]);

  const getStatusConfig = (status: CalendarDay["status"] | DateDetail["type"]) => {
    switch (status) {
      case "present":
        return { color: "bg-status-excellent", textColor: "text-status-excellent", icon: CheckCircle, label: "Present" };
      case "absent":
        return { color: "bg-status-critical", textColor: "text-status-critical", icon: XCircle, label: "Absent" };
      case "leave":
        return { color: "bg-status-warning", textColor: "text-status-warning", icon: Plane, label: "Leave" };
      case "holiday":
        return { color: "bg-muted", textColor: "text-muted-foreground", icon: Clock, label: "Holiday" };
      case "future":
        return { color: "bg-yellow-200", textColor: "text-yellow-800", icon: Clock, label: "Future" };
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
                <CalendarGrid
                  currentDate={currentDate}
                  records={records}
                  selectedDate={selectedDate}
                  onSelectDate={setSelectedDate}
                  getStatusConfig={getStatusConfig}
                />
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
