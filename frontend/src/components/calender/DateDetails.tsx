import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, isFuture } from "date-fns";
import { DateDetail } from "@/services/calender.service";

interface DateDetailsProps {
  date: Date;
  details: DateDetail | null;
  getStatusConfig: (status: DateDetail["type"], dateStr?: string) => {
    color: string;
    textColor: string;
    icon: React.ElementType;
    label: string;
  } | null;
}

export default function DateDetails({ date, details, getStatusConfig }: DateDetailsProps) {
  if (!details) {
    return (
      <Card className="shadow-medium">
        <CardHeader>
          <CardTitle className="text-lg">{format(date, "EEEE, MMMM do")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  const isFutureDate = isFuture(date);
  const status = isFutureDate && details?.type === 'leave' ? 'leave' : details?.type;
  const config = getStatusConfig(status, format(date, 'yyyy-MM-dd'));
  const Icon = config?.icon!;

  return (
    <Card className="shadow-medium">
      <CardHeader>
        <CardTitle className="text-lg">{format(date, "EEEE, MMMM do")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center space-x-2 mb-4">
          <Icon className={`w-5 h-5 ${config?.textColor}`} />
          <Badge variant="outline" className={`${config?.textColor} border-current`}>
            {config?.label}
          </Badge>
        </div>

        {details.type === "present" && (
          <div className="space-y-2 text-center">
            <div className="text-lg font-bold text-foreground">{details.total_hours}h</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-muted/20 rounded">
                <div className="text-sm font-medium">{details.checkin}</div>
                <div className="text-xs text-muted-foreground">Check In</div>
              </div>
              <div className="p-2 bg-muted/20 rounded">
                <div className="text-sm font-medium">{details.checkout}</div>
                <div className="text-xs text-muted-foreground">Check Out</div>
              </div>
            </div>
          </div>
        )}

        {details.type === "leave" && (
          <div className="text-center text-sm">
            <div className="font-medium mb-1">Leave Details</div>
            <div className="bg-yellow-50 p-3 rounded-md">
              <p className="text-yellow-800">{details.reason || "No reason provided"}</p>
              {isFutureDate && (
                <p className="text-yellow-600 text-xs mt-1">
                  This is a scheduled leave
                </p>
              )}
            </div>
          </div>
        )}

        {details.type === "holiday" && (
          <div className="text-center text-sm text-muted-foreground">
            Holiday: {details.name || "Holiday"}
          </div>
        )}
        
        {!details.type && isFutureDate && (
          <div className="text-center py-4">
            <div className="text-yellow-600 font-medium">Future Date</div>
            <p className="text-sm text-muted-foreground mt-1">
              This is a future date. No attendance recorded yet.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
