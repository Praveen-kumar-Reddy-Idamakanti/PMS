import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar, ClipboardList, CheckCircle, LogIn, LogOut, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Props {
  status: "checked_in" | "checked_out" | "not_checked_in" | "pending_approval";
  isLoading: boolean;
  onCheckIn: () => void;
  onCheckOut: () => void;
}

export function QuickActionsCard({ status, isLoading, onCheckIn, onCheckOut }: Props) {
  const navigate = useNavigate();

  return (
    <Card className="shadow-medium hover:border-orange-500 h-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Clock className="w-5 h-5 text-primary" />
          <span>Quick Actions</span>
        </CardTitle>
        <CardDescription>Manage your attendance</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Status */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Status:</span>
          <Badge variant={status === "checked_out" ? "secondary" : "default"}>
            {status === "checked_in"
              ? "Checked In"
              : status === "checked_out"
              ? "Checked Out"
              : status === "pending_approval"
              ? "Pending Approval"
              : "Not Checked In"}
          </Badge>
        </div>

        {/* Action Buttons */}
        {status === "checked_out" ? (
          <Button 
            disabled 
            className="w-full cursor-not-allowed opacity-70"
            variant="outline"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Check Out (Completed for today)
          </Button>
        ) : status === "checked_in" ? (
          <Button onClick={onCheckOut} disabled={isLoading} className="w-full" variant="outline">
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="mr-2 h-4 w-4" />
            )}
            Check Out
          </Button>
        ) : status === "pending_approval" ? (
          <Button disabled className="w-full cursor-not-allowed opacity-70" variant="outline">
            <Clock className="mr-2 h-4 w-4" />
            Remote Request Pending
          </Button>
        ) : (
          <Button onClick={onCheckIn} disabled={isLoading} className="w-full">
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <LogIn className="mr-2 h-4 w-4" />
            )}
            Check In
          </Button>
        )}

        {/* Navigation Buttons */}
        <Button
          variant="outline"
          className="w-full border-cyan-500"
          onClick={() => navigate("/calendar")}
        >
          <Calendar className="w-4 h-4 mr-2" /> View Calendar
        </Button>

        <Button
          variant="outline"
          className="w-full border-cyan-500"
          onClick={() => navigate("/tasks")}
        >
          <ClipboardList className="w-4 h-4 mr-2" /> My Tasks
        </Button>
      </CardContent>
    </Card>
  );
}
