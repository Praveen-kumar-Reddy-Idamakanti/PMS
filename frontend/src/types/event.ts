
export interface Event {
    id: number;
    title: string;
    description: string;
    date_time: string;
    location: string;
    created_by: number;
    created_at: string;
    image_url?: string;
    rsvps: Rsvp[];
}

export interface Rsvp {
    status: 'going' | 'interested';
    name: string;
    email: string;
}
