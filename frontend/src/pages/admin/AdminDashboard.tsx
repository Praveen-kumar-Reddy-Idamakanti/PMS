import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Settings, Activity, Clock, AlertCircle, Home, BarChart3 } from "lucide-react";
import { UserManagement } from "./components/UserManagement";
import { SystemSettings } from "./components/SystemSettings";
import { ActivityLog } from "./components/ActivityLog";
import { AttendancePage } from "./AttendancePage";
import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import AdminRequests from "./AdminRequests";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { fetchWithAuth } from "@/lib/api";
import { RemoteRequest } from "@/types/remoteRequest";

const TABS = [
  { id: 'users', label: 'Users', icon: Users, path: '/admin', description: 'Manage user accounts and permissions' },
  { id: 'attendance', label: 'Attendance', icon: Clock, path: '/admin/attendance', description: 'View and manage attendance records' },
  { id: 'activity', label: 'Activity Log', icon: Activity, path: '/admin/activity-logs', description: 'Monitor system activities' },
  { id: 'settings', label: 'Settings', icon: Settings, path: '/admin/settings', description: 'Configure system settings' },
  { id: 'requests', label: 'Requests', icon: AlertCircle, path: '/admin/requests', description: 'Manage pending requests' },
];

export const AdminDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('users');
  const [newRequestsCount, setNewRequestsCount] = useState(0);
  const [requests, setRequests] = useState<RemoteRequest[]>([]);
  const [loading, setLoading] = useState(true);

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

  const fetchRequests = async () => {
    try {
      const response = await fetchWithAuth('/remote-attendance/pending');
      const data = await response.json();
      if (response.ok) {
        setRequests(data);
        // Update the new requests count in the parent component
        const newCount = data.filter((req: any) => req.status === 'pending').length;
        setNewRequestsCount(newCount);
      } else {
        throw new Error(data.message || 'Failed to fetch requests');
      }
    } catch (error) {
      console.error('Error fetching remote requests:', error);
      toast.error('Failed to load remote work requests');
    } finally {
      setLoading(false);
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
      case 'requests':
        return <AdminRequests />;
    }
  };

  return (
    <div className="min-h-screen bg-muted/20">
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col space-y-2">
          <div className="flex items-center space-x-2">
            <Home className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          </div>
          <p className="text-muted-foreground">
            Welcome back! Manage your team and system settings from one place.
          </p>
        </div>

        {/* Main Content */}
        <Card className="overflow-hidden">
          <Tabs 
            value={activeTab} 
            onValueChange={handleTabChange} 
            className="w-full"
          >
            <div className="border-b">
              <div className="px-6 pt-4">
                <CardTitle className="text-xl">
                  {TABS.find(tab => tab.id === activeTab)?.label} Management
                </CardTitle>
                <CardDescription className="mt-1">
                  {TABS.find(tab => tab.id === activeTab)?.description}
                </CardDescription>
              </div>
              <TabsList className="h-auto p-0 px-6 bg-transparent">
                {TABS.map((tab) => (
                  <TabsTrigger 
                    key={tab.id}
                    value={tab.id}
                    className="relative py-4 px-4 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none"
                  >
                    <div className="flex items-center gap-2">
                      <tab.icon className="h-4 w-4" />
                      {tab.label}
                      {tab.id === 'requests' && newRequestsCount > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {newRequestsCount} new
                        </Badge>
                      )}
                    </div>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <div className="p-6">
              {renderContent()}
            </div>
          </Tabs>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
