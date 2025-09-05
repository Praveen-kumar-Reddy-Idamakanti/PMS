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
    refetch: refetchTodayStatus,
  } = useQuery<TodayStatus>({
    queryKey: ["todayStatus"],
    queryFn: fetchTodayStatus,
    refetchInterval: 60000,
  });

  const handleCheckIn = async (data: CheckInOutData & { isRemote?: boolean }) => {
    setIsLoading(true);
    try {
      const currentStatus = await attendanceService.getTodaysStatus();
      
      // Only prevent check-in if there's an actual check-in time and no checkout time
      if (currentStatus.checkInTime && !currentStatus.checkOutTime) {
        if (currentStatus.status === "checked_in") {
          toast({
            title: "Already Checked In",
            description: "You have already checked in today.",
          });
          return;
        }
      }
      
      // Only prevent check-in if there's an actual check-out time
      if (currentStatus.checkOutTime) {
        toast({
          title: "Already Checked Out",
          description: "You have already checked out for today.",
          variant: "destructive",
        });
        return;
      }
      const checkInData = {
        ...data,
        isRemote: !!data.isRemote,
      };
      const res: any = await attendanceService.checkIn(checkInData);
      const checkInTime = res?.data?.timestamp || res?.timestamp || new Date().toISOString();
      const nextStatus = res?.status === 'pending_approval' ? 'pending_approval' : 'checked_in';
      // Optimistically update cache so UI reflects immediately
      queryClient.setQueryData(["todayStatus"], (prev: any) => ({
        ...(prev || {}),
        status: nextStatus,
        isCheckedIn: nextStatus === 'checked_in',
        needsCheckIn: nextStatus !== 'checked_in',
        checkInTime,
        // preserve checkout time if any
        checkOutTime: prev?.checkOutTime || null,
        isRemote: !!res?.isRemote || !!prev?.isRemote,
      }));
      await queryClient.invalidateQueries({ queryKey: ["todayStatus"] });
      toast({
        title: "Checked In",
        description: "You have checked in successfully.",
      });
      setIsCheckInModalOpen(false);
    } catch (error) {
      const msg = (error as any)?.response?.message || (error instanceof Error ? error.message : '');
      if (msg && msg.toLowerCase().includes('already checked in')) {
        // Sync UI and show friendly toast
        await queryClient.invalidateQueries({ queryKey: ["todayStatus"] });
        toast({ title: "Already Checked In", description: "You have already checked in today." });
        setIsCheckInModalOpen(false);
      } else if (msg && msg.toLowerCase().includes('already checked out')) {
        await queryClient.invalidateQueries({ queryKey: ["todayStatus"] });
        toast({ title: "Already Checked Out", description: "You have already checked out today." });
        setIsCheckInModalOpen(false);
      } else {
        toast({
          title: "Check-in failed",
          description: error instanceof Error ? error.message : "Something went wrong",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckOut = async (data: CheckInOutData) => {
    setIsLoading(true);
    try {
      const currentStatus = await attendanceService.getTodaysStatus();
      if (currentStatus.status === "checked_out") {
        toast({
          title: "Already Checked Out",
          description: "You have already checked out today.",
        });
        return;
      }
      if (currentStatus.status !== "checked_in") {
        toast({
          title: "Not Checked In",
          description: "You need to be checked in before checking out.",
          variant: "destructive",
        });
        return;
      }
      const res: any = await attendanceService.checkOut({
        ...data,
      });
      const checkOutTime = res?.data?.timestamp || res?.timestamp || new Date().toISOString();
      // Force update the status to checked_out
      const updatedStatus: TodayStatus = {
        status: "checked_out",
        isCheckedIn: false,
        needsCheckIn: false,
        checkInTime: currentStatus.checkInTime || null,
        checkOutTime,
        hoursWorked: currentStatus.hoursWorked || 0,
        isRemote: 'isRemote' in currentStatus ? currentStatus.isRemote : !!res?.isRemote,
        remoteRequest: null,
        lastAction: 'checkout'
      };
      
      // Update the cache with the new status
      queryClient.setQueryData(["todayStatus"], updatedStatus);
      
      // Invalidate and refetch to ensure we have the latest status
      try {
        await refetchTodayStatus();
      } catch (error) {
        console.error('Error refetching status:', error);
      }
      
      toast({
        title: "Checked Out",
        description: "You have checked out successfully.",
      });
      setIsCheckOutModalOpen(false);
    } catch (error) {
      const msg = (error as any)?.response?.message || (error instanceof Error ? error.message : '');
      if (msg && msg.toLowerCase().includes('already checked out')) {
        await queryClient.invalidateQueries({ queryKey: ["todayStatus"] });
        toast({ title: "Already Checked Out", description: "You have already checked out today." });
        setIsCheckOutModalOpen(false);
      } else if (msg && msg.toLowerCase().includes('not checked in')) {
        await queryClient.invalidateQueries({ queryKey: ["todayStatus"] });
        toast({ title: "Not Checked In", description: "You need to be checked in before checking out.", variant: "destructive" });
      } else {
        toast({
          title: "Check-out failed",
          description: error instanceof Error ? error.message : "Something went wrong",
          variant: "destructive",
        });
      }
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
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 mb-8 items-stretch">
  {/* left side ==> Attendance Status */}
  <div className="lg:col-span-7 h-full">
    {isLoadingStatus ? (
      <div className="flex justify-center items-center h-40 h-full w-full">
        <p className="text-gray-500">Loading attendance...</p>
      </div>
    ) : (
      <AttendanceStatusCard
        status={
          todayStatus?.checkOutTime || todayStatus?.status === 'checked_out'
            ? 'checked_out' 
            : todayStatus?.status || 'not_checked_in'
        }
        hoursWorked={todayStatus?.hoursWorked || 0}
        checkInTime={todayStatus?.checkInTime || null}
        checkOutTime={todayStatus?.checkOutTime || null}
        className="h-full"
      />
    )}
  </div>

  {/* right side ==> Quick Actions */}
  <div className="lg:col-span-3 h-full">
    <QuickActionsCard
      status={
        // Only show checked_out if there's an actual checkout time
        todayStatus?.status === 'checked_out' || todayStatus?.checkOutTime
          ? "checked_out"
          : todayStatus?.status || "not_checked_in"
      }
      isLoading={isLoading}
      onCheckIn={() => {
        if (todayStatus?.checkOutTime || todayStatus?.status === 'checked_out') {
          toast({
            title: "Already Checked Out",
            description: "You have already checked out for today.",
          });
          return;
        }
        setIsCheckInModalOpen(true);
      }}
      onCheckOut={() => {
        // Open the checkout modal which will handle the actual checkout with data
        setIsCheckOutModalOpen(true);
      }}
    />
  </div>
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
        onSubmit={handleCheckOut}
        isLoading={isLoading}
        isRemoteCheckoutMode={!!todayStatus?.isRemote}
      />
    </div>
  );
}
