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
import { cn } from "@/lib/utils";

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
  
const statusColors = {
  present: { 
    bg: 'bg-[hsl(108,43%,55%)]', 
    text: 'text-[hsl(108,43%,55%)]' 
  },
  absent: { 
    bg: 'bg-[hsl(348,83%,58%)]', 
    text: 'text-[hsl(348,83%,58%)]' 
  },
  leave: { 
    bg: 'bg-[hsl(43,96%,58%)]', 
    text: 'text-[hsl(43,96%,58%)]' 
  },
  holiday: { 
    bg: 'bg-[hsl(177,47%,55%)]', 
    text: 'text-[hsl(177,47%,55%)]' 
  },
  task_due: { 
    bg: 'bg-[hsl(20,85%,60%)]', 
    text: 'text-white' 
  },
  future: { 
    bg: 'bg-gray-200', 
    text: 'text-gray-500' 
  }
} as const;

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

  const getEventsForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const dateRecords = records.filter((r) => r.date === dateStr);
    
    // Track seen task IDs and titles to prevent duplicates
    const seenTasks = new Set<string | number>();
    
    return dateRecords.filter(record => {
      // Keep all non-task records
      if (record.status !== 'task_due') return true;
      
      // Generate a unique key for each task
      const taskKey = record.task_id || record.task_title;
      
      // Skip if we've seen this task before
      if (taskKey && seenTasks.has(taskKey)) {
        return false;
      }
      
      // Mark this task as seen
      if (taskKey) {
        seenTasks.add(taskKey);
      }
      
      return true;
    });
  };

  const getEventBadge = (event: CalendarDay, index: number) => {
    const config = getStatusConfig(event.status);
    if (!config) return null;
    
    const { label, icon: Icon } = config;
    const colors = statusColors[event.status as keyof typeof statusColors] || 
                  { bg: 'border-gray-300', text: 'text-gray-800' };
    
    // For task events, show the task title with a colored border
    if (event.status === 'task_due') {
      return (
        <div 
          key={index}
          className={cn(
            "text-xs px-1.5 py-0.5 rounded-md truncate w-full text-center",
            "border border-[hsl(20,85%,60%)] text-[hsl(20,85%,60%)] bg-[hsl(20,85%,10%)]/5",
            "hover:bg-[hsl(20,85%,10%)]/10 transition-colors"
          )}
          title={event.task_title || 'Task due'}
        >
          {event.task_title || 'Task'}
        </div>
      );
    }
    
    // For other statuses, show a small colored dot
    return (
      <div 
        key={index}
        className={cn(
          "w-1.5 h-1.5 rounded-full mx-auto",
          colors.bg,
          "transition-all hover:scale-125"
        )}
        title={label}
      />
    );
  };

  const dayHeaders = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  
  return (
    <div className="grid grid-cols-7 gap-1 mb-4">
      {/* Day headers */}
      {dayHeaders.map((day, index) => (
        <div
          key={`${day}-${index}`}
          className="text-center text-xs font-medium text-muted-foreground py-2"
          title={day}
        >
          {day[0]}
        </div>
      ))}

      {/* Empty cells */}
      {leadingEmptyCells.map((_, idx) => (
        <div key={`empty-${idx}`} />
      ))}

      {/* Days */}
      {days.map((day, idx) => {
        const dateStr = format(day, "yyyy-MM-dd");
        const dayEvents = getEventsForDate(day);
        const isSelected = isSameDay(day, selectedDate);
        const isToday = isSameDay(day, new Date());

        return (
          <div
            key={dateStr}
            className={cn(
              "relative min-h-20 p-1 rounded-md transition-colors flex flex-col items-center",
              isSelected
                ? "bg-[hsl(20,85%,60%)]/10 ring-1 ring-[hsl(20,85%,60%)]"
                : "hover:bg-accent/5"
            )}
            onClick={() => onSelectDate(day)}
          >
            <div className="flex-1 flex flex-col items-center justify-center w-full">
              <div
                className={cn(
                  "w-6 h-6 flex items-center justify-center text-sm rounded-full mb-1",
                  isToday 
                    ? "bg-[hsl(20,85%,60%)] text-white" 
                    : isSelected 
                      ? "text-[hsl(20,85%,60%)] font-medium"
                      : "text-foreground"
                )}
              >
                {format(day, "d")}
              </div>
              
              {/* Event indicators */}
              <div className="w-full mt-1 space-y-1">
                {dayEvents.slice(0, 2).map((event, eventIdx) => (
                  <div key={`${dateStr}-${eventIdx}`} className="w-full">
                    {getEventBadge(event, eventIdx)}
                  </div>
                ))}
                {dayEvents.length > 2 && (
                  <div className="text-xs text-muted-foreground text-center">
                    +{dayEvents.length - 2} more
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}