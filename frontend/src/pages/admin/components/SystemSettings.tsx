import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { LoadingGif } from "@/components/ui/LoadingGif";
import { adminSettingsService, AdminSettings } from "@/services/adminSettings.service";

export const SystemSettings = () => {
  const queryClient = useQueryClient();

  const { data: settings, isLoading, error } = useQuery<AdminSettings | null>({
    queryKey: ['admin-settings'],
    queryFn: adminSettingsService.getSettings,
    // Don't retry on 403 Forbidden errors
    retry: (failureCount, error: any) => {
      return error?.response?.status !== 403 && failureCount < 3;
    },
  });

  const updateSettings = useMutation({
    mutationFn: async (updatedSettings: Partial<AdminSettings>) => {
      try {
        return await adminSettingsService.updateSettings(updatedSettings);
      } catch (error) {
        // The error is already handled in the service, just rethrow it
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate and refetch the settings
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      toast.success('Settings updated successfully');
    },
    onError: (error: Error) => {
      // Show error toast with the error message
      toast.error(error.message || 'Failed to update settings');
    }
  });

  const [locationCheckIn, setLocationCheckIn] = useState(settings?.location_check_in ?? true);
  const [photoCheckIn, setPhotoCheckIn] = useState(settings?.photo_check_in ?? false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const updatedSettings = {
      company_name: formData.get('companyName') as string,
      timezone: formData.get('timezone') as string,
      location: formData.get('location') as string,
      location_check_in: locationCheckIn,
      photo_check_in: photoCheckIn,
    };
    console.log('Submitting settings:', updatedSettings);
    updateSettings.mutate(updatedSettings);
  };

  if (isLoading) return <LoadingGif text="Loading system settings..." />;
  
  if (error) {
    return (
      <div className="p-4 text-center text-red-500">
        Error loading settings: {error instanceof Error ? error.message : 'Unknown error'}
      </div>
    );
  }
  
  if (!settings) {
    return (
      <div className="p-4 text-center text-yellow-600">
        No settings found. Please contact an administrator to configure system settings.
      </div>
    );
  }

  // Timezone options
  const timezones = [
    'UTC-12:00', 'UTC-11:00', 'UTC-10:00', 'UTC-09:30', 'UTC-09:00',
    'UTC-08:00', 'UTC-07:00', 'UTC-06:00', 'UTC-05:00', 'UTC-04:00',
    'UTC-03:30', 'UTC-03:00', 'UTC-02:00', 'UTC-01:00', 'UTC+00:00',
    'UTC+01:00', 'UTC+02:00', 'UTC+03:00', 'UTC+03:30', 'UTC+04:00',
    'UTC+04:30', 'UTC+05:00', 'UTC+05:30', 'UTC+05:45', 'UTC+06:00',
    'UTC+06:30', 'UTC+07:00', 'UTC+08:00', 'UTC+08:45', 'UTC+09:00',
    'UTC+09:30', 'UTC+10:00', 'UTC+10:30', 'UTC+11:00', 'UTC+12:00',
    'UTC+12:45', 'UTC+13:00', 'UTC+14:00'
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium">System Settings</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="companyName">Company Name</Label>
            <Input
              id="companyName"
              name="companyName"
              defaultValue={settings.company_name}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <select
              id="timezone"
              name="timezone"
              defaultValue={settings.timezone || 'UTC+00:00'}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {timezones.map(timezone => (
                <option key={timezone} value={timezone}>{timezone}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Attendance Settings</h3>
        
        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            name="location"
            defaultValue={settings.location || ''}
            placeholder="e.g., New York, USA"
          />
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="locationCheckIn">Enable Location Check-in</Label>
              <Switch
                id="locationCheckIn"
                name="locationCheckIn"
                checked={locationCheckIn}
                onCheckedChange={setLocationCheckIn}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Require location during check-in
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="photoCheckIn">Enable Photo Check-in</Label>
              <Switch
                id="photoCheckIn"
                name="photoCheckIn"
                checked={photoCheckIn}
                onCheckedChange={setPhotoCheckIn}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Require photo capture during check-in
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button type="submit" disabled={updateSettings.isPending}>
          {updateSettings.isPending ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </form>
  );
};
