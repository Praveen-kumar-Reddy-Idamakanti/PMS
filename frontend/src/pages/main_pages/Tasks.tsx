import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, isAfter, isBefore, addDays } from 'date-fns';

// Services
import taskService, { 
  Task
} from '@/services/task.service';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


// Icons
import { 
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  MoreHorizontal,
  Plus,
} from 'lucide-react';

// Components
import CreateTaskDialog from '@/components/tasks/CreateTaskDialog';
import TaskStatusSummary from '@/components/tasks/TaskStatusSummary';
import TaskCard from '@/components/tasks/TaskCard';

// Types
type FilterStatus = 'all' | 'todo' | 'in-progress' | 'review' | 'completed';

// Main Component
export default function Tasks() {
  // State
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
    console.log('User Role:', JSON.parse(userData).role);

    const fetchData = async () => {
      try {
        setLoading(true);
        const fetchedTasks = await taskService.getAllTasks();
        setTasks(fetchedTasks);
      } catch (err) {
        setError('Failed to fetch data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const getStatusConfig = (status: Task['status']) => {
    switch (status) {
      case 'todo':
        return {
          textColor: 'text-muted-foreground',
          borderColor: 'border-muted',
          icon: Clock,
          label: 'To Do',
        };
      case 'in-progress':
        return {
          textColor: 'text-status-info',
          borderColor: 'border-status-info',
          icon: Clock,
          label: 'In Progress',
        };
      case 'review':
        return {
          textColor: 'text-status-warning',
          borderColor: 'border-status-warning',
          icon: AlertCircle,
          label: 'Review',
        };
      case 'completed':
        return {
    
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

  const getSubtaskCompletion = (task: Task) => {
    if (!task.subtasks || task.subtasks.length === 0) {
      return { completed: 0, total: 0, percentage: 0 };
    }
    const completedSubtasks = task.subtasks.filter(subtask => subtask.completed).length;
    const totalSubtasks = task.subtasks.length;
    const percentage = Math.round((completedSubtasks / totalSubtasks) * 100);
    return { completed: completedSubtasks, total: totalSubtasks, percentage };
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
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h2 className="text-xl font-bold text-foreground">My Tasks</h2>
            <Badge variant="outline">{user && user.role}</Badge>
            <Badge variant="outline">{taskStats.total} Total</Badge>
          </div>
          <div>
            <Button onClick={() => {
              console.log('tasks.tsx: Setting isCreateTaskDialogOpen to true.');
              setIsCreateTaskDialogOpen(true);
            }}>
              <Plus className="mr-2 h-4 w-4" />
              New Task
            </Button>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid gap-6 md:grid-cols-4">
          {/* Tasks Section (75% width) */}
          <div className="md:col-span-3">
            <Tabs defaultValue="overview">
              <TabsContent value="overview" className="p-4">
                {/* Tasks List */}
                <div className="space-y-6">
                  {/* Filter Tabs */}
                  <div className="max-w-xl">
                    <div className="flex space-x-1 p-1 bg-muted rounded-lg w-full justify-between">
                      {([
                        { key: 'all', label: 'All', count: taskStats.total },
                        { key: 'todo', label: 'To Do', count: taskStats.todo },
                        { key: 'review', label: 'Review', count: taskStats.review },
                        { key: 'in-progress', label: 'In Progress', count: taskStats.inProgress },
                        { key: 'completed', label: 'Completed', count: taskStats.completed },
                      ] as const).map(({ key, label, count }) => (
                        <Button
                          key={key}
                          variant={filterStatus === key ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setFilterStatus(key)}
                          className="relative flex-1"
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
                  </div>
                </div>

                {/* Tasks */}
                <div className="space-y-4">
                  {filteredTasks.length === 0 ? (
                    <Card className="shadow-soft">
                      <CardContent className="py-12 text-center">
                        <CheckCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-1">No tasks found</h3>
                        <p className="text-muted-foreground text-sm">
                          {filterStatus === 'all' 
                            ? 'Create your first task to get started.' 
                            : `No ${filterStatus} tasks found.`}
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {filteredTasks.map((task) => {
                        const statusConfig = getStatusConfig(task.status);
                        const priorityConfig = getPriorityConfig(task.priority);
                        const StatusIcon = statusConfig.icon;
                        const overdue = isOverdue(task.dueDate);
                        const dueSoon = isDueSoon(task.dueDate);

                        return (
                          <Card 
                            key={task.id} 
                            onClick={() => navigate(`/tasks/${task.id}`)}
                            className={`shadow-medium hover:shadow-strong transition-all duration-200 cursor-pointer ${
                              overdue ? 'border-l-4 border-l-status-critical' : 
                              dueSoon ? 'border-l-4 border-l-status-warning' : ''
                            }`}
                          >
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-3 mb-2">
                                    <StatusIcon className={`w-4 h-4 ${statusConfig.color}`} />
                                    <span className="text-sm font-medium">{task.status}</span>
                                  </div>
                                  <h3 className="text-lg font-semibold leading-tight">{task.title}</h3>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardHeader>
                            
                            <CardContent className="space-y-4">
                              {/* Meta Information */}
                              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
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

                              {/* Subtask Progress Bar */}
                              {task.subtasks && task.subtasks.length > 0 && (() => {
                                const { completed, total, percentage } = getSubtaskCompletion(task);
                                return (
                                  <div className="mt-4">
                                    <div className="flex justify-between text-sm text-muted-foreground mb-1">
                                      <span>Subtasks: {completed}/{total}</span>
                                      <span>{percentage}%</span>
                                    </div>
                                    <Progress value={percentage} className="h-2" />
                                  </div>
                                );
                              })()}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
          
          {/* Stats Section (25% width) */}
          <div className="md:col-span-1 space-y-6">
            <TaskStatusSummary 
              todo={taskStats.todo}
              inProgress={taskStats.inProgress}
              review={taskStats.review}
              completed={taskStats.completed}
              totalTasks={taskStats.total}
            />
          </div>
        </div>
      </div>
      
      {/* Create Task Dialog */}
      <CreateTaskDialog 
        isOpen={isCreateTaskDialogOpen}
        onClose={() => setIsCreateTaskDialogOpen(false)}
        onTaskCreated={handleTaskCreated}
      />
    </div>
  );
}
