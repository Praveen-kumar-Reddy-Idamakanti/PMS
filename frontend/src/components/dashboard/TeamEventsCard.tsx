import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";

interface Event {
  id: string;
  title: string;
  date: string;
}

interface Props {
  events: Event[];
}

export function TeamEventsCard({ events = [] }: Props) {
  return (
    <Card className="shadow-medium bg-status-critical/10 border border-status-critical">
      <CardHeader>
        <CardTitle className="text-lg text-status-critical">Team Events</CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-status-critical text-center">No upcoming events</p>
        ) : (
          <ul className="space-y-1">
            {events.map((event) => (
              <li key={event.id} className="text-sm text-foreground flex items-center gap-2">
                📅 {event.title} – {event.date}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
