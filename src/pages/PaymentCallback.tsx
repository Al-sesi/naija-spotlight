import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle, XCircle, ArrowRight, Crown, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";

function PaymentCallback() {
  const [searchParams] = useSearchParams();
  const reference = searchParams.get("reference") || searchParams.get("trxref");
  const cancelled = searchParams.get("cancelled") !== null;

  const [status, setStatus] = useState<"verifying" | "success" | "failed" | "cancelled">(
    cancelled ? "cancelled" : "verifying"
  );
  const [errorMsg, setErrorMsg] = useState<string>("");

  const { data: subscription, refetch: refetchSubscription } = useSubscription();

  useEffect(() => {
    const title = "Payment " + (cancelled ? "Cancelled" : "Processing") + " | NAIJALIFT";
    document.title = title;

    if (cancelled) return;

    let attempts = 0;
    const maxAttempts = 12;

    const verifyAndPoll = async () => {
      attempts++;

      await refetchSubscription();

      if (
        subscription?.subscription_status === "active" ||
        (subscription?.trial_ends_at && new Date(subscription.trial_ends_at) > new Date())
      ) {
        setStatus("success");
        return;
      }

      if (attempts < maxAttempts) {
        setTimeout(verifyAndPoll, 2500);
      } else {
        setStatus("failed");
        setErrorMsg("We couldn't confirm your payment right now. Please wait a minute and refresh, or check your dashboard — if the payment went through, your premium access will activate shortly.");
      }
    };

    verifyAndPoll();
  }, [cancelled, reference]);

  const handleRetry = () => {
    setStatus("verifying");
    setErrorMsg("");
    window.location.reload();
  };

  const isPremiumActive =
    !!subscription &&
    (subscription.subscription_status === "active" ||
      (!!subscription.trial_ends_at && new Date(subscription.trial_ends_at) > new Date()));

  if (status === "success" || isPremiumActive) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-4">
        <section className="w-full max-w-md text-center space-y-6">
          <div className="mx-auto h-24 w-24 rounded-full bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-900/30 dark:to-amber-800/20 flex items-center justify-center animate-in zoom-in duration-500">
            <Crown className="h-14 w-14 text-amber-500" strokeWidth={1.5} aria-hidden="true" />
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
              Welcome to Premium Lifter! 🎉
            </h1>
            <p className="text-muted-foreground text-base md:text-lg px-4">
              Your payment was successful and your premium features are now active.
              Enjoy the verified badge, SMS alerts, and early access to opportunities.
            </p>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="w-full sm:w-auto font-semibold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg shadow-amber-500/30">
              <Link to="/dashboard">
                <Crown className="mr-2 h-4 w-4" />
                Go to Dashboard
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
              <Link to="/opportunities">
                <ArrowRight className="mr-2 h-4 w-4" />
                Browse Opportunities
              </Link>
            </Button>
          </div>
        </section>
      </main>
    );
  }

  if (status === "cancelled") {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-4">
        <section className="w-full max-w-md text-center space-y-6">
          <div className="mx-auto h-24 w-24 rounded-full bg-muted flex items-center justify-center animate-in zoom-in duration-500">
            <XCircle className="h-14 w-14 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
              Payment Cancelled
            </h1>
            <p className="text-muted-foreground text-base md:text-lg px-4">
              No charges were made to your account. You can try upgrading to Premium again whenever you're ready.
            </p>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="w-full sm:w-auto font-semibold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg shadow-amber-500/30">
              <Link to="/dashboard?tab=billing">
                <Crown className="mr-2 h-4 w-4" />
                Try Upgrading Again
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
              <Link to="/">
                <ArrowRight className="mr-2 h-4 w-4" />
                Back to Home
              </Link>
            </Button>
          </div>
        </section>
      </main>
    );
  }

  if (status === "failed") {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-4">
        <section className="w-full max-w-md text-center space-y-6">
          <div className="mx-auto h-24 w-24 rounded-full bg-yellow-500/10 flex items-center justify-center animate-in zoom-in duration-500">
            <XCircle className="h-14 w-14 text-yellow-600" strokeWidth={1.5} aria-hidden="true" />
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
              Payment Confirmation Pending
            </h1>
            <p className="text-muted-foreground text-base md:text-lg px-4">
              {errorMsg}
            </p>
            {reference && (
              <p className="text-xs text-muted-foreground">
                Reference: <code className="bg-muted px-2 py-1 rounded">{reference}</code>
              </p>
            )}
          </div>

          <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" onClick={handleRetry} className="w-full sm:w-auto font-semibold">
              <RefreshCw className="mr-2 h-4 w-4" />
              Check Again
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
              <Link to="/dashboard?tab=billing">
                <ArrowRight className="mr-2 h-4 w-4" />
                Go to Billing
              </Link>
            </Button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4">
      <section className="w-full max-w-md text-center space-y-6">
        <div className="mx-auto h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center">
          <Loader2 className="h-14 w-14 text-primary animate-spin" strokeWidth={1.5} aria-hidden="true" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
            Confirming Your Payment
          </h1>
          <p className="text-muted-foreground text-base md:text-lg px-4">
            Please wait a moment while we verify your payment and activate your premium benefits...
          </p>
        </div>

        {reference && (
          <p className="text-xs text-muted-foreground">
            Reference: <code className="bg-muted px-2 py-1 rounded">{reference}</code>
          </p>
        )}
      </section>
    </main>
  );
}

export default PaymentCallback;
