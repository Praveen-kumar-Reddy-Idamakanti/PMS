import { useState } from "react";
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

const loginSchema = z.object({
  identifier: z.string().min(1, "Employee ID or email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onLogin: (data: LoginFormData) => void;
  isLoading?: boolean;
}

export function LoginForm({ onLogin, isLoading = false }: LoginFormProps) {
  const [loginType, setLoginType] = useState<'email' | 'employeeId'>('email');
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data: LoginFormData) => {
    onLogin(data);
    toast({
      title: "Logging in...",
      description: "Please wait while we verify your credentials.",
    });
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
            onClick={() => setLoginType('email')}
          >
            <Mail className="w-4 h-4 mr-2" />
            Email
          </Button>
          <Button
            type="button"
            variant={loginType === 'employeeId' ? 'default' : 'ghost'}
            size="sm"
            className="flex-1"
            onClick={() => setLoginType('employeeId')}
          >
            <User className="w-4 h-4 mr-2" />
            Employee ID
          </Button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="identifier">
              {loginType === 'email' ? 'Email Address' : 'Employee ID'}
            </Label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                {loginType === 'email' ? (
                  <Mail className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <User className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <Input
                id="identifier"
                type={loginType === 'email' ? 'email' : 'text'}
                placeholder={
                  loginType === 'email' 
                    ? 'john.doe@company.com' 
                    : 'EMP001'
                }
                className="pl-9"
                {...register("identifier")}
              />
            </div>
            {errors.identifier && (
              <Alert variant="destructive">
                <AlertDescription>{errors.identifier.message}</AlertDescription>
              </Alert>
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