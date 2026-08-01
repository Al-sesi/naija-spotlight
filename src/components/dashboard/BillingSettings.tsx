import { useState } from "react";
import { format } from "date-fns";
import {
  Crown,
  CreditCard,
  Calendar,
  AlertCircle,
  CheckCircle,
  XCircle,
  Sparkles,
  Check,
  RefreshCw,
  Wand2,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  useSubscription,
  useInitializePayment,
  useCancelSubscription,
  useIsPremium,
} from "@/hooks/useSubscription";
import { useMonthlyQuota, FREE_MONTHLY_APPLICATIONS } from "@/hooks/useMonthlyQuota";
import { UpgradeModal } from "@/components/subscription/UpgradeModal";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export function BillingSettings() {
  const { data: subscription, isLoading, refetch: refetchSubscription } = useSubscription();
  const { isPremium } = useIsPremium();
  const { data: quota } = useMonthlyQuota();
  const initializePayment = useInitializePayment();
  const cancelSubscription = useCancelSubscription();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showRefetch, setShowRefetch] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyReference, setVerifyReference] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState<{ kind: "success" | "error" | "info"; text: string } | null>(null);

  const handleRefresh = async () => {
    setShowRefetch(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ["subscription"] });
      await refetchSubscription();
      toast.success("Subscription status refreshed", {
        description: "Your latest subscription state has been loaded.",
      });
    } finally {
      setShowRefetch(false);
    }
  };

  const handleManualVerify = async () => {
    const ref = verifyReference.trim();
    if (!ref) {
      setVerifyMessage({ kind: "error", text: "Please enter your Paystack payment reference." });
      return;
    }
    setVerifyLoading(true);
    setVerifyMessage(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("You must be signed in.");
      const response = await supabase.functions.invoke("paystack-verify-transaction", {
        body: { reference: ref },
        headers: {
          "x-access-token": session.access_token,
        },
      });
      if (response.error) throw new Error(response.error.message || "Verification failed");
      const result = (response.data || {}) as {
        verified?: boolean;
        activated?: boolean;
        already_active?: boolean;
        error?: string;
      };
      await queryClient.invalidateQueries({ queryKey: ["subscription"] });
      await refetchSubscription();

      if (result.already_active) {
        setVerifyMessage({
          kind: "success",
          text: "Your subscription is already active. Enjoy the premium benefits!",
        });
      } else if (result.activated) {
        setVerifyMessage({
          kind: "success",
          text: "Payment confirmed! 🎉 Your premium benefits are now active.",
        });
        toast.success("Premium activated!", {
          description: "Your payment was confirmed and your benefits are live.",
        });
        setTimeout(() => setVerifyOpen(false), 1800);
      } else if (result.verified && !result.activated) {
        setVerifyMessage({
          kind: "info",
          text:
            result.error ||
            "Paystack confirmed your payment, but we couldn't apply the activation yet. Please wait 1-2 minutes and refresh — it usually resolves automatically.",
        });
      } else {
        setVerifyMessage({
          kind: "error",
          text:
            result.error ||
            "We couldn't verify this reference yet. If you just paid, wait a moment and try again — some gateways take a few seconds to confirm. If the payment actually went through, your subscription will activate automatically.",
        });
      }
    } catch (err) {
      setVerifyMessage({
        kind: "error",
        text: err instanceof Error ? err.message : "Something went wrong during verification.",
      });
    } finally {
      setVerifyLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/3" />
            <div className="h-20 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = () => {
    if (!subscription) return null;

    const status = subscription.subscription_status;

    switch (status) {
      case "active":
        return (
          <Badge className="bg-green-500/10 text-green-600 border-green-500/30 gap-1">
            <CheckCircle className="h-3 w-3" />
            Active
          </Badge>
        );
      case "cancelled":
        return (
          <Badge className="bg-red-500/10 text-red-600 border-red-500/30 gap-1">
            <XCircle className="h-3 w-3" />
            Cancelled
          </Badge>
        );
      case "past_due":
        return (
          <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30 gap-1">
            <AlertCircle className="h-3 w-3" />
            Past Due
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="gap-1">
            <Sparkles className="h-3 w-3" />
            Free Plan
          </Badge>
        );
    }
  };

  const categoriesCount = subscription?.premium_categories?.length ?? 0;
  const billedCategories = categoriesCount > 0 ? categoriesCount : 1;
  const pricePerCategory = 530;
  const totalPrice = billedCategories * pricePerCategory;

  const showActivateHelp =
    subscription &&
    subscription.subscription_status !== "active";

  return (
    <div className="space-y-6 max-w-full">
      {/* Current Plan */}
      <Card
        className={
          isPremium
            ? "border-amber-500/30 bg-gradient-to-br from-amber-50/50 to-transparent dark:from-amber-950/20 max-w-full"
            : "max-w-full"
        }
      >
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Crown
                className={`h-5 w-5 ${isPremium ? "text-amber-500" : "text-muted-foreground"}`}
              />
              <CardTitle>Current Plan</CardTitle>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {getStatusBadge()}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={showRefetch}
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 mr-1.5 ${showRefetch ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
              {showActivateHelp && (
                <Dialog open={verifyOpen} onOpenChange={(o) => {
                  setVerifyOpen(o);
                  if (!o) {
                    setVerifyReference("");
                    setVerifyMessage(null);
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button type="button" variant="secondary" size="sm" className="gap-1.5">
                      <Wand2 className="h-3.5 w-3.5" />
                      I already paid
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Activate your paid subscription</DialogTitle>
                      <DialogDescription>
                        If you paid via Paystack but your plan is still showing Free/Past Due, enter
                        your payment reference below. We'll confirm it immediately and activate your
                        benefits. You can find the reference in your payment confirmation email from
                        Paystack, or in your bank/alert narration as <code>REF: xxx</code>.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 pt-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="paystack-reference">Paystack Reference</Label>
                        <Input
                          id="paystack-reference"
                          placeholder="e.g. y90g7q641v or pay_xxx..."
                          value={verifyReference}
                          onChange={(e) => setVerifyReference(e.target.value)}
                          autoCapitalize="none"
                          autoCorrect="off"
                        />
                      </div>
                      {verifyMessage && (
                        <div
                          className={
                            "text-sm rounded-md px-3 py-2 border " +
                            (verifyMessage.kind === "success"
                              ? "bg-green-500/5 border-green-500/20 text-green-700 dark:text-green-400"
                              : verifyMessage.kind === "error"
                                ? "bg-destructive/5 border-destructive/20 text-destructive"
                                : "bg-yellow-500/5 border-yellow-500/20 text-yellow-700 dark:text-yellow-400")
                          }
                        >
                          {verifyMessage.text}
                        </div>
                      )}
                    </div>
                    <DialogFooter className="pt-3 flex-col sm:flex-row gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setVerifyOpen(false)}
                      >
                        Close
                      </Button>
                      <Button
                        type="button"
                        onClick={handleManualVerify}
                        disabled={verifyLoading}
                        className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white"
                      >
                        {verifyLoading ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Verifying…
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Verify & Activate
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
          <CardDescription>Manage your NAIJALIFT subscription</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isPremium ? (
            <>
              {/* Premium Plan Details */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-lg bg-gradient-to-r from-amber-100 to-amber-50 dark:from-amber-900/30 dark:to-amber-800/20">
                <div className="text-left">
                  <h3 className="font-semibold text-base sm:text-lg">Premium Lifter</h3>
                  <p className="text-sm text-muted-foreground">
                    Unlimited applications + all premium features
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    ₦{pricePerCategory} per category • {billedCategories}{" "}
                    {billedCategories === 1 ? "category" : "categories"}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                    ₦{totalPrice.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">per month</p>
                </div>
              </div>

              {/* Billing Details */}
              <div className="space-y-3">
                <Separator />
                <div className="grid gap-3">
                  {subscription?.subscription_started_at && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Member since
                      </span>
                      <span>
                        {format(new Date(subscription.subscription_started_at), "MMM d, yyyy")}
                      </span>
                    </div>
                  )}
                  {subscription?.subscription_ends_at && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        Next billing date
                      </span>
                      <span>
                        {format(new Date(subscription.subscription_ends_at), "MMM d, yyyy")}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Cancel Button */}
              {subscription?.subscription_status === "active" && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full text-destructive hover:text-destructive"
                    >
                      Cancel Subscription
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancel your subscription?</AlertDialogTitle>
                      <AlertDialogDescription>
                        You'll lose access to premium features at the end of your current billing
                        period. This includes the verified badge, early access to
                        opportunities, and unlimited monthly applications.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => cancelSubscription.mutate()}
                        disabled={cancelSubscription.isPending}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {cancelSubscription.isPending ? "Cancelling..." : "Yes, Cancel"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </>
          ) : (
            <>
              {/* Free Plan */}
              <div className="text-center py-6 sm:py-8">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                  <Crown className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">You're on the Free Plan</h3>
                <p className="text-sm text-muted-foreground mb-5 max-w-sm mx-auto">
                  Browse all opportunities and apply to{" "}
                  <span className="font-semibold text-foreground">
                    {FREE_MONTHLY_APPLICATIONS} opportunities per month
                  </span>{" "}
                  for free. Upgrade for unlimited applications and more premium
                  features.
                </p>

                {/* Free usage progress */}
                <div className="max-w-sm mx-auto mb-6 p-4 rounded-lg bg-muted/60 border border-border/60 text-left">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-foreground font-medium flex items-center gap-1.5">
                      <Check className="h-3.5 w-3.5 text-primary" />
                      Monthly Applications
                    </span>
                    {quota ? (
                      <span className="font-semibold text-foreground">
                        {FREE_MONTHLY_APPLICATIONS - quota.remaining}/
                        {FREE_MONTHLY_APPLICATIONS} used
                      </span>
                    ) : null}
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary transition-all duration-500"
                      style={{
                        width: `${
                          quota
                            ? Math.min(
                                100,
                                (quota.applicationsThisMonth / FREE_MONTHLY_APPLICATIONS) * 100,
                              )
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-2">
                    {quota && quota.isQuotaExceeded
                      ? `Quota exceeded. Upgrade to apply to more. ` +
                        (quota.daysUntilReset != null
                          ? `Resets in ${quota.daysUntilReset} day(s).`
                          : "")
                      : quota && quota.daysUntilReset != null
                        ? `${quota.remaining} free application${
                            quota.remaining === 1 ? "" : "s"
                          } remaining — resets in ${quota.daysUntilReset} day(s).`
                        : "Browse always free. Apply to 5 opportunities each month."}
                  </p>
                </div>

                <Button
                  onClick={() => setShowUpgradeModal(true)}
                  className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg shadow-amber-500/30"
                >
                  <Crown className="h-4 w-4 mr-2" />
                  Upgrade to Premium • ₦{totalPrice.toLocaleString()}/month
                </Button>
                <p className="text-xs text-muted-foreground mt-3">
                  🇳🇬 Paid in Naira • Secure payment by Paystack • Cancel anytime
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <UpgradeModal open={showUpgradeModal} onOpenChange={setShowUpgradeModal} />
    </div>
  );
}

