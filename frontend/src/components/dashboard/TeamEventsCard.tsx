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
    <Card className="shadow-medium hover:border-orange-500">
      <CardHeader>
        <CardTitle>Team Events</CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No upcoming events</p>
        ) : (
          <ul className="space-y-1">
            {events.map((event) => (
              <li key={event.id} className="text-sm">
                📅 {event.title} – {event.date}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
