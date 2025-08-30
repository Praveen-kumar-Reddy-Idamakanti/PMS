import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LogIn, Mail, Lock, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Dynamic schema based on login type
const createLoginSchema = (loginType: 'email' | 'employeeId') => 
  z.object({
    email: loginType === 'email' 
      ? z.string().min(1, "Email is required").email("Invalid email address")
      : z.string().optional(),
    employeeId: loginType === 'employeeId'
      ? z.string().min(1, "Employee ID is required")
      : z.string().optional(),
    password: z.string().min(6, "Password must be at least 6 characters"),
  });

type LoginFormData = z.infer<ReturnType<typeof createLoginSchema>>;

interface LoginFormProps {
  onLogin: (data: LoginFormData) => void;
  isLoading?: boolean;
}

export function LoginForm({ onLogin, isLoading = false }: LoginFormProps) {
  const [loginType, setLoginType] = useState<'email' | 'employeeId'>('email');
  
  // Reset the corresponding field when switching login types
  const switchLoginType = (type: 'email' | 'employeeId') => {
    setLoginType(type);
    // Reset the other field when switching types
    if (type === 'email') {
      form.setValue('employeeId', '');
    } else {
      form.setValue('email', '');
    }
  };
  const { toast } = useToast();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(createLoginSchema(loginType)),
    mode: 'onTouched',
    reValidateMode: 'onChange',
    defaultValues: {
      email: '',
      employeeId: '',
      password: ''
    },
    criteriaMode: 'firstError',
    shouldFocusError: true,
  });

  // Update validation schema when login type changes
  useEffect(() => {
    // Clear all errors and reset fields without triggering validation
    form.clearErrors();
    form.reset({
      email: '',
      employeeId: '',
      password: form.getValues('password') // Keep the password if it was entered
    });
    
    // Update the resolver with the new schema
    const { resolver } = form.control._options;
    form.control._options.resolver = zodResolver(createLoginSchema(loginType));
    
    // Force re-register fields to apply new validation
    form.register('email');
    form.register('employeeId');
    form.register('password');
  }, [loginType]);

  const { register, handleSubmit, formState: { errors } } = form;

  const onSubmit = (data: LoginFormData) => {
    console.log('Form submitted with data:', data);
    
    // Ensure we're only sending one identifier
    const loginData = { ...data };
    if (loginType === 'email') {
      delete loginData.employeeId;
    } else {
      delete loginData.email;
    }
    
    console.log('Sending login data:', loginData);
    onLogin(loginData);
  };

  return (
    <Card className="w-full max-w-md shadow-medium">
      <CardHeader className="space-y-4 text-center">
        <div className="mx-auto w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
          <LogIn className="w-6 h-6 text-primary-foreground" />
        </div>
        <div>
          <CardTitle className="text-2xl font-bold text-foreground">
            Welcome Back
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Sign in to your attendance dashboard
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Login Type Toggle */}
        <div className="flex space-x-2 p-1 bg-muted rounded-lg">
          <Button
            type="button"
            variant={loginType === 'email' ? 'default' : 'ghost'}
            size="sm"
            className="flex-1"
            onClick={() => switchLoginType('email')}
          >
            <Mail className="w-4 h-4 mr-2" />
            Email
          </Button>
          <Button
            type="button"
            variant={loginType === 'employeeId' ? 'default' : 'ghost'}
            size="sm"
            className="flex-1"
            onClick={() => switchLoginType('employeeId')}
          >
            <User className="w-4 h-4 mr-2" />
            Employee ID
          </Button>
        </div>

        <form onSubmit={handleSubmit(onSubmit, (errors) => {
          console.log('Form validation errors:', errors);
          toast({
            variant: "destructive",
            title: "Validation Error",
            description: "Please check the form for errors.",
          });
        })} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="identifier">
              {loginType === 'email' ? 'Email Address' : 'Employee ID'}
            </Label>
            {loginType === 'email' ? (
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                </div>
                <Input
                  id="email"
                  type="email"
                  placeholder="john.doe@company.com"
                  className="pl-9"
                  {...register("email")}
                />
                {errors.email && (
                  <Alert variant="destructive" className="mt-1">
                    <AlertDescription>{errors.email.message}</AlertDescription>
                  </Alert>
                )}
              </div>
            ) : (
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
                <Input
                  id="employeeId"
                  type="text"
                  placeholder="EMP001"
                  className="pl-9"
                  {...register("employeeId")}
                />
                {errors.employeeId && (
                  <Alert variant="destructive" className="mt-1">
                    <AlertDescription>{errors.employeeId.message}</AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-4 w-4 text-muted-foreground" />
              </div>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                className="pl-9"
                {...register("password")}
              />
            </div>
            {errors.password && (
              <Alert variant="destructive">
                <AlertDescription>{errors.password.message}</AlertDescription>
              </Alert>
            )}
          </div>

          <Button
            type="submit"
            variant="hero"
            className="w-full"
            disabled={isLoading}
            size="lg"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Signing In...
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4 mr-2" />
                Sign In
              </>
            )}
          </Button>
        </form>

        <div className="text-center text-sm text-muted-foreground">
          Having trouble? Contact your system administrator
        </div>
      </CardContent>
    </Card>
  );
}