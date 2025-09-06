import api from './api';
import { Event } from '../types/event';

export interface EventsResponse {
    success: boolean;
    data: Event[];
}

export interface EventResponse {
    success: boolean;
    data: Event;
}

const eventService = {
    fetchEvents: async (): Promise<EventsResponse> => {
        const response = await api.get('/events');
        return response.data;
    },

    fetchPastEvents: async (): Promise<EventsResponse> => {
        const response = await api.get('/events/history');
        return response.data;
    },

    fetchEvent: async (id: string): Promise<EventResponse> => {
        const response = await api.get(`/events/${id}`);
        return response.data;
    },

    createEvent: async (data: FormData) => {
        const response = await api.post('/events', data, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    rsvpEvent: async (id: string, status: 'going' | 'interested') => {
        const response = await api.post(`/events/${id}/rsvp`, { status });
        return response.data;
    },

    updateEvent: async (id: string, data: FormData) => {
        const response = await api.put(`/events/${id}`, data, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    deleteEvent: async (id: string) => {
        const response = await api.delete(`/events/${id}`);
        return response.data;
    },
};

export default eventService;