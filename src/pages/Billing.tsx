import { useEffect } from "react";
import { Link } from "react-router-dom";
import { CreditCard, ArrowLeft, Crown, Sparkles, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BillingSettings } from "@/components/dashboard/BillingSettings";
import { useIsPremium } from "@/hooks/useSubscription";
import { FREE_MONTHLY_APPLICATIONS } from "@/hooks/useMonthlyQuota";

export default function Billing() {
  const { isPremium, isLoading } = useIsPremium();

  useEffect(() => {
    const title = "Billing & Subscription | NAIJALIFT";
    const description =
      "Manage your NAIJALIFT subscription, upgrade to Premium Lifter, view your billing history, and cancel anytime.";

    document.title = title;

    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", description);

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = "https://naijalift.space/billing";
  }, []);

  return (
    <div className="container px-4 sm:px-6 py-6 sm:py-10 max-w-5xl mx-auto">
      {/* Back + Page Title */}
      <div className="mb-8 space-y-5">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="gap-1.5 -ml-2 h-8">
            <Link to="/dashboard">
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">Back to Dashboard</span>
            </Link>
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                isPremium
                  ? "bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-900/40 dark:to-amber-800/20 border border-amber-200/60 dark:border-amber-700/40"
                  : "bg-primary/10 border border-primary/20"
              }`}>
                <CreditCard className={`h-5 w-5 ${
                  isPremium ? "text-amber-500" : "text-primary"
                }`} />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">
                  Billing & Subscription
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground">
                  Manage your plan, upgrade to Premium, or update your payment details
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {isLoading ? null : isPremium ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-100 to-amber-50 dark:from-amber-900/40 dark:to-amber-800/20 border border-amber-200/60 dark:border-amber-700/40">
                <Crown className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-xs sm:text-sm font-semibold text-amber-700 dark:text-amber-300">
                  Premium Lifter
                </span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted border border-border/80">
                <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs sm:text-sm font-medium text-muted-foreground">
                  Free Plan • {FREE_MONTHLY_APPLICATIONS} applies/mo
                </span>
              </div>
            )}
            <div className="hidden sm:block text-xs text-muted-foreground">
              Secure payments by <span className="font-semibold text-foreground">Paystack</span>
            </div>
          </div>
        </div>
      </div>

      {/* Billing Settings Component */}
      <BillingSettings />

      {/* Bottom Help Section */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="p-5 rounded-xl border border-border/70 bg-card/50">
          <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            What's in Premium Lifter?
          </h3>
          <ul className="text-sm text-muted-foreground space-y-1.5">
            <li className="flex items-start gap-2"><Check className="h-3.5 w-3.5 mt-0.5 text-primary" /> Unlimited applications every month</li>
            <li className="flex items-start gap-2"><Check className="h-3.5 w-3.5 mt-0.5 text-primary" /> Verified badge on your profile</li>
            <li className="flex items-start gap-2"><Check className="h-3.5 w-3.5 mt-0.5 text-primary" /> SMS alerts for new opportunities</li>
            <li className="flex items-start gap-2"><Check className="h-3.5 w-3.5 mt-0.5 text-primary" /> Early access before free users</li>
            <li className="flex items-start gap-2"><Check className="h-3.5 w-3.5 mt-0.5 text-primary" /> Priority support & onboarding help</li>
            <li className="flex items-start gap-2"><Check className="h-3.5 w-3.5 mt-0.5 text-primary" /> Unlimited saves to your dashboard</li>
            <li className="pt-2 text-foreground font-medium">💰 From ₦430/month</li>
          </ul>
        </div>
        <div className="p-5 rounded-xl border border-border/70 bg-card/50">
          <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" />
            Billing Questions?
          </h3>
          <ul className="text-sm text-muted-foreground space-y-1.5">
            <li>• 🔒 Payment secured by Paystack (PCI DSS compliant)</li>
            <li>• 🇳🇬 All charges in Naira (NGN)</li>
            <li>• 📅 Billed monthly. Cancel anytime.</li>
            <li>• 🆓 Browse opportunities always free. Apply to {FREE_MONTHLY_APPLICATIONS}/mo without a subscription.</li>
            <li>• 📧 Receipt sent to your email after each successful charge.</li>
          </ul>
        </div>
      </div>

      <div className="mt-8 text-center">
        <p className="text-xs text-muted-foreground">
          Need help? Contact us at{" "}
          <a href="mailto:support@naijalift.space" className="underline hover:text-foreground transition-colors">
            support@naijalift.space
          </a>
        </p>
      </div>
    </div>
  );
}
