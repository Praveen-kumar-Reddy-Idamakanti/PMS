import {
    format,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    getDay,
    isSameMonth,
    isSameDay,
    isToday,
  } from "date-fns";
  import { CalendarDay } from "@/services/calender.service";
  
  interface CalendarGridProps {
    currentDate: Date;
    records: CalendarDay[];
    selectedDate: Date | null;
    onSelectDate: (date: Date) => void;
    getStatusConfig: (status: CalendarDay["status"]) => {
      color: string;
      textColor: string;
      icon: React.ElementType;
      label: string;
    } | null;
  }
  
  export default function CalendarGrid({
    currentDate,
    records,
    selectedDate,
    onSelectDate,
    getStatusConfig,
  }: CalendarGridProps) {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
    const leadingEmptyCells = Array(getDay(monthStart)).fill(null);
  
    const getAttendanceForDate = (date: Date) =>
      records.find((r) => r.date === format(date, "yyyy-MM-dd"));
  
    return (
      <div className="grid grid-cols-7 gap-2 mb-4">
        {/* Day headers */}
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div
            key={day}
            className="text-center text-sm font-medium text-muted-foreground p-2"
          >
            {day}
          </div>
        ))}
  
        {/* Empty cells */}
        {leadingEmptyCells.map((_, idx) => (
          <div key={`empty-${idx}`} />
        ))}
  
        {/* Days */}
        {days.map((day, idx) => {
          const attendance = getAttendanceForDate(day);
          const config = attendance ? getStatusConfig(attendance.status) : null;
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const isTodayDate = isToday(day);
          const isFuture = day > new Date();
  
          return (
            <button
              key={idx}
              onClick={() => onSelectDate(day)}
              className={`
                relative p-3 text-center rounded-lg border-2 transition-all
                ${isSameMonth(day, currentDate) ? "text-foreground" : "text-muted-foreground opacity-50"}
                ${isSelected ? "border-primary shadow-medium" : "border-transparent"}
                ${isTodayDate ? "ring-2 ring-primary ring-offset-2" : ""}
                hover:border-border
              `}
            >
              <div className="text-sm font-medium mb-1">{format(day, "d")}</div>
              {config && (!isFuture || attendance?.status === 'leave') && (
                <div 
                  className={`w-2 h-2 rounded-full mx-auto ${
                    isFuture && attendance?.status === 'leave' ? 'bg-yellow-400' : config.color
                  }`} 
                />
              )}
            </button>
          );
        })}
      </div>
    );
  }
  