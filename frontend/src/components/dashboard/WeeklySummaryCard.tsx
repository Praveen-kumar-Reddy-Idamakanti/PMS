import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";

interface Props { totalHours: number; }

export function WeeklySummaryCard({ totalHours }: Props) {
  return (
    <Card className="shadow-medium bg-status-warning/10 border border-status-warning">
      <CardHeader>
        <CardTitle className="text-lg text-status-warning">Weekly Summary</CardTitle>
      </CardHeader>
      <CardContent className="text-center p-4">
        <div className="text-2xl font-bold text-foreground">{totalHours}h</div>
        <div className="text-sm text-muted-foreground mt-1">Total Hours</div>
      </CardContent>
    </Card>
  );
}
