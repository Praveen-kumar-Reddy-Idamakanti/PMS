import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userService } from "../../../services/user.service";
import { toast } from "sonner";
import { User, UserRole } from "@/types/user";
import { LoadingGif } from "@/components/ui/LoadingGif";

export const UserManagement = () => {
  const queryClient = useQueryClient();

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
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">{user.name}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                <select
                  className="bg-background border rounded p-1 text-sm"
                  value={user.role}
                  onChange={(e) => 
                    updateRoleMutation.mutate({ 
                      userId: user.id, 
                      role: e.target.value as UserRole 
                    })
                  }
                >
                  {Object.values(UserRole).map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </TableCell>
              <TableCell>
                <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                  Active
                </span>
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteUserMutation.mutate(user.id)}
                  disabled={deleteUserMutation.isPending}
                >
                  {deleteUserMutation.isPending ? 'Deleting...' : 'Delete'}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
