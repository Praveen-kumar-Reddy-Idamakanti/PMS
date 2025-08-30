import api from './api';

export interface AdminSettings {
  id?: number;
  user_id: number;
  company_name: string;
  timezone: string;
  location?: string | null;       // For location string
  location_check_in: boolean;     // For location check-in setting
  photo_check_in: boolean;
  created_at?: string;
  updated_at?: string;
}

export const adminSettingsService = {
  // Get admin settings for the current user
  getSettings: async (): Promise<AdminSettings> => {
    try {
      console.log('Fetching admin settings...');
      // Remove the leading '/api' since it's already included in the baseURL
      const response = await api.get('/admin/settings');
      console.log('Admin settings response:', response);
      // The backend returns { success: true, data: settings }
      console.log('Raw response data:', response.data);
      const settings = response.data.data || response.data;
      console.log('Extracted settings:', settings);
      return settings;
    } catch (error) {
      console.error('Error fetching admin settings:', error);
      // Return default settings if not found
      if (error.response?.status === 404) {
        const defaultSettings = {
          user_id: 0, // Will be set by the backend
          company_name: 'My Company',
          timezone: 'UTC+00:00',
          location: null,
          location_check_in: true,
          photo_check_in: false
        };
        console.log('Returning default settings:', defaultSettings);
        return defaultSettings;
      }
      throw error;
    }
  },

  // Update admin settings
  updateSettings: async (settings: Partial<AdminSettings>): Promise<AdminSettings> => {
    try {
      // Format the settings object to match backend expectations
      const formattedSettings = {
        company_name: settings.company_name,
        timezone: settings.timezone,
        location_check_in: settings.location_check_in,
        photo_check_in: settings.photo_check_in,
        // Include location if it exists
        ...(settings.location !== undefined && { location: settings.location })
      };
      
      console.log('Sending settings update:', formattedSettings);
      const response = await api.put('/admin/settings', formattedSettings);
      return response.data.data;
    } catch (error) {
      console.error('Error updating admin settings:', error);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
        console.error('Response headers:', error.response.headers);
      }
      throw error;
    }
  }
};

export default adminSettingsService;
