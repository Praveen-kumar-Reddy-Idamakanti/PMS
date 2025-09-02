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
    <Card className="shadow-medium hover:border-orange-500">
      <CardHeader>
        <CardTitle>Active Tasks</CardTitle>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active tasks</p>
        ) : (
          <ul className="space-y-1">
            {tasks.map((task) => (
              <li key={task.id} className="text-sm">
                {task.completed ? "✅" : "🟠"} {task.title}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
