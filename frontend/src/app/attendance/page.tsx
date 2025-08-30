'use client';

import { AttendanceCheckIn } from "@/components/attendance/AttendanceCheckIn";
import { Card } from "@/components/ui/card";

export default function AttendancePage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="max-w-2xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-8 text-center">Attendance Check-In</h1>
        <AttendanceCheckIn />
      </Card>
    </div>
  );
}
