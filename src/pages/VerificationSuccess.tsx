import { Link } from "react-router-dom";
import { CheckCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function VerificationSuccess() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mx-auto mb-4">
            <CheckCircle className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl font-display">Email Successfully Verified!</CardTitle>
          <CardDescription className="text-base">
            Welcome to NAIJALIFT! Your 30-day free trial has begun. You now have access to all verified opportunities.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-muted/50 text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">What's included in your trial:</p>
            <ul className="text-left space-y-1">
              <li>✓ Access to verified opportunities</li>
              <li>✓ Save and track applications</li>
              <li>✓ Email & SMS notifications</li>
              <li>✓ Community access</li>
            </ul>
          </div>
          <Link to="/auth">
            <Button className="w-full" size="lg">
              Login Now
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
