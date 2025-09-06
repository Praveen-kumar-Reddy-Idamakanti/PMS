import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";

interface Props {
  rate: number;
}

export function AttendanceRateCard({ rate }: Props) {
  return (
    <Card className="shadow-medium bg-sky-200/20 border border-sky-300">
      <CardHeader>
        <CardTitle className="text-lg text-sky-600">Attendance Rate</CardTitle>
      </CardHeader>
      <CardContent className="text-center">
        <p className="text-2xl font-bold text-sky-700">{rate}%</p>
        <p className="text-sm text-sky-600">This month</p>
      </CardContent>
    </Card>
  );
}
