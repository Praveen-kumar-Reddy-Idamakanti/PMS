import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import eventService from '../../../services/event.service';
import { Event } from '../../../types/event';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { format } from 'date-fns';

const EventHistory: React.FC = () => {
    const [events, setEvents] = useState<Event[]>([]);

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const response = await eventService.fetchPastEvents();
                if (response.success) {
                    setEvents(response.data);
                }
            } catch (error) {
                console.error('Failed to fetch events', error);
            }
        };

        fetchEvents();
    }, []);

    return (
        <div className="p-4">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold">Past Events</h1>
                <Button asChild>
                    <Link to="/events">Upcoming Events</Link>
                </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {events.map((event) => (
                    <Card key={event.id} className="overflow-hidden transform transition-transform duration-300 hover:scale-105 hover:shadow-lg">
                        <Link to={`/events/${event.id}`}>
                            {event.image_url && (
                                <img src={`http://localhost:5001${event.image_url}`} alt={event.title} className="w-full h-48 object-cover" />
                            )}
                            <CardHeader>
                                <CardTitle>{event.title}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-gray-500 mt-2">{format(new Date(event.date_time), 'PPP p')}</p>
                                <p className="text-sm text-gray-500">{event.location}</p>
                            </CardContent>
                        </Link>
                    </Card>
                ))}
            </div>
        </div>
    );
};

export default EventHistory;
