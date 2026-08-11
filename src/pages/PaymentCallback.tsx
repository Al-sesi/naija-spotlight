import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle, XCircle, ArrowRight, Crown, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription, SubscriptionData } from "@/hooks/useSubscription";
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
    if (!user) {
      // No user yet (hydrating) — abort; when user is loaded, the effect will
      // re-fire because user?.id is a dep.
      return;
    }

    let cancelled_ = false;
    let attempts = 0;
    const maxPollAttempts = 20;
    const pollIntervalMs = 1500;

    const buildActiveSubscriptionFromVerify = (
      verifyResult: VerifyResult
    ): SubscriptionData => {
      const now = new Date();
      const end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      return {
        subscription_status: "active",
        plan_type: verifyResult.plan_type || "premium_lifter",
        subscription_started_at: verifyResult.paid_at || now.toISOString(),
        subscription_ends_at: end.toISOString(),
        paystack_subscription_code: verifyResult.subscription_code || null,
        premium_categories: [],
        trial_ends_at: null,
        verification_trial_ends_at: null,
      };
    };

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

    const fetchSubscriptionFresh = async (): Promise<SubscriptionData | null> => {
      // Bypass React Query cache, hit Supabase directly to avoid stale data.
      if (!user) return null;
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select(
            "subscription_status, plan_type, trial_ends_at, subscription_started_at, subscription_ends_at, paystack_subscription_code, premium_categories, verification_trial_ends_at"
          )
          .eq("id", user.id)
          .single();
        if (error || !data) return null;
        const fresh: SubscriptionData = {
          subscription_status: data.subscription_status,
          plan_type: data.plan_type,
          trial_ends_at: data.trial_ends_at,
          subscription_started_at: data.subscription_started_at,
          subscription_ends_at: data.subscription_ends_at,
          paystack_subscription_code: data.paystack_subscription_code,
          premium_categories: (data as any).premium_categories ?? [],
          verification_trial_ends_at: (data as any).verification_trial_ends_at ?? null,
        };
        // Immediately write to React Query cache so useIsPremium / Billing
        // / Dashboard see the change WITHOUT having to wait for a refetch.
        queryClient.setQueryData(["subscription", user.id], fresh);
        return fresh;
      } catch (e) {
        console.error("fetchSubscriptionFresh error:", e);
        return null;
      }
    };

    const markSuccessful = async (verifyResult?: VerifyResult) => {
      if (cancelled_) return;
      // If we have the verify result, write an optimistic "active" subscription
      // object into React Query cache immediately so the entire app reflects
      // premium status right now — no waiting for any DB read.
      if (verifyResult) {
        const optimistic = buildActiveSubscriptionFromVerify(verifyResult);
        queryClient.setQueryData(["subscription", user!.id], optimistic);
      }
      // Always follow up with an actual DB read to guarantee truth.
      await queryClient.invalidateQueries({ queryKey: ["subscription"] });
      await refetchSubscription();
      await fetchSubscriptionFresh();
      setStatus("success");
      toast.success("Premium activated! 🎉", {
        description: "Your payment was confirmed. Enjoy your premium benefits.",
      });
    };

    const runFlow = async () => {
      // Step 1: Primary activation path — call paystack-verify-transaction
      const verifyResult = await verifyTransaction();

      if (verifyResult && verifyResult.activated) {
        // Activation success on first try — mark immediately
        await markSuccessful(verifyResult);
        return;
      }

      // Edge cases (not activated yet):
      if (verifyResult) {
        if (verifyResult.verified && !verifyResult.activated) {
          setErrorMsg(
            verifyResult.error ||
              "Your payment was confirmed by Paystack. We're activating your premium access right now — this usually takes a few seconds."
          );
        } else if (verifyResult.error && !verifyResult.verified) {
          setErrorMsg(
            verifyResult.error ||
              "We're still confirming your payment with Paystack. Please wait — most payments settle in under 30 seconds."
          );
        }
      }

      // Step 2: Polling fallback (up to ~30s at 1.5s intervals)
      // Even if primary verify says "not yet", a parallel webhook may activate
      // the user at any time, so we re-read the profiles row directly each poll.
      const pollAndCheck = async () => {
        if (cancelled_) return;
        attempts++;
        const fresh = await fetchSubscriptionFresh();
        if (fresh && fresh.subscription_status === "active") {
          await markSuccessful();
          return;
        }
        // Retry verify every 3rd poll — Paystack's settlement can lag by a few seconds
        if (attempts % 3 === 0) {
          const retry = await verifyTransaction();
          if (retry && retry.activated) {
            await markSuccessful(retry);
            return;
          }
        }
        if (attempts < maxPollAttempts) {
          setTimeout(pollAndCheck, pollIntervalMs);
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
              Enjoy the verified badge, early access to opportunities, and unlimited applications.
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
