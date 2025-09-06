
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import eventService from '../../../services/event.service';
import { Event } from '../../../types/event';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { format } from 'date-fns';
import { useAuth } from '../../../contexts/AuthContext';
import { UserRole } from '../../../types/user';

const EventDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [event, setEvent] = useState<Event | null>(null);
    const navigate = useNavigate();
    const { user } = useAuth();

    useEffect(() => {
        const fetchEvent = async () => {
            try {
                if (id) {
                    const response = await eventService.fetchEvent(id);
                    if (response.success) {
                        setEvent(response.data);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch event', error);
            }
        };

        fetchEvent();
    }, [id]);

    const handleRsvp = async (status: 'going' | 'interested') => {
        try {
            if (id) {
                await eventService.rsvpEvent(id, status);
                // Optionally, refresh the event data to show the new RSVP
                const response = await eventService.fetchEvent(id);
                if (response.success) {
                    setEvent(response.data);
                }
            }
        } catch (error) {
            console.error('Failed to RSVP', error);
        }
    };

    const handleDelete = async () => {
        try {
            if (id) {
                await eventService.deleteEvent(id);
                navigate('/events');
            }
        } catch (error) {
            console.error('Failed to delete event', error);
        }
    };

    if (!event) {
        return <div>Loading...</div>;
    }

    return (
        <div className="p-4">
            <Button onClick={() => navigate(-1)} className="mb-4">Go Back</Button>
            <Card>
                {event.image_url && (
                    <img src={`http://localhost:5001${event.image_url}`} alt={event.title} className="w-full h-96 object-cover" />
                )}
                <CardHeader>
                    <CardTitle>{event.title}</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>{event.description}</p>
                    <p className="text-sm text-gray-500 mt-2">{format(new Date(event.date_time), 'PPP p')}</p>
                    <p className="text-sm text-gray-500">{event.location}</p>
                    <div className="mt-4">
                        <Button onClick={() => handleRsvp('going')} className="mr-2">Going</Button>
                        <Button onClick={() => handleRsvp('interested')} variant="outline">Interested</Button>
                    </div>
                    {user?.role === UserRole.SUPER_ADMIN && (
                        <div className="mt-4">
                            <Button asChild className="mr-2">
                                <Link to={`/events/edit/${id}`}>Edit</Link>
                            </Button>
                            <Button onClick={handleDelete} variant="destructive">Delete</Button>
                        </div>
                    )}
                    <div className="mt-4">
                        <h3 className="font-bold">RSVPs</h3>
                        <ul>
                            {event.rsvps.map((rsvp, index) => (
                                <li key={index}>{rsvp.name} ({rsvp.email}) - {rsvp.status}</li>
                            ))}
                        </ul>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default EventDetails;

