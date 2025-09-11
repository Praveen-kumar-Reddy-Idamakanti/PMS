import { format } from 'date-fns';
import { Task } from '@/services/task.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Clock, AlertCircle, CheckCircle } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
}

export default function TaskCard({ task, onClick }: TaskCardProps) {
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
      default:
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
      case 'high':
        return { color: 'text-status-critical' };
      case 'medium':
        return { color: 'text-status-warning' };
      case 'low':
        return { color: 'text-status-excellent' };
      default:
        return { color: 'text-muted-foreground' };
    }
  };

  const isOverdue = (dueDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(dueDate) < today && task.status !== 'completed';
  };

  const isDueSoon = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const daysUntilDue = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilDue > 0 && daysUntilDue <= 3 && task.status !== 'completed';
  };

  const getSubtaskProgress = (subtasks: any[]) => {
    const totalSubtasks = subtasks?.length || 0;
    const completedSubtasks = subtasks?.filter(st => st.completed).length || 0;
    const percentage = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;
    return { completed: completedSubtasks, total: totalSubtasks, percentage };
  };

  const statusConfig = getStatusConfig(task.status);
  const priorityConfig = getPriorityConfig(task.priority);
  const StatusIcon = statusConfig.icon;
  const overdue = isOverdue(task.dueDate);
  const dueSoon = isDueSoon(task.dueDate);
  const { completed, total, percentage } = getSubtaskProgress(task.subtasks || []);

  return (
    <Card 
      className={`shadow-medium hover:shadow-strong transition-all duration-200 cursor-pointer ${
        overdue ? 'border-l-4 border-l-status-critical' : 
        dueSoon ? 'border-l-4 border-l-status-warning' : ''
      }`}
      onClick={onClick}
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
      <CardContent>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4" />
            <span>Due {format(new Date(task.dueDate), 'MMM d, yyyy')}</span>
            {overdue && (
              <Badge variant="destructive" className="text-xs">
                Overdue
              </Badge>
            )}
            {dueSoon && !overdue && (
              <Badge variant="warning" className="text-xs">
                Due Soon
              </Badge>
            )}
          </div>
          {task.assignedTo && (
            <div className="flex items-center space-x-2">
              <Avatar className="w-6 h-6">
                <AvatarFallback>
                  {String(task.assignedTo)
                    .split('')
                    .slice(0, 2)
                    .join('')}
                </AvatarFallback>
              </Avatar>
              <span>User #{task.assignedTo}</span>
            </div>
          )}
        </div>
        
        {task.subtasks && task.subtasks.length > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-sm text-muted-foreground mb-1">
              <span>Subtasks: {completed}/{total}</span>
              <span>{percentage}%</span>
            </div>
            <Progress value={percentage} className="h-2" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
