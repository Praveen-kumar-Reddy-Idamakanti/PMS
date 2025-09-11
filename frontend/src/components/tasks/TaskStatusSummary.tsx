import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TaskStatusSummaryProps {
  todo: number;
  inProgress: number;
  review: number;
  completed: number;
  totalTasks: number;
}

export default function TaskStatusSummary({ 
  todo, 
  inProgress, 
  review, 
  completed, 
  totalTasks 
}: TaskStatusSummaryProps) {
  const completionRate = totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0;

  // Calculate percentages for progress bars
  const todoPercent = totalTasks > 0 ? (todo / totalTasks) * 100 : 0;
  const inProgressPercent = totalTasks > 0 ? (inProgress / totalTasks) * 100 : 0;
  const reviewPercent = totalTasks > 0 ? (review / totalTasks) * 100 : 0;
  const completedPercent = totalTasks > 0 ? (completed / totalTasks) * 100 : 0;

  return (
    <Card className="shadow-medium">
      <CardHeader>
        <CardTitle className="text-lg">Task Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Completion Rate */}
        <div className="text-center p-4 bg-muted/10 rounded-lg">
          <div 
            className={`text-2xl font-bold ${
              completionRate === 100 ? "text-status-excellent" : 
              completionRate >= 70 ? "text-status-warning" : "text-status-critical"
            }`}
          >
            {completionRate}%
          </div>
          <div className="text-sm text-muted-foreground">Completion Rate</div>
        </div>

        {/* Status Grid */}
        <div className="space-y-3">
          {/* Todo */}
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="font-medium">To Do</span>
              <span className="text-muted-foreground">{todo} tasks</span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-status-critical/70" 
                style={{ width: `${todoPercent}%` }}
              />
            </div>
          </div>

          {/* In Progress */}
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="font-medium">In Progress</span>
              <span className="text-muted-foreground">{inProgress} tasks</span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-status-warning/70" 
                style={{ width: `${inProgressPercent}%` }}
              />
            </div>
          </div>

          {/* Review */}
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="font-medium">In Review</span>
              <span className="text-muted-foreground">{review} tasks</span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-status-warning/70" 
                style={{ width: `${reviewPercent}%` }}
              />
            </div>
          </div>

          {/* Completed */}
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="font-medium">Completed</span>
              <span className="text-muted-foreground">{completed} tasks</span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-status-excellent/70" 
                style={{ width: `${completedPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Summary Grid */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="text-center p-3 bg-status-critical/10 rounded-lg">
            <div className="text-lg font-bold text-status-critical">{todo}</div>
            <div className="text-xs text-muted-foreground">To Do</div>
          </div>
          <div className="text-center p-3 bg-status-warning/10 rounded-lg">
            <div className="text-lg font-bold text-status-warning">{inProgress}</div>
            <div className="text-xs text-muted-foreground">In Progress</div>
          </div>
          <div className="text-center p-3 bg-status-warning/10 rounded-lg">
            <div className="text-lg font-bold text-status-warning">{review}</div>
            <div className="text-xs text-muted-foreground">In Review</div>
          </div>
          <div className="text-center p-3 bg-status-excellent/10 rounded-lg">
            <div className="text-lg font-bold text-status-excellent">{completed}</div>
            <div className="text-xs text-muted-foreground">Completed</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
