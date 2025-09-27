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

    const seenTasks = new Set<string | number>();

    return dateRecords.filter(record => {
      if (record.status !== 'task_due') return true;

      const taskKey = record.task_id || record.task_title;
      if (taskKey && seenTasks.has(taskKey)) {
        return false;
      }
      if (taskKey) {
        seenTasks.add(taskKey);
      }
      return true;
    });
  };

  const getEventDot = (event: CalendarDay, index: number) => {
    const config = getStatusConfig(event.status);
    if (!config) return null;
    const statusKey = event.status;
    const colors = statusColors[statusKey as keyof typeof statusColors] || 
                  { bg: 'bg-gray-300', text: 'text-gray-800' };

    return (
      <div
        key={index}
        className={cn(
          "w-2 h-2 rounded-full mx-auto",
          colors.bg,
          "transition-all hover:scale-125"
        )}
        title={config.label}
      />
    );
  };

  const dayHeaders = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="grid grid-cols-7 gap-1">
      {/* Day headers */}
      {dayHeaders.map((day) => (
        <div key={day} className="text-center text-sm font-medium py-2 text-gray-500">
          {day}
        </div>
      ))}

      {/* Empty cells */}
      {leadingEmptyCells.map((_, index) => (
        <div key={`empty-${index}`} className="h-24 " />
      ))}

      {/* Day cells */}
      {days.map((day) => {
        const dayEvents = getEventsForDate(day);
        const isSelected = selectedDate && isSameDay(day, selectedDate);
        const isToday = isSameDay(day, new Date());
        const isCurrentMonth = isSameMonth(day, currentDate);
        const isSunday = getDay(day) === 0;
        const isHoliday = dayEvents.some(e => e.status === 'holiday');
        const hasTask = dayEvents.some(e => e.status === 'task_due');

        let dayStatus: string | null = null;
        if (dayEvents.length > 0) {
          if (dayEvents.some(e => e.status === 'present')) dayStatus = 'present';
          else if (dayEvents.some(e => e.status === 'absent')) dayStatus = 'absent';
          else if (dayEvents.some(e => e.status === 'leave')) dayStatus = 'leave';
          else if (dayEvents.some(e => e.status === 'task_due')) dayStatus = 'task_due';
          else if (dayEvents.some(e => e.status === 'holiday')) dayStatus = 'holiday';
        }

        const statusKey = dayStatus || 'future';
        const colors = statusColors[statusKey as keyof typeof statusColors] || 
                      { bg: 'bg-gray-800', text: 'text-gray-400' };

        return (
          <button
            key={day.toString()}
            onClick={() => onSelectDate(day)}
            className={cn(
              'h-24 p-1.5 text-left text-sm transition-colors flex flex-col items-center justify-center',
              ' hover:bg-gray-800/5',
              isSelected && 'ring-1 ring-blue-500',
              !isCurrentMonth && 'text-gray-600',
              isToday && 'font-bold '
            )}
          >
            {/* Date centered */}
            <span className={cn(
              'inline-flex items-center justify-center rounded-full h-6 w-6',
              isSelected ? 'bg-blue-600 text-white' : colors.text,
              isToday && !isSelected && 'border border-blue-500'
            )}>
              {format(day, 'd')}
            </span>

            {/* Event dots below the date */}
            <div className="mt-1 space-y-1">
              {dayEvents.slice(0, 3).map((event, idx) => getEventDot(event, idx))}
              {dayEvents.length > 3 && (
                <div className="text-xs text-muted-foreground text-center">+{dayEvents.length - 3}</div>
              )}
            </div>

            {/* Task labels if task_due exists */}
            {hasTask && (() => {
              const taskEvents = dayEvents.filter(event => event.status === 'task_due');
              const taskCount = taskEvents.length;
              
              if (taskCount === 1) {
                // Single task - show full name
                return (
                  <div className="mt-1 text-[10px] text-white bg-[hsl(20,85%,60%)] px-1.5 py-0.5 rounded-full truncate max-w-[80px]">
                    {taskEvents[0]?.task_title || 'Task'}
                  </div>
                );
              } else if (taskCount === 2) {
                // Two tasks - show both names
                return (
                  <div className="mt-1 space-y-0.5">
                    <div className="text-[10px] text-white bg-[hsl(20,85%,60%)] px-1.5 py-0.5 rounded-full truncate max-w-[80px]">
                      {taskEvents[0]?.task_title || 'Task 1'}
                    </div>
                    <div className="text-[10px] text-white bg-[hsl(20,85%,60%)] px-1.5 py-0.5 rounded-full truncate max-w-[80px]">
                      {taskEvents[1]?.task_title || 'Task 2'}
                    </div>
                  </div>
                );
              } else {
                // Multiple tasks - show first task + count
                return (
                  <div className="mt-1 space-y-0.5">
                    <div className="text-[10px] text-white bg-[hsl(20,85%,60%)] px-1.5 py-0.5 rounded-full truncate max-w-[80px]">
                      {taskEvents[0]?.task_title || 'Task'}
                    </div>
                    <div className="text-[9px] text-white bg-[hsl(20,85%,50%)] px-1 py-0.5 rounded-full text-center">
                      +{taskCount - 1} more
                    </div>
                  </div>
                );
              }
            })()}
          </button>
        );
      })}
    </div>
  );
}
