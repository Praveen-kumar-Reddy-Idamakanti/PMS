import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Settings, Activity, Clock } from "lucide-react";
import { UserManagement } from "./components/UserManagement";
import { SystemSettings } from "./components/SystemSettings";
import { ActivityLog } from "./components/ActivityLog";
import { Link, useNavigate } from "react-router-dom";

export const AdminDashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      
      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-4">
          <TabsTrigger 
            value="users" 
            className="flex items-center gap-2"
            onClick={() => navigate('/admin')}
          >
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger 
            value="attendance" 
            className="flex items-center gap-2"
            onClick={() => navigate('/admin/attendance')}
          >
            <Clock className="h-4 w-4" />
            Attendance
          </TabsTrigger>
          <TabsTrigger 
            value="activity" 
            className="flex items-center gap-2"
            onClick={() => navigate('/admin')}
          >
            <Activity className="h-4 w-4" />
            Activity Log
          </TabsTrigger>
          <TabsTrigger 
            value="settings" 
            className="flex items-center gap-2"
            onClick={() => navigate('/admin')}
          >
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
            </CardHeader>
            <CardContent>
              <UserManagement />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Activity Log</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityLog />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <SystemSettings />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
