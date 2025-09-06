import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

interface CalendarHeaderProps {
  currentDate: Date;
  onNavigate: (direction: "prev" | "next") => void;
}

export default function CalendarHeader({ currentDate, onNavigate }: CalendarHeaderProps) {
  return (
    <div className="flex items-center space-x-2">
      <Button variant="outline" size="icon" onClick={() => onNavigate("prev")}>
        <ChevronLeft className="w-4 h-4" />
      </Button>
      <div className="text-lg font-semibold text-foreground min-w-[200px] text-center">
        {format(currentDate, "MMMM yyyy")}
      </div>
      <Button variant="outline" size="icon" onClick={() => onNavigate("next")}>
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}
