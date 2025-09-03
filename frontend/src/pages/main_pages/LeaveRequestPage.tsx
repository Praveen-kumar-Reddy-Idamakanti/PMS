import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LeaveRequestForm } from '@/components/leaves/LeaveRequestForm';
import { LeaveBalanceDisplay } from '@/components/leaves/LeaveBalanceDisplay';
import { LeaveHistoryTable } from '@/components/leaves/LeaveHistoryTable';

export const LeaveRequestPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Leave Management</h2>
      <p className="text-muted-foreground">Manage your leave requests and view your leave balances and history.</p>

      <Tabs defaultValue="request" className="space-y-4">
        <TabsList>
          <TabsTrigger value="request">Leave Request</TabsTrigger>
          <TabsTrigger value="history">Leave History</TabsTrigger>
        </TabsList>

        <TabsContent value="request" className="space-y-4">
          <div className="flex flex-col lg:flex-row gap-6 ">
            <div className="flex-1 hover:border-orange-500 hover:border-2 ">
              <Card>
                <CardHeader>
                  <CardTitle>Submit New Leave Request</CardTitle>
                </CardHeader>
                <CardContent>
                  <LeaveRequestForm />
                </CardContent>
              </Card>
            </div>
            
            <div className="w-full lg:w-80 flex-shrink-0 space-y-4 hover:border-orange-500 hover:border-2">
              <Card className="lg:sticky lg:top-6">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Your Leave Balance</CardTitle>
                </CardHeader>
                <CardContent>
                  <LeaveBalanceDisplay />
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Your Leave History</CardTitle>
            </CardHeader>
            <CardContent>
              <LeaveHistoryTable />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
