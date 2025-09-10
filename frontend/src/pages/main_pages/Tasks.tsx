import taskService, { Task } from "../../services/task.service";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowLeft,
  CheckCircle,
  Clock,
  AlertCircle,
  User,
  Calendar,
  Filter,
  Plus,
  MoreHorizontal
} from "lucide-react";
import { format, addDays, isAfter, isBefore } from "date-fns";

type FilterStatus = 'all' | 'todo' | 'in-progress' | 'review' | 'completed';

import CreateTaskDialog from "@/components/tasks/CreateTaskDialog";

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateTaskDialogOpen, setIsCreateTaskDialogOpen] = useState(false);
  const navigate = useNavigate();

  const handleTaskCreated = (newTask: Task) => {
    setTasks((prevTasks) => [newTask, ...prevTasks]);
  };

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      navigate('/login');
      return;
    }
    setUser(JSON.parse(userData));

    const fetchTasks = async () => {
      try {
        setLoading(true);
        const fetchedTasks = await taskService.getAllTasks();
        setTasks(fetchedTasks);
      } catch (err) {
        console.error("Failed to fetch tasks:", err);
        setError("Failed to load tasks. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [navigate]);

  const getStatusConfig = (status: Task['status']) => {
    switch (status) {
      case 'todo':
        return {
          color: 'bg-muted',
          textColor: 'text-muted-foreground',
          borderColor: 'border-muted',
          icon: Clock,
          label: 'To Do',
        };
      case 'in-progress':
        return {
          color: 'bg-status-info',
          textColor: 'text-status-info',
          borderColor: 'border-status-info',
          icon: Clock,
          label: 'In Progress',
        };
      case 'review':
        return {
          color: 'bg-status-warning',
          textColor: 'text-status-warning',
          borderColor: 'border-status-warning',
          icon: AlertCircle,
          label: 'Review',
        };
      case 'completed':
        return {
          color: 'bg-status-excellent',
          textColor: 'text-status-excellent',
          borderColor: 'border-status-excellent',
          icon: CheckCircle,
          label: 'Completed',
        };
      default: // Fallback for any unhandled status, though TypeScript should prevent this if Task['status'] is exhaustive
        return {
          color: 'bg-muted',
          textColor: 'text-muted-foreground',
          borderColor: 'border-muted',
          icon: Clock,
          label: 'Unknown',
        };
    }
  };

  const getPriorityConfig = (priority: Task['priority']) => {
    switch (priority) {
      case 'low':
        return { color: 'text-muted-foreground', bg: 'bg-muted/20' };
      case 'medium':
        return { color: 'text-status-info', bg: 'bg-status-info/20' };
      case 'high':
        return { color: 'text-status-warning', bg: 'bg-status-warning/20' };
    }
  };

  const isOverdue = (dueDate: string) => {
    return isBefore(new Date(dueDate), new Date()) && filterStatus !== 'completed';
  };

  const isDueSoon = (dueDate: string) => {
    const due = new Date(dueDate);
    const tomorrow = addDays(new Date(), 1);
    return isBefore(due, tomorrow) && isAfter(due, new Date());
  };

  const filteredTasks = tasks.filter(task => {
    if (filterStatus === 'all') return true;
    return task.status === filterStatus;
  });

  const taskStats = {
    total: tasks.length,
    todo: tasks.filter(t => t.status === 'todo').length,
    review: tasks.filter(t => t.status === 'review').length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    overdue: tasks.filter(t => isOverdue(t.dueDate)).length,
  };

  const completionRate = taskStats.total > 0 
    ? Math.round((taskStats.completed / taskStats.total) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card shadow-soft">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/dashboard')}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-xl font-bold text-foreground">My Tasks</h1>
            <Badge variant="outline">{taskStats.total} Total</Badge>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
            <Button variant="default" size="sm" onClick={() => setIsCreateTaskDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Task
            </Button>
          </div>
        </div>
      </header>

      <CreateTaskDialog
        isOpen={isCreateTaskDialogOpen}
        onClose={() => setIsCreateTaskDialogOpen(false)}
        onTaskCreated={handleTaskCreated}
      />

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Tasks List */}
          <div className="lg:col-span-3 space-y-6">
            {/* Filter Tabs */}
            <div className="flex space-x-1 p-1 bg-muted rounded-lg w-fit">
              {([
                { key: 'all', label: 'All', count: taskStats.total },
                { key: 'todo', label: 'To Do', count: taskStats.todo },
                { key: 'review', label: 'Review', count: taskStats.review },
                { key: 'in-progress', label: 'In Progress', count: taskStats.inProgress },
                { key: 'in-progress', label: 'In Progress', count: taskStats.inProgress },
                { key: 'review', label: 'Review', count: taskStats.review },
                { key: 'completed', label: 'Completed', count: taskStats.completed },
              ] as const).map(({ key, label, count }) => (
                <Button
                  key={key}
                  variant={filterStatus === key ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setFilterStatus(key)}
                  className="relative"
                >
                  {label}
                  {count > 0 && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {count}
                    </Badge>
                  )}
                </Button>
              ))}
            </div>

            {/* Tasks */}
            <div className="space-y-4">
              {filteredTasks.length === 0 ? (
                <Card className="shadow-soft">
                  <CardContent className="py-12 text-center">
                    <CheckCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      No tasks found
                    </h3>
                    <p className="text-muted-foreground">
                      {filterStatus === 'all' 
                        ? "You don't have any tasks assigned yet." 
                        : `No tasks with status "${filterStatus}".`
                      }
                    </p>
                  </CardContent>
                </Card>
              ) : (
                filteredTasks.map((task) => {
                  const statusConfig = getStatusConfig(task.status);
                  const priorityConfig = getPriorityConfig(task.priority);
                  const StatusIcon = statusConfig.icon;
                  const overdue = isOverdue(task.dueDate);
                  const dueSoon = isDueSoon(task.dueDate);

                  return (
                    <Card 
                      key={task.id} 
                      className={`shadow-medium hover:shadow-strong transition-all duration-200 cursor-pointer ${
                        overdue ? 'border-l-4 border-l-status-critical' : 
                        dueSoon ? 'border-l-4 border-l-status-warning' : ''
                      }`}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-lg font-semibold text-foreground">
                                {task.title}
                              </h3>
                              <Badge 
                                variant="outline" 
                                className={`${statusConfig.textColor} ${statusConfig.borderColor}`}
                              >
                                <StatusIcon className="w-3 h-3 mr-1" />
                                {statusConfig.label}
                              </Badge>
                              <Badge 
                                variant="outline"
                                className={`${priorityConfig.color} border-current`}
                              >
                                {task.priority.toUpperCase()}
                              </Badge>
                            </div>
                            <p className="text-muted-foreground text-sm">
                              {task.description}
                            </p>
                          </div>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="space-y-4">
                        {/* Progress */}
                      {/* Removed task.progress as it's not in the service Task interface */}

                        {/* Meta Information */}
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          {/* Removed assignedBy as it's not in the service Task interface */}
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-4 h-4" />
                            <span className={overdue ? 'text-status-critical font-medium' : dueSoon ? 'text-status-warning font-medium' : ''}>
                              {task.dueDate ? `Due ${format(new Date(task.dueDate), 'MMM dd, yyyy')}` : 'No Due Date'}
                              {overdue && ' (Overdue)'}
                              {dueSoon && ' (Due Soon)'}
                            </span>
                          </div>
                        </div>

                        {/* Tags */}
                        {task.tags && task.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {task.tags.map((tag, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {tag.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Task Statistics */}
            <Card className="shadow-medium">
              <CardHeader>
                <CardTitle className="text-lg">Task Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center p-4 bg-muted/20 rounded-lg">
                  <div className={`text-2xl font-bold ${
                    completionRate >= 80 ? 'text-status-excellent' : 
                    completionRate >= 60 ? 'text-status-warning' : 
                    'text-status-critical'
                  }`}>
                    {completionRate}%
                  </div>
                  <div className="text-sm text-muted-foreground">Completion Rate</div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-status-info/10 rounded-lg">
                    <div className="text-lg font-bold text-status-info">{taskStats.inProgress}</div>
                    <div className="text-xs text-muted-foreground">In Progress</div>
                  </div>
                  <div className="text-center p-3 bg-status-warning/10 rounded-lg">
                    <div className="text-lg font-bold text-status-warning">{taskStats.pending}</div>
                    <div className="text-xs text-muted-foreground">Pending</div>
                  </div>
                  <div className="text-center p-3 bg-status-excellent/10 rounded-lg">
                    <div className="text-lg font-bold text-status-excellent">{taskStats.completed}</div>
                    <div className="text-xs text-muted-foreground">Completed</div>
                  </div>
                  <div className="text-center p-3 bg-status-critical/10 rounded-lg">
                    <div className="text-lg font-bold text-status-critical">{taskStats.overdue}</div>
                    <div className="text-xs text-muted-foreground">Overdue</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="shadow-medium">
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="default" className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Task
                </Button>
                <Button variant="outline" className="w-full">
                  <Filter className="w-4 h-4 mr-2" />
                  Advanced Filter
                </Button>
                <Button variant="outline" className="w-full">
                  <Calendar className="w-4 h-4 mr-2" />
                  View Calendar
                </Button>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="shadow-medium">
              <CardHeader>
                <CardTitle className="text-lg">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm space-y-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-status-excellent rounded-full" />
                    <span className="text-muted-foreground">
                      Completed "Update Team Dashboard"
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-status-warning rounded-full" />
                    <span className="text-muted-foreground">
                      Moved "Client Meeting Prep" to review
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-status-info rounded-full" />
                    <span className="text-muted-foreground">
                      Started "Project Proposal"
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}