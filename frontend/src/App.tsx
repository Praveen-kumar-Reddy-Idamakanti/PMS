import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { MainLayout } from "@/components/MainLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { UserRole } from "@/types/user";
import Login from "./pages/Login";
import RegisterUser from "./pages/RegisterUser";
import Dashboard from "./pages/Dashboard";
import Calendar from "./pages/Calendar";
import Tasks from "./pages/Tasks";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <AuthProvider>
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

export default App;
