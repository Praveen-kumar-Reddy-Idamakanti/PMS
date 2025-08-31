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
  // Get admin settings - accessible to all authenticated users
  getSettings: async (): Promise<AdminSettings | null> => {
    try {
      console.log('Fetching admin settings...');
      const response = await api.get('/admin/settings');
      
      console.log('Admin settings response:', response);
      // The backend returns { success: true, data: settings }
      console.log('Raw response data:', response.data);
      const settings = response.data.data || response.data;
      console.log('Extracted settings:', settings);
      return settings;
    } catch (error: any) {
      console.error('Error fetching admin settings:', {
        status: error.response?.status,
        message: error.message,
        data: error.response?.data
      });
      
      // If unauthorized or forbidden, return null
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.log('User not authorized to access admin settings');
        return null;
      }
      
      // For other errors, rethrow
      throw error;
    }
  },

  // Update admin settings - only for super_admins
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
      
      console.log('Settings update successful:', response.data);
      return response.data.data;
    } catch (error: any) {
      console.error('Error updating admin settings:', {
        status: error.response?.status,
        message: error.message,
        data: error.response?.data
      });
      
      // If unauthorized or forbidden, provide a more helpful error message
      if (error.response?.status === 403) {
        throw new Error('You do not have permission to update admin settings. Only super admins can modify these settings.');
      } else if (error.response?.status === 401) {
        throw new Error('You must be logged in to update settings');
      }
      
      // For other errors, rethrow with the original message
      throw new Error(error.response?.data?.message || 'Failed to update settings');
    }
  }
};

export default adminSettingsService;
