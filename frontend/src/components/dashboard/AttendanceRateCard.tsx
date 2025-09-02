import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";

interface Props {
  rate: number;
}

export function AttendanceRateCard({ rate }: Props) {
  return (
    <Card className="shadow-medium hover:border-orange-500">
      <CardHeader>
        <CardTitle>Attendance Rate</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{rate}%</p>
        <p className="text-sm text-muted-foreground">This month</p>
      </CardContent>
    </Card>
  );
}
