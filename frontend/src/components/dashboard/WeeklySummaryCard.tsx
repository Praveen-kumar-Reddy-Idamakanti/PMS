import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";

interface Props {
  totalHours: number;
  daysPresent: number;
  daysAbsent: number;
}

export function WeeklySummaryCard({ totalHours, daysPresent, daysAbsent }: Props) {
  return (
    <Card className="shadow-medium hover:border-orange-500">
      <CardHeader>
        <CardTitle>Weekly Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm">Total Hours: <b>{totalHours}h</b></p>
        <p className="text-sm">Days Present: <b>{daysPresent}</b></p>
        <p className="text-sm">Days Absent: <b>{daysAbsent}</b></p>
      </CardContent>
    </Card>
  );
}
