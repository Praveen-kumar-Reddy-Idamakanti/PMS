import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { activityService, Activity } from "../../../services/activity.service";
import { LoadingGif } from "@/components/ui/LoadingGif";
import { formatDistanceToNow } from 'date-fns';

export const ActivityLog = () => {
  const { data: activities = [], isLoading, error } = useQuery<Activity[]>({
    queryKey: ['activities'],
    queryFn: () => activityService.getActivities(),
    retry: 1, // Only retry once
  });

  if (isLoading) return <LoadingGif text="Loading activities..." />;

  if (error) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Activity logging is not available at the moment.
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Details</TableHead>
            <TableHead>Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {activities?.map((activity) => (
            <TableRow key={activity.id}>
              <TableCell className="font-medium">
                {activity.user?.name || 'System'}
              </TableCell>
              <TableCell>
                <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                  {activity.action}
                </span>
              </TableCell>
              <TableCell className="max-w-xs">
                {activity.details ? (
                  <pre className="text-sm whitespace-pre-wrap">
                    {JSON.stringify(activity.details, null, 2)}
                  </pre>
                ) : (
                  '-'
                )}
              </TableCell>
              <TableCell>
                {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
