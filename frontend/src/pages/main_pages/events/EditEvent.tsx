import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import eventService from '../../../services/event.service';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Event } from '../../../types/event';

const EditEvent: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [dateTime, setDateTime] = useState('');
    const [location, setLocation] = useState('');
    const [image, setImage] = useState<File | null>(null);
    const [existingImageUrl, setExistingImageUrl] = useState<string | undefined>('');

    useEffect(() => {
        const fetchEvent = async () => {
            try {
                if (id) {
                    const response = await eventService.fetchEvent(id);
                    if (response.success) {
                        const event = response.data;
                        setTitle(event.title);
                        setDescription(event.description);
                        setDateTime(new Date(event.date_time).toISOString().slice(0, 16));
                        setLocation(event.location);
                        setExistingImageUrl(event.image_url);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch event', error);
            }
        };

        fetchEvent();
    }, [id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (id) {
                const formData = new FormData();
                formData.append('title', title);
                formData.append('description', description);
                formData.append('date_time', dateTime);
                formData.append('location', location);
                if (image) {
                    formData.append('image', image);
                } else if (existingImageUrl) {
                    formData.append('image_url', existingImageUrl);
                }
                await eventService.updateEvent(id, formData);
                navigate(`/events/${id}`);
            }
        } catch (error) {
            console.error('Failed to update event', error);
        }
    };

    return (
        <div className="p-4">
            <Card>
                <CardHeader>
                    <CardTitle>Edit Event</CardTitle>
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
                            {existingImageUrl && !image && (
                                <img src={`http://localhost:5001${existingImageUrl}`} alt="Existing event image" className="w-full h-48 object-cover mt-2" />
                            )}
                        </div>
                        <Button type="submit">Update Event</Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default EditEvent;
