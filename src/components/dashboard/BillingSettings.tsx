import { useState } from "react";
import { format } from "date-fns";
import { Crown, CreditCard, Calendar, AlertCircle, CheckCircle, XCircle, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
import { useSubscription, useInitializePayment, useCancelSubscription, useIsPremium } from "@/hooks/useSubscription";
import { UpgradeModal } from "@/components/subscription/UpgradeModal";

export function BillingSettings() {
  const { data: subscription, isLoading } = useSubscription();
  const { isPremium } = useIsPremium();
  const initializePayment = useInitializePayment();
  const cancelSubscription = useCancelSubscription();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

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
        if (subscription.trial_ends_at && new Date(subscription.trial_ends_at) > new Date()) {
          return (
            <Badge className="bg-primary/10 text-primary border-primary/30 gap-1">
              <Sparkles className="h-3 w-3" />
              Free Trial
            </Badge>
          );
        }
        return (
          <Badge variant="secondary" className="gap-1">
            <XCircle className="h-3 w-3" />
            Inactive
          </Badge>
        );
    }
  };

  const trialDaysRemaining = subscription?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(subscription.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const isInTrial = trialDaysRemaining > 0 && subscription?.subscription_status !== "active";

  const categoriesCount = subscription?.premium_categories?.length ?? 0;
  const billedCategories = categoriesCount > 0 ? categoriesCount : 1;
  const pricePerCategory = subscription?.plan_type === 'pro' ? 1500 : 197;
  const totalPrice = billedCategories * pricePerCategory;
  const planName = subscription?.plan_type === 'pro' ? "Pro Plan" : "Starter Plan";

  return (
    <div className="space-y-6 max-w-full">
      {/* Current Plan */}
      <Card className={isPremium ? "border-amber-500/30 bg-gradient-to-br from-amber-50/50 to-transparent dark:from-amber-950/20 max-w-full" : "max-w-full"}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className={`h-5 w-5 ${isPremium ? "text-amber-500" : "text-muted-foreground"}`} />
              <CardTitle>Current Plan</CardTitle>
            </div>
            {getStatusBadge()}
          </div>
          <CardDescription>
            Manage your NAIJALIFT subscription
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isPremium ? (
            <>
              {/* Premium Plan Details */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-lg bg-gradient-to-r from-amber-100 to-amber-50 dark:from-amber-900/30 dark:to-amber-800/20">
                <div className="text-left">
                  <h3 className="font-semibold text-base sm:text-lg">{planName}</h3>
                  <p className="text-sm text-muted-foreground">
                    Full access to all features
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

              {/* Trial Info */}
              {isInTrial && (
                <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Free Trial Active</p>
                    <p className="text-xs text-muted-foreground">
                      {trialDaysRemaining} days remaining • First charge on{" "}
                      {subscription?.trial_ends_at && format(new Date(subscription.trial_ends_at), "MMM d, yyyy")}
                    </p>
                  </div>
                </div>
              )}

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
                      <span>{format(new Date(subscription.subscription_started_at), "MMM d, yyyy")}</span>
                    </div>
                  )}
                  {subscription?.subscription_ends_at && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        Next billing date
                      </span>
                      <span>{format(new Date(subscription.subscription_ends_at), "MMM d, yyyy")}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button 
                  onClick={() => setShowUpgradeModal(true)}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                >
                  Change Plan / Upgrade
                </Button>

                {/* Cancel Button */}
                {subscription?.subscription_status === "active" && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" className="flex-1 text-destructive hover:text-destructive">
                        Cancel Subscription
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancel your subscription?</AlertDialogTitle>
                        <AlertDialogDescription>
                          You'll lose access to premium features at the end of your current billing period. 
                          This includes the verified badge, SMS alerts, and early access to opportunities.
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
              </div>
            </>
          ) : (
            <>
              {/* Free Plan */}
              <div className="text-center py-8">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                  <Crown className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">You're on the Free Plan</h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                  Upgrade to Premium Lifter to unlock verified badges, SMS alerts, and more exclusive features.
                </p>
                <Button 
                  onClick={() => setShowUpgradeModal(true)}
                  className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg shadow-amber-500/30"
                >
                  <Crown className="h-4 w-4 mr-2" />
                  Upgrade to Premium • ₦197 or ₦1,500/month
                </Button>
                <p className="text-xs text-muted-foreground mt-3">
                  Start with a 30-day free trial
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
