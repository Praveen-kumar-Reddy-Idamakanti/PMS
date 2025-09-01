import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RemoteAttendanceRequests } from './components/RemoteAttendanceRequests';
import { Button } from '@/components/ui/button';
import { Download, RefreshCw } from 'lucide-react';

export const AdminRequests = () => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex space-x-2">
          {/* <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button> */}
        </div>
      </div>

      <Tabs defaultValue="remote" className="space-y-4">
        <TabsList>
          <TabsTrigger value="remote">Remote Work</TabsTrigger>
          <TabsTrigger value="leave">Leave Requests</TabsTrigger>
          <TabsTrigger value="expense">Expense Claims</TabsTrigger>
          <TabsTrigger value="shift">Shift Changes</TabsTrigger>
        </TabsList>

        <TabsContent value="remote" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Remote Work Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <RemoteAttendanceRequests />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leave">
          <Card>
            <CardHeader>
              <CardTitle>Leave Requests</CardTitle>
            </CardHeader>
            <CardContent className="text-center py-12 text-muted-foreground">
              <p>No leave requests pending approval</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expense">
          <Card>
            <CardHeader>
              <CardTitle>Expense Claims</CardTitle>
            </CardHeader>
            <CardContent className="text-center py-12 text-muted-foreground">
              <p>No expense claims pending approval</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="shift">
          <Card>
            <CardHeader>
              <CardTitle>Shift Change Requests</CardTitle>
            </CardHeader>
            <CardContent className="text-center py-12 text-muted-foreground">
              <p>No shift change requests pending approval</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminRequests;