import api from './api';

export type SystemSetting = {
  key: string;
  value: string;
  description?: string;
  type?: 'string' | 'number' | 'boolean' | 'json';
};

export const systemService = {
  getSettings: async (): Promise<Record<string, SystemSetting>> => {
    const response = await api.get('/admin/settings');
    return response.data;
  },

  updateSetting: async (key: string, value: any): Promise<SystemSetting> => {
    const response = await api.put(`/admin/settings/${key}`, { value });
    return response.data;
  },

  getBackup: async (): Promise<Blob> => {
    const response = await api.get('/admin/backup', { responseType: 'blob' });
    return response.data;
  },

  restoreBackup: async (file: File): Promise<void> => {
    const formData = new FormData();
    formData.append('file', file);
    
    await api.post('/admin/restore', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};
