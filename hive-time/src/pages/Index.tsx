import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Clock, 
  Users, 
  Calendar, 
  CheckCircle,
  MapPin,
  BarChart3,
  Shield,
  Smartphone
} from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Clock,
      title: "Smart Attendance",
      description: "Photo & location-verified check-ins with real-time status monitoring",
      color: "text-status-excellent"
    },
    {
      icon: Users,
      title: "Team Management",
      description: "Comprehensive user management with role-based permissions",
      color: "text-brand-cyan"
    },
    {
      icon: Calendar,
      title: "Calendar Integration",
      description: "Monthly calendar with attendance tracking and leave management",
      color: "text-brand-orange"
    },
    {
      icon: BarChart3,
      title: "Analytics Dashboard",
      description: "Real-time insights and attendance analytics for better decisions",
      color: "text-status-warning"
    },
    {
      icon: CheckCircle,
      title: "Task Management",
      description: "Organized task boards with assignment and progress tracking",
      color: "text-brand-teal"
    },
    {
      icon: Shield,
      title: "Secure & Reliable",
      description: "Enterprise-grade security with offline sync capabilities",
      color: "text-brand-pink"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-12">
        <div className="text-center max-w-4xl mx-auto">
          <Badge variant="outline" className="mb-4">
            Project Management & Attendance System
          </Badge>
          
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
            Welcome to{" "}
            <span className="gradient-primary bg-clip-text text-transparent">
              ProjectSync
            </span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Modern project management with intelligent attendance tracking, 
            real-time collaboration, and comprehensive analytics all in one place.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button 
              variant="hero" 
              size="lg"
              onClick={() => navigate('/login')}
              className="text-lg px-8"
            >
              <Clock className="w-5 h-5 mr-2" />
              Get Started
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              className="text-lg px-8"
            >
              <BarChart3 className="w-5 h-5 mr-2" />
              View Demo
            </Button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
            <div className="text-center p-4">
              <div className="text-2xl font-bold text-status-excellent">99.9%</div>
              <div className="text-sm text-muted-foreground">Uptime</div>
            </div>
            <div className="text-center p-4">
              <div className="text-2xl font-bold text-brand-orange">500+</div>
              <div className="text-sm text-muted-foreground">Companies</div>
            </div>
            <div className="text-center p-4">
              <div className="text-2xl font-bold text-brand-cyan">50K+</div>
              <div className="text-sm text-muted-foreground">Users</div>
            </div>
            <div className="text-center p-4">
              <div className="text-2xl font-bold text-brand-teal">24/7</div>
              <div className="text-sm text-muted-foreground">Support</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Everything You Need
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Powerful features designed to streamline your team's productivity and attendance management.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="shadow-medium hover:shadow-strong transition-all duration-300 hover:-translate-y-1">
                <CardHeader>
                  <div className={`w-12 h-12 rounded-lg bg-muted/20 flex items-center justify-center mb-4`}>
                    <Icon className={`w-6 h-6 ${feature.color}`} />
                  </div>
                  <CardTitle className="text-xl font-semibold">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16">
        <Card className="shadow-strong gradient-hero text-white">
          <CardContent className="p-12 text-center">
            <h3 className="text-3xl font-bold mb-4">
              Ready to Transform Your Workplace?
            </h3>
            <p className="text-xl mb-8 opacity-90">
              Join thousands of teams already using ProjectSync to manage their projects and attendance.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                variant="secondary" 
                size="lg"
                onClick={() => navigate('/login')}
                className="text-lg px-8"
              >
                <CheckCircle className="w-5 h-5 mr-2" />
                Start Free Trial
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="text-lg px-8 border-white text-white hover:bg-white hover:text-foreground"
              >
                <Smartphone className="w-5 h-5 mr-2" />
                Download App
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-muted-foreground">
            <p>&copy; 2024 ProjectSync. Built with modern web technologies.</p>
            <div className="mt-2 space-x-4 text-sm">
              <span>Demo Login: any@email.com</span>
              <span>•</span>
              <span>Password: password123</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
