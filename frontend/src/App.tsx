import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigation } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { MainLayout } from "@/components/MainLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { UserRole } from "@/types/user";
import Login from "./pages/Login";
import RegisterUser from "./pages/RegisterUser";
import Dashboard from "./pages/Dashboard";
import Calendar from "./pages/Calendar";
import Tasks from "./pages/Tasks";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { AttendancePage } from "./pages/admin/AttendancePage";
import { AttendanceRecordsPage } from "./pages/admin/AttendanceRecordsPage";
import NotFound from "./pages/NotFound";
import { useEffect } from "react";
import { RouteTransitionLoader } from "@/components/ui/RouteTransitionLoader";
import { ActivityLog } from "./pages/admin/components";

// Debug component to log route changes and auth state
const DebugRouter = () => {
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Route changed to:', location.pathname);
      console.log('Current user:', user ? { id: user.id, email: user.email, role: user.role } : 'Not authenticated');
    }
  }, [location, user]);

  return null;
};

const queryClient = new QueryClient();

const App = () => {
  // Add debug logs for app initialization
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('App initialized in', import.meta.env.MODE, 'mode');
      console.log('Environment:', import.meta.env.MODE);
      console.log('Base URL:', import.meta.env.VITE_API_BASE_URL || 'Not set');
    }
  }, []);

  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <AuthProvider>
          <RouteTransitionLoader key="route-loader" />
          <DebugRouter />
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/login" element={<Login />} />
            
            {/* Protected Routes */}
            <Route element={
              <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.TEAM_LEADER]} />
            }>
              <Route 
                path="/register" 
                element={
                  <MainLayout>
                    <RegisterUser />
                  </MainLayout>
                } 
              />
            </Route>

            {/* Regular protected routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={
                <MainLayout>
                  <Dashboard />
                </MainLayout>
              } />
              <Route path="/calendar" element={
                <MainLayout>
                  <Calendar />
                </MainLayout>
              } />
              <Route path="/tasks" element={
                <MainLayout>
                  <Tasks />
                </MainLayout>
              } />
              
              {/* Admin Routes - Only accessible by super_admin */}
              <Route path="/admin/attendance/records" element={
                <ProtectedRoute allowedRoles={[UserRole.SUPER_ADMIN]}>
                  <MainLayout>
                    <AttendanceRecordsPage />
                  </MainLayout>
                </ProtectedRoute>
              } />
              <Route path="/admin/*" element={
                <ProtectedRoute allowedRoles={[UserRole.SUPER_ADMIN]}>
                  <MainLayout>
                    <AdminDashboard />
                  </MainLayout>
                </ProtectedRoute>
              } />
            </Route>

            <Route path="*" element={
              <div className="flex items-center justify-center min-h-screen">
                <NotFound />
              </div>
            } />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
