import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import {
  Clock,
  Users,
  Loader2,
  LogOut,
  LogIn,
} from "lucide-react";
import { CheckInOutModal } from "@/components/attendance/CheckInOutModal";
import { toast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { attendanceService } from "@/services/attendance.service";
import { useAuth } from "@/contexts/AuthContext";
import { AttendanceRateCard } from "@/components/dashboard/AttendanceRateCard";
import { ActiveTasksCard } from "@/components/dashboard/ActiveTasksCard";
import { TeamEventsCard } from "@/components/dashboard/TeamEventsCard";
import { QuickActionsCard } from "@/components/dashboard/QuickActionsCard";
import { WeeklySummaryCard } from "@/components/dashboard/WeeklySummaryCard";
import { AttendanceStatusCard } from "@/components/dashboard/AttendanceStatusCard";

interface TodayStatus {
  status: "checked_in" | "checked_out" | "not_checked_in" | "pending_approval";
  isCheckedIn: boolean;
  needsCheckIn: boolean;
  checkInTime: string | null;
  checkOutTime: string | null;
  hoursWorked: number;
  isRemote: boolean;
  remoteRequest: any;
  lastAction: any;
}

interface CheckInOutData {
  type: "checkin" | "checkout";
  timestamp?: string;
  isRemote?: boolean;
  location?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  notes?: string;
  photo?: string;
  reason?: string;
}


export default function Dashboard() {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  const [isCheckOutModalOpen, setIsCheckOutModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fetchTodayStatus = useCallback(async (): Promise<TodayStatus> => {
    try {
      const response = await attendanceService.getTodaysStatus();
      return {
        status:
          response.status === "checked_in"
            ? "checked_in"
            : response.status === "checked_out"
            ? "checked_out"
            : response.status === "pending_approval"
            ? "pending_approval"
            : "not_checked_in",
        isCheckedIn: response.status === "checked_in",
        needsCheckIn: response.status !== "checked_in",
        checkInTime: response.checkInTime || null,
        checkOutTime: response.checkOutTime || null,
        hoursWorked: response.hoursWorked || 0,
        isRemote: response.isRemote ?? false,
        remoteRequest: response.remoteRequest ?? null,
        lastAction: response.lastAction ?? null,
      };
    } catch {
      return {
        status: "not_checked_in",
        isCheckedIn: false,
        needsCheckIn: true,
        checkInTime: null,
        checkOutTime: null,
        hoursWorked: 0,
        isRemote: false,
        remoteRequest: null,
        lastAction: null,
      };
    }
  }, []);

  const {
    data: todayStatus,
    isLoading: isLoadingStatus,
    error: statusError,
  } = useQuery<TodayStatus>({
    queryKey: ["todayStatus"],
    queryFn: fetchTodayStatus,
    refetchInterval: 60000,
  });

  const handleCheckIn = async (data: CheckInOutData & { isRemote?: boolean }) => {
    setIsLoading(true);
    try {
      const currentStatus = await attendanceService.getTodaysStatus();
      if (currentStatus.status === "checked_in") {
        toast({
          title: "Already Checked In",
          description: "You have already checked in today.",
        });
        return;
      }
      const checkInData = {
        ...data,
        type: "checkin",
        timestamp: new Date().toISOString(),
        isRemote: !!data.isRemote,
        mode: data.isRemote ? "remote" : "office",
      };
      await attendanceService.checkIn(checkInData);
      await queryClient.invalidateQueries({ queryKey: ["todayStatus"] });
      toast({
        title: "Checked In",
        description: "You have checked in successfully.",
      });
      setIsCheckInModalOpen(false);
    } catch (error) {
      toast({
        title: "Check-in failed",
        description:
          error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckOut = async (data: CheckInOutData) => {
    setIsLoading(true);
    try {
      await attendanceService.checkOut({
        ...data,
        type: "checkout",
        timestamp: new Date().toISOString(),
      });
      await queryClient.invalidateQueries({ queryKey: ["todayStatus"] });
      toast({
        title: "Checked Out",
        description: "You have checked out successfully.",
      });
      setIsCheckOutModalOpen(false);
    } catch (error) {
      toast({
        title: "Check-out failed",
        description:
          error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading user data...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold">
              Welcome back, {currentUser?.name}!
            </h2>
            <p className="text-muted-foreground">
              {format(new Date(), "EEEE, MMMM do, yyyy")}
            </p>
          </div>
          {(currentUser?.role === "admin" ||
            currentUser?.role === "team_leader") && (
            <Button onClick={() => navigate("/register")}>
              <Users className="h-4 w-4 mr-2" /> Register User
            </Button>
          )}
        </div>

        {/* Main Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Attendance Status */}
          {isLoadingStatus ? (
            <div className="flex justify-center items-center h-40">
              <p className="text-gray-500">Loading attendance...</p>
            </div>
          ) : (
            <AttendanceStatusCard
              status={todayStatus?.status || "not_checked_in"}
              hoursWorked={todayStatus?.hoursWorked || 0}
              checkInTime={todayStatus?.checkInTime || null}
              checkOutTime={todayStatus?.checkOutTime || null}
            />
          )}

          {/* Quick Actions */}
          <QuickActionsCard
            status={todayStatus?.status || "not_checked_in"}
            isLoading={isLoading}
            onCheckIn={() => setIsCheckInModalOpen(true)}
            onCheckOut={() => setIsCheckOutModalOpen(true)}
          />

        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <WeeklySummaryCard 
            totalHours={0} 
            daysPresent={0} 
            daysAbsent={0} 
          />
          <ActiveTasksCard tasks={[]} />
          <TeamEventsCard events={[]} />
          <AttendanceRateCard rate={0} />
        </div>
      </div>

      {/* Modals */}
      <CheckInOutModal
        isOpen={isCheckInModalOpen}
        onClose={() => !isLoading && setIsCheckInModalOpen(false)}
        type="checkin"
        onSubmit={handleCheckIn}
        isLoading={isLoading}
        showRemoteOption
      />
      <CheckInOutModal
        isOpen={isCheckOutModalOpen}
        onClose={() => !isLoading && setIsCheckOutModalOpen(false)}
        type="checkout"
        onSubmit={(data) => handleCheckOut({ ...data, isRemote: !!todayStatus?.isRemote })}
        isLoading={isLoading}
      />
    </div>
  );
}
