import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Settings, Activity, Clock } from "lucide-react";
import { UserManagement } from "./components/UserManagement";
import { SystemSettings } from "./components/SystemSettings";
import { ActivityLog } from "./components/ActivityLog";
import { AttendancePage } from "./AttendancePage";
import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const TABS = [
  { id: 'users', label: 'Users', icon: Users, path: '/admin' },
  { id: 'attendance', label: 'Attendance', icon: Clock, path: '/admin/attendance' },
  { id: 'activity', label: 'Activity Log', icon: Activity, path: '/admin/activity-logs' },
  { id: 'settings', label: 'Settings', icon: Settings, path: '/admin/settings' },
];

export const AdminDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('users');

  // Update active tab when route changes
  useEffect(() => {
    const currentTab = TABS.find(tab => location.pathname === tab.path || 
      (location.pathname.startsWith(tab.path) && tab.path !== '/admin'));
    if (currentTab) {
      setActiveTab(currentTab.id);
    } else {
      // Default to users tab if no matching route found
      setActiveTab('users');
      navigate('/admin', { replace: true });
    }
  }, [location, navigate]);

  const handleTabChange = (tabId: string) => {
    const tab = TABS.find(t => t.id === tabId);
    if (tab) {
      setActiveTab(tabId);
      navigate(tab.path);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'attendance':
        return <AttendancePage />;
      case 'activity':
        return <ActivityLog />;
      case 'settings':
        return <SystemSettings />;
      case 'users':
      default:
        return <UserManagement />;
    }
  };

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Admin Dashboard</CardTitle>
            <div className="text-sm text-muted-foreground">
              {TABS.find(tab => tab.id === activeTab)?.label} Management
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs 
            value={activeTab} 
            onValueChange={handleTabChange} 
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-4">
              {TABS.map((tab) => (
                <TabsTrigger 
                  key={tab.id}
                  value={tab.id}
                  className="flex items-center gap-2"
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <div className="mt-6">
              {renderContent()}
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
