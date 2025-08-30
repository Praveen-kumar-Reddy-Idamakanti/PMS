import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { activityService, Activity, ActivityUser, PaginatedResponse } from "../../../services/activity.service";
import { userService } from "../../../services/user.service";
import { LoadingGif } from "@/components/ui/LoadingGif";
import { formatDistanceToNow, format } from 'date-fns';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { User } from '@/types/user';

// Temporary date input component since date-picker is not available
const DateInput = ({
  value,
  onChange,
  placeholder,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
}) => (
  <Input
    type="date"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    className={`w-[150px] ${className}`}
  />
);

const ITEMS_PER_PAGE = 10;

const ActivityLog = () => {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    action: '',
    userId: '',
    startDate: '',
    endDate: '',
    search: '',
    sortBy: 'timestamp',
    sortOrder: 'desc' as const,
  });

  const { data: activitiesData, isLoading, error } = useQuery<PaginatedResponse<Activity>>({
    queryKey: ['activities', { ...filters, page }],
    queryFn: () => activityService.getActivities({
      ...filters,
      page,
      limit: ITEMS_PER_PAGE,
    }),
  });

  // Fetch all users once when the component mounts
  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ['allUsers'],
    queryFn: userService.getAllUsers,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Create a map of user IDs to user objects for quick lookup
  const userMap = users.reduce<Record<string, User>>((acc, user) => {
    if (user?.id) {
      acc[user.id.toString()] = user;
    }
    return acc;
  }, {});

  // Merge activity data with user details
  const activities = activitiesData?.data.map(activity => ({
    ...activity,
    user: activity.userId ? userMap[activity.userId.toString()] || null : null
  })) || [];

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1); // Reset to first page when filters change
  };

  if ((isLoading || isLoadingUsers || !activitiesData) && activities.length === 0) {
    return <LoadingGif text="Loading activities..." />;
  }

  if (error) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Failed to load activities. Please try again later.
      </div>
    );
  }

  const pagination = activitiesData?.pagination || { page: 1, limit: ITEMS_PER_PAGE, total: 0, totalPages: 1 };
  const totalItems = pagination.total || 0;
  const totalPages = pagination.totalPages || 1;


  const formatAction = (activity: Activity) => {
    switch (activity.activityType) {
      case 'USER_LOGIN':
        return 'User Login';
      case 'USER_LOGOUT':
        return 'User Logout';
      case 'USER_CHECKIN':
        return 'Check In';
      case 'USER_CHECKOUT':
        return 'Check Out';
      case 'USER_CREATE':
        return 'User Created';
      case 'USER_UPDATE':
        return 'User Updated';
      default:
        return activity.activityType.replace(/_/g, ' ');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search activities..."
            className="w-full pl-8"
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Select
            value={filters.action || 'all'}
            onValueChange={(value) => handleFilterChange('action', value === 'all' ? '' : value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="USER_LOGIN">Logins</SelectItem>
              <SelectItem value="USER_LOGOUT">Logouts</SelectItem>
              <SelectItem value="USER_CHECKIN">Check-ins</SelectItem>
              <SelectItem value="USER_CHECKOUT">Check-outs</SelectItem>
              <SelectItem value="USER_CREATE">User Creation</SelectItem>
              <SelectItem value="USER_UPDATE">User Updates</SelectItem>
            </SelectContent>
          </Select>
          <DateInput
            value={filters.startDate}
            onChange={(value) => handleFilterChange('startDate', value)}
            placeholder="Start date"
          />
          <DateInput
            value={filters.endDate}
            onChange={(value) => handleFilterChange('endDate', value)}
            placeholder="End date"
          />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>IP Address</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activities.map((activity) => (
              <TableRow key={activity.id}>
                <TableCell className="font-medium">
                  {activity.user ? (
                    <div className="flex flex-col">
                      <span>{activity.user.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {activity.user.email || 'No email'}
                      </span>
                    </div>
                  ) : (
                    <span>System</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300">
                    {activity.user?.role || (activity.user ? 'User' : 'System')}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                    {formatAction(activity)}
                  </span>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <div className="flex flex-col">
                    <span>{formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}</span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(activity.timestamp), 'MMM d, yyyy h:mm a')}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {activity.ipAddress || 'N/A'}
                </TableCell>
              </TableRow>
            ))}
            
            {activities.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  No activities found matching your filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        
        {pagination && pagination.total > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <div className="text-sm text-muted-foreground">
              Showing <span className="font-medium">{(page - 1) * ITEMS_PER_PAGE + 1}</span> to{' '}
              <span className="font-medium">
                {Math.min(page * ITEMS_PER_PAGE, totalItems)}
              </span>{' '}
              of <span className="font-medium">{totalItems}</span> activities
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p + 1)}
                disabled={page >= totalPages}
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export { ActivityLog };
