import api from './api';

export interface Holiday {
  id: number;
  name: string;
  date: string;
  type: 'public' | 'company' | 'optional';
  created_by: number;
  created_at: string;
  updated_at: string;
}

export const holidayService = {
  getHolidays: async (): Promise<Holiday[]> => {
    try {
      const response = await api.get('/holidays');
      return response.data || [];
    } catch (error) {
      console.error('Error fetching holidays:', error);
      throw error;
    }
  },

  createHoliday: async (data: Omit<Holiday, 'id' | 'created_at' | 'updated_at'>): Promise<Holiday> => {
    try {
      const response = await api.post('/holidays', data);
      return response.data;
    } catch (error) {
      console.error('Error creating holiday:', error);
      throw error;
    }
  },

  updateHoliday: async (id: number, data: Partial<Holiday>): Promise<Holiday> => {
    try {
      const response = await api.put(`/holidays/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating holiday:', error);
      throw error;
    }
  },

  deleteHoliday: async (id: number): Promise<void> => {
    try {
      await api.delete(`/holidays/${id}`);
    } catch (error) {
      console.error('Error deleting holiday:', error);
      throw error;
    }
  },
};
