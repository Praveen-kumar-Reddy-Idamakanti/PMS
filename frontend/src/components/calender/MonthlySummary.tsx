import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MonthlySummaryProps {
  present: number;
  absent: number;
  leave: number;
  totalWorkDays: number;
}

export default function MonthlySummary({ present, absent, leave, totalWorkDays }: MonthlySummaryProps) {
  const rate = totalWorkDays > 0 ? Math.round((present / totalWorkDays) * 100) : 0;

  return (
    <Card className="shadow-medium">
      <CardHeader>
        <CardTitle className="text-lg">Monthly Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center p-4 bg-muted/20 rounded-lg">
          <div
            className={`text-2xl font-bold ${
              rate >= 90 ? "text-status-excellent" : rate >= 80 ? "text-status-warning" : "text-status-critical"
            }`}
          >
            {rate}%
          </div>
          <div className="text-sm text-muted-foreground">Attendance Rate</div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-3 bg-status-excellent/10 rounded-lg">
            <div className="text-lg font-bold text-status-excellent">{present}</div>
            <div className="text-xs text-muted-foreground">Present</div>
          </div>
          <div className="text-center p-3 bg-status-critical/10 rounded-lg">
            <div className="text-lg font-bold text-status-critical">{absent}</div>
            <div className="text-xs text-muted-foreground">Absent</div>
          </div>
          <div className="text-center p-3 bg-status-warning/10 rounded-lg">
            <div className="text-lg font-bold text-status-warning">{leave}</div>
            <div className="text-xs text-muted-foreground">Leave</div>
          </div>
          <div className="text-center p-3 bg-muted/10 rounded-lg">
            <div className="text-lg font-bold text-muted-foreground">{totalWorkDays}</div>
            <div className="text-xs text-muted-foreground">Work Days</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
