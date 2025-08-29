import { AttendanceManagement } from "./components/AttendanceManagement";

export const AttendancePage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Attendance Overview</h2>
        <p className="text-sm text-muted-foreground">
          View and manage team attendance records
        </p>
      </div>
      
      <div className="space-y-4">
        <AttendanceManagement />
      </div>
    </div>
  );
};

export default AttendancePage;
