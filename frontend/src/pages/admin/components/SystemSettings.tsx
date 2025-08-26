import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { systemService, SystemSetting } from "../../../services/system.service";
import { toast } from "sonner";
import { LoadingGif } from "@/components/ui/LoadingGif";

type SettingsMap = Record<string, SystemSetting>;

export const SystemSettings = () => {
  const queryClient = useQueryClient();

  const { data: settings = {}, isLoading } = useQuery<SettingsMap>({
    queryKey: ['system-settings'],
    queryFn: systemService.getSettings,
  });

  const updateSetting = useMutation({
    mutationFn: ({ key, value }: { key: string; value: any }) => 
      systemService.updateSetting(key, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      toast.success('Setting updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update setting: ${error.message}`);
    }
  });

  const handleSettingChange = async (key: string, value: any) => {
    await updateSetting.mutateAsync({ key, value });
  };

  if (isLoading) return <LoadingGif text="Loading system settings..." />;

  return (
    <form className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium">General Settings</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="companyName">Company Name</Label>
            <Input
              id="companyName"
              defaultValue={settings.companyName?.value || ''}
              onBlur={(e) => handleSettingChange('companyName', e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <select
              id="timezone"
              defaultValue={settings.timezone?.value || 'UTC'}
              onChange={(e) => handleSettingChange('timezone', e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="UTC">UTC</option>
              <option value="America/New_York">Eastern Time (ET)</option>
              <option value="America/Chicago">Central Time (CT)</option>
              <option value="America/Denver">Mountain Time (MT)</option>
              <option value="America/Los_Angeles">Pacific Time (PT)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Attendance Settings</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="enableGeofencing">Enable Location Check-in</Label>
              <p className="text-sm text-muted-foreground">
                Require employees to be at the workplace to check-in
              </p>
            </div>
            <Switch 
              id="enableGeofencing" 
              checked={settings.enableGeofencing?.value === 'true'}
              onCheckedChange={(checked) => handleSettingChange('enableGeofencing', String(checked))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="enablePhotoCheckIn">Enable Photo Check-in</Label>
              <p className="text-sm text-muted-foreground">
                Require a photo when checking in/out
              </p>
            </div>
            <Switch 
              id="enablePhotoCheckIn" 
              checked={settings.enablePhotoCheckIn?.value === 'true'}
              onCheckedChange={(checked) => handleSettingChange('enablePhotoCheckIn', String(checked))}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="button" disabled={updateSetting.isPending}>
          {updateSetting.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
};
