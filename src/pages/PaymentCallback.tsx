import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function PaymentCallback() {
  const location = useLocation();
  const navigate = useNavigate();

  const searchParams = new URLSearchParams(location.search);
  const status = searchParams.get("status");

  const isSuccess = !status || status.toLowerCase() === "success";
  const isCancelled = status && status.toLowerCase() === "cancelled";

  useEffect(() => {
    const timeout = setTimeout(() => {
      navigate("/dashboard");
    }, 4000);

    return () => clearTimeout(timeout);
  }, [navigate]);

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="space-y-3">
          <div className="mx-auto h-16 w-16 rounded-full flex items-center justify-center bg-primary/10">
            {isCancelled ? (
              <XCircle className="h-10 w-10 text-destructive" />
            ) : (
              <CheckCircle className="h-10 w-10 text-primary" />
            )}
          </div>
          <CardTitle className="text-2xl font-display">
            {isCancelled ? "Payment Cancelled" : "Payment Processing"}
          </CardTitle>
          <CardDescription>
            {isCancelled
              ? "You cancelled the payment. You can try upgrading again from your dashboard."
              : "If your payment was successful, your Premium Lifter plan will be activated shortly."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isCancelled && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Checking your subscription and redirecting to your dashboard…</span>
            </div>
          )}
          <Button className="w-full" onClick={() => navigate("/dashboard")}>
            Go to Dashboard
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}

