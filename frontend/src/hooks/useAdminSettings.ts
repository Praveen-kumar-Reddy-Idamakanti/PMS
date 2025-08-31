import { useState, useEffect } from 'react';
import { adminSettingsService } from '@/services/adminSettings.service';

export function useAdminSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      // Since getSettings now returns null only on error, we can directly use its result
      const data = await adminSettingsService.getSettings();
      if (data === null) {
        throw new Error('Failed to load settings');
      }
      setSettings(data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch admin settings:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch settings'));
      // Set default settings in case of error
      setSettings({
        company_name: 'My Company',
        timezone: 'UTC+00:00',
        photo_check_in: false,
        location_check_in: false
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return {
    settings,
    loading,
    error,
    refresh: fetchSettings
  };
}
