import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { Mail, Lock, User, ArrowRight, Rocket, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const authSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function Auth() {
  const navigate = useNavigate();
  const { signIn, signUp, verifyOtp, resendOtp, user, session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "", fullName: "" });
  const [otp, setOtp] = useState("");
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  
  // Check if user is logged in and email is verified
  const isEmailConfirmed = session?.user?.email_confirmed_at != null;

  useEffect(() => {
    if (user && isEmailConfirmed) {
      navigate("/");
    }
  }, [user, isEmailConfirmed, navigate]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendCooldown > 0) {
      interval = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = authSchema.safeParse(formData);
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    setLoading(true);
    const { error } = await signIn(formData.email, formData.password);
    setLoading(false);

    if (error) {
      console.error("Sign in error:", error);
      toast.error(error.message);
    } else {
      toast.success("Welcome back!");
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = authSchema.safeParse(formData);
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    setLoading(true);
    console.log("Attempting sign up for:", formData.email);
    const { error } = await signUp(formData.email, formData.password, formData.fullName);
    setLoading(false);

    if (error) {
      console.error("Sign up error:", error);
      if (error.message.includes("already registered")) {
        toast.error("This email is already registered. Please sign in instead.");
      } else {
        toast.error(error.message);
      }
    } else {
      console.log("Sign up successful, showing OTP input");
      setShowOtpInput(true);
      toast.success("Please check your email for the OTP verification code!");
      setResendCooldown(60); // Start cooldown
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) {
      toast.error("Please enter a valid 6-digit OTP");
      return;
    }

    setLoading(true);
    const { error } = await verifyOtp(formData.email, otp, 'signup');
    setLoading(false);

    if (error) {
      console.error("OTP verification error:", error);
      toast.error(error.message);
    } else {
      toast.success("Email verified successfully!");
      navigate("/");
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    
    setLoading(true);
    const { error } = await resendOtp(formData.email);
    setLoading(false);

    if (error) {
      console.error("Resend OTP error:", error);
      toast.error(error.message);
    } else {
      toast.success("Verification code resent! Please check your email.");
      setResendCooldown(60);
    }
  };

  // If waiting for OTP
  if (showOtpInput) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary mx-auto mb-4">
              <CheckCircle className="h-6 w-6 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl font-display">Enter Verification Code</CardTitle>
            <CardDescription>
              We've sent a 6-digit code to <strong>{formData.email}</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">Verification Code</Label>
                <Input
                  id="otp"
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  maxLength={6}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Verifying..." : "Verify Email"}
              </Button>
            </form>
            <div className="text-center">
              <Button 
                variant="link" 
                onClick={handleResendOtp} 
                disabled={loading || resendCooldown > 0}
                className="text-sm text-muted-foreground"
              >
                {resendCooldown > 0 
                  ? `Resend code in ${resendCooldown}s` 
                  : "Didn't receive code? Resend"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary mx-auto mb-4">
            <Rocket className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-display">Welcome to NAIJALIFT</CardTitle>
          <CardDescription>Sign in to save and track opportunities</CardDescription>
        </CardHeader>
        <CardContent>
          {showVerificationMessage && (
            <Alert className="mb-4 bg-primary/10 border-primary">
              <AlertCircle className="h-4 w-4 text-primary" />
              <AlertDescription className="text-sm">
                Check your email for a verification link from NAIJALIFT. You must verify your email before you can apply.
              </AlertDescription>
            </Alert>
          )}
          
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="signin" className="text-sm">Sign In</TabsTrigger>
              <TabsTrigger value="signup" className="text-sm">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email" className="text-sm">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="you@example.com"
                      className="pl-10 text-sm"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password" className="text-sm">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="••••••••"
                      className="pl-10 text-sm"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in..." : "Sign In"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name" className="text-sm">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="John Doe"
                      className="pl-10 text-sm"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-sm">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="you@example.com"
                      className="pl-10 text-sm"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-sm">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      className="pl-10 text-sm"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Creating account..." : "Create Account"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}