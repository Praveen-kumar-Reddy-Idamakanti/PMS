import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";

interface Task {
  id: string;
  title: string;
  completed: boolean;
}

interface Props {
  tasks: Task[];
}

export function ActiveTasksCard({ tasks = [] }: Props) {
  return (
    <Card className="shadow-medium bg-status-excellent/10 border border-status-excellent">
      <CardHeader>
        <CardTitle className="text-lg text-status-excellent">Active Tasks</CardTitle>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <p className="text-sm text-status-excellent text-center">No active tasks</p>
        ) : (
          <ul className="space-y-1">
            {tasks.map((task) => (
              <li key={task.id} className="text-sm text-foreground flex items-center gap-2">
                {task.completed ? "✅" : "🟠"} {task.title}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
