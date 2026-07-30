import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle, XCircle, ArrowRight, Crown, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

type VerifyResult = {
  verified: boolean;
  reference?: string;
  amount?: number;
  currency?: string;
  channel?: string;
  paid_at?: string;
  subscription_code?: string | null;
  customer_code?: string | null;
  plan_type?: string | null;
  error?: string;
  activated?: boolean;
  already_active?: boolean;
};

function PaymentCallback() {
  const [searchParams] = useSearchParams();
  const reference = searchParams.get("reference") || searchParams.get("trxref");
  const cancelled = searchParams.get("cancelled") !== null;

  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [status, setStatus] = useState<"verifying" | "success" | "failed" | "cancelled">(
    cancelled ? "cancelled" : "verifying"
  );
  const [errorMsg, setErrorMsg] = useState<string>("");

  const { data: subscription, refetch: refetchSubscription } = useSubscription();

  useEffect(() => {
    const title = "Payment " + (cancelled ? "Cancelled" : "Processing") + " | NAIJALIFT";
    document.title = title;

    if (cancelled) return;
    if (!reference) {
      setStatus("failed");
      setErrorMsg("No payment reference found in the URL. Please visit your dashboard to confirm your subscription status, or contact support if you believe this is a mistake.");
      return;
    }

    let cancelled_ = false;
    let attempts = 0;
    const maxPollAttempts = 8;

    const verifyTransaction = async (): Promise<VerifyResult | null> => {
      if (!user) return null;
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return null;
      try {
        const response = await supabase.functions.invoke("paystack-verify-transaction", {
          body: { reference },
          headers: {
            "x-access-token": session.access_token,
          },
        });
        if (response.error) {
          console.error("verify-transaction invocation error:", response.error);
          return { verified: false, error: response.error.message || "Verification request failed" };
        }
        return (response.data || { verified: false }) as VerifyResult;
      } catch (err) {
        console.error("verify-transaction exception:", err);
        return { verified: false, error: err instanceof Error ? err.message : "Unexpected verification error" };
      }
    };

    const pollSubscription = async () => {
      attempts++;
      await refetchSubscription();
      // Note: we pull the live value from the refetch via useQuery cache below.
    };

    const runFlow = async () => {
      // Step 1: Primary activation path — call paystack-verify-transaction
      const verifyResult = await verifyTransaction();
      if (verifyResult) {
        // Always invalidate subscription cache after any verify attempt so
        // useSubscription() reflects any server-side changes immediately.
        await queryClient.invalidateQueries({ queryKey: ["subscription"] });
        await refetchSubscription();

        if (verifyResult.activated && !cancelled_) {
          setStatus("success");
          toast.success("Premium activated! 🎉", {
            description: "Your payment was confirmed. Enjoy your premium benefits.",
          });
          return;
        }
        if (verifyResult.verified && !verifyResult.activated && !cancelled_) {
          // Weird edge case: Paystack says success but DB update failed.
          // Show warning, but fall back to polling in case webhook still saves it.
          setErrorMsg(
            verifyResult.error ||
              "Your payment was confirmed by Paystack, but we couldn't activate your subscription immediately. We'll keep trying — please wait while we retry."
          );
        } else if (verifyResult.error && !verifyResult.verified && !cancelled_) {
          // Paystack said "not verified" — likely the transaction is still
          // pending / gateway didn't settle yet. Fallback to polling for the
          // webhook, with a friendlier message.
          setErrorMsg(
            verifyResult.error ||
              "We're still confirming your payment with Paystack. Please wait — most payments settle in under 30 seconds."
          );
        }
      }

      // Step 2: Polling fallback for up to ~20 more seconds for the webhook
      // or eventual-consistency cache to activate the user.
      const pollAndCheck = async () => {
        if (cancelled_) return;
        await pollSubscription();
        // Pull latest value from query cache + subscription hook via refetch closure
        await refetchSubscription();
        if (subscription?.subscription_status === "active") {
          setStatus("success");
          return;
        }
        if (attempts < maxPollAttempts) {
          setTimeout(pollAndCheck, 2500);
        } else {
          setStatus("failed");
          if (!errorMsg) {
            setErrorMsg(
              "We couldn't confirm your payment right now. Please wait a minute and refresh, or check your dashboard — if the payment went through, your premium access will activate shortly. Your reference: " +
                reference
            );
          }
        }
      };

      // First poll check immediately, then schedule repeats.
      await pollAndCheck();
    };

    runFlow();

    return () => {
      cancelled_ = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cancelled, reference, user?.id]);

  const handleRetry = () => {
    setStatus("verifying");
    setErrorMsg("");
    window.location.reload();
  };

  const isPremiumActive =
    !!subscription && subscription.subscription_status === "active";

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
            <CheckCircle className="h-14 w-14 text-yellow-600" strokeWidth={1.5} aria-hidden="true" />
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
            <p className="text-xs text-muted-foreground pt-2">
              If you were already charged, your subscription will activate automatically within a few minutes. You can close this page and visit your Billing tab to check status.
            </p>
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
