import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userService } from "../../../services/user.service";
import { toast } from "sonner";
import { User, UserRole, canCreateUser } from "@/types/user";
import { LoadingGif } from "@/components/ui/LoadingGif";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  employeeId: string;
  role: UserRole;
}

export const UserManagement = () => {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [isRegisterDialogOpen, setIsRegisterDialogOpen] = useState(false);
  const [formData, setFormData] = useState<RegisterFormData>({
    name: '',
    email: '',
    password: '',
    employeeId: '',
    role: UserRole.EMPLOYEE
  });
  
  // Check if current user can register new users
  const canRegisterUsers = currentUser?.role === UserRole.SUPER_ADMIN;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRoleChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      role: value as UserRole
    }));
  };

  const registerUserMutation = useMutation({
    mutationFn: (userData: Omit<RegisterFormData, 'confirmPassword'>) => 
      userService.createUser(userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('User registered successfully');
      setIsRegisterDialogOpen(false);
      setFormData({
        name: '',
        email: '',
        password: '',
        employeeId: '',
        role: UserRole.EMPLOYEE
      });
    },
    onError: (error: Error) => {
      toast.error(`Failed to register user: ${error.message}`);
    }
  });

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['admin-users'],
    queryFn: userService.getAllUsers,
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string, role: UserRole }) => 
      userService.updateUserRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('User role updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update user role: ${error.message}`);
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => userService.deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('User deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete user: ${error.message}`);
    }
  });

  if (isLoading) return <LoadingGif text="Loading users..." />;

  return (
    <div className="space-y-6">
      {!canRegisterUsers && (
        <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-800">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to manage users. Only Super Admins can access this section.
          </AlertDescription>
        </Alert>
      )}
      
      {canRegisterUsers && (
        <div className="flex justify-end mb-4">
          <Dialog open={isRegisterDialogOpen} onOpenChange={setIsRegisterDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                Register New User
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Register New User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-foreground">Full Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="John Doe"
                  className="border-input bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-foreground">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="john@example.com"
                  className="border-input bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-foreground">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="••••••••"
                  className="border-input bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="employeeId" className="text-sm font-medium text-foreground">Employee ID</Label>
                <Input
                  id="employeeId"
                  name="employeeId"
                  value={formData.employeeId}
                  onChange={handleInputChange}
                  placeholder="EMP-123"
                  className="border-input bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role" className="text-sm font-medium text-foreground">Role</Label>
                <Select 
                  value={formData.role} 
                  onValueChange={handleRoleChange}
                >
                  <SelectTrigger className="border-input bg-background">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(UserRole)
                      .filter(([_, role]) => canCreateUser(UserRole.SUPER_ADMIN, role as UserRole))
                      .map(([key, value]) => (
                        <SelectItem key={value} value={value}>
                          {key.split('_').map(word => 
                            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                          ).join(' ')}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setIsRegisterDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={() => registerUserMutation.mutate(formData)}
                  disabled={registerUserMutation.isPending}
                >
                  {registerUserMutation.isPending ? 'Registering...' : 'Register User'}
                </Button>
              </div>
            </div>
          </DialogContent>
          </Dialog>
        </div>
      )}
      
      {canRegisterUsers && (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table className="divide-y divide-border">
        <TableHeader className="bg-muted/50">
          <TableRow className="hover:bg-transparent">
            <TableHead className="font-medium text-foreground">Name</TableHead>
            <TableHead className="text-foreground">Email</TableHead>
            <TableHead className="text-foreground">Role</TableHead>
            <TableHead className="text-foreground">Status</TableHead>
            <TableHead className="text-right text-foreground">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id} className="hover:bg-muted/50 transition-colors">
              <TableCell className="font-medium text-foreground">{user.name}</TableCell>
              <TableCell className="text-muted-foreground">{user.email}</TableCell>
              <TableCell>
                <select
                  className="bg-background border border-input rounded-md p-2 text-sm text-foreground w-full max-w-[180px] focus:ring-2 focus:ring-primary/50 focus:outline-none"
                  value={user.role}
                  onChange={(e) => 
                    updateRoleMutation.mutate({ 
                      userId: user.id, 
                      role: e.target.value as UserRole 
                    })
                  }
                >
                  {Object.entries(UserRole).map(([key, value]) => (
                    <option key={value} value={value}>
                      {key.split('_').map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                      ).join(' ')}
                    </option>
                  ))}
                </select>
              </TableCell>
              <TableCell>
                <span className="px-2.5 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                  Active
                </span>
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteUserMutation.mutate(user.id)}
                  disabled={deleteUserMutation.isPending}
                  className="bg-destructive/90 hover:bg-destructive text-destructive-foreground"
                >
                  {deleteUserMutation.isPending ? 'Deleting...' : 'Delete'}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};
