import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole, CreateUserDto, canCreateUser } from '@/types/user';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  employeeId: z.string().min(1, 'Employee ID is required'),
  role: z.nativeEnum(UserRole, { message: 'Please select a role' }),
});

interface SignUpFormProps {
  onSuccess?: () => void;
}

export function SignUpForm({ onSuccess }: SignUpFormProps) {
  const { user: currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      employeeId: '',
      role: UserRole.EMPLOYEE,
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!currentUser) return;

    // Check if current user has permission to create this role
    if (!canCreateUser(currentUser.role as UserRole, values.role)) {
      toast({
        title: 'Permission Denied',
        description: 'You do not have permission to create users with this role.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      // Replace with your API call
      // await authService.registerUser(values);
      
      toast({
        title: 'User created successfully',
        description: `${values.name} has been added to the system.`,
      });
      
      form.reset();
      onSuccess?.();
    } catch (error) {
      console.error('Error creating user:', error);
      toast({
        title: 'Error creating user',
        description: 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Get available roles based on current user's permissions
  const availableRoles = Object.values(UserRole).filter(role => 
    canCreateUser(currentUser?.role as UserRole || UserRole.EMPLOYEE, role)
  );

  if (!currentUser) {
    return <div>Please log in to access this page.</div>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                  <Input placeholder="John Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="john@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="employeeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Employee ID</FormLabel>
                <FormControl>
                  <Input placeholder="EMP-123" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="••••••••" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {availableRoles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role.split('_').map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1)
                      ).join(' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create User
          </Button>
        </div>
      </form>
    </Form>
  );
}
