
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import eventService from '../../../services/event.service';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';

const CreateEvent: React.FC = () => {
    const navigate = useNavigate();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [dateTime, setDateTime] = useState('');
    const [location, setLocation] = useState('');
    const [image, setImage] = useState<File | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const formData = new FormData();
            formData.append('title', title);
            formData.append('description', description);
            formData.append('date_time', dateTime);
            formData.append('location', location);
            if (image) {
                formData.append('image', image);
            }
            await eventService.createEvent(formData);
            navigate('/events');
        } catch (error) {
            console.error('Failed to create event', error);
        }
    };

    return (
        <div className="p-4">
            <Card>
                <CardHeader>
                    <CardTitle>Create New Event</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit}>
                        <div className="mb-4">
                            <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title</label>
                            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
                        </div>
                        <div className="mb-4">
                            <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
                            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} required />
                        </div>
                        <div className="mb-4">
                            <label htmlFor="dateTime" className="block text-sm font-medium text-gray-700">Date and Time</label>
                            <Input id="dateTime" type="datetime-local" value={dateTime} onChange={(e) => setDateTime(e.target.value)} required />
                        </div>
                        <div className="mb-4">
                            <label htmlFor="location" className="block text-sm font-medium text-gray-700">Location</label>
                            <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} required />
                        </div>
                        <div className="mb-4">
                            <label htmlFor="image" className="block text-sm font-medium text-gray-700">Image</label>
                            <Input id="image" type="file" onChange={(e) => setImage(e.target.files ? e.target.files[0] : null)} />
                        </div>
                        <Button type="submit">Create Event</Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default CreateEvent;
