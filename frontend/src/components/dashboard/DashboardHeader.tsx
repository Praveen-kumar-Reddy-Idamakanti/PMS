export function DashboardHeader({ userName }: { userName: string }) {
    return (
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Welcome back, {userName} 👋</h1>
        <p className="text-sm text-muted-foreground">Here’s your daily overview</p>
      </div>
    );
  }
  