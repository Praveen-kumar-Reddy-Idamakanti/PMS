import { useState, useEffect } from 'react';
import { adminSettingsService } from '@/services/adminSettings.service';

export function useAdminSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const data = await adminSettingsService.getSettings();
      setSettings(data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch admin settings:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch settings'));
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
