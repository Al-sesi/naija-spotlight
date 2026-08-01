import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  CalendarCheck,
  Crown,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Info,
} from "lucide-react";
import { useIsPremium } from "@/hooks/useSubscription";
import { FREE_MONTHLY_APPLICATIONS } from "@/hooks/useMonthlyQuota";
import type { MonthlyQuota } from "@/hooks/useMonthlyQuota";
import { cn } from "@/lib/utils";

export type QuotaModalMode = "welcome" | "reminder" | "exceeded";

interface QuotaWelcomeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quota: MonthlyQuota | null;
  /** Optional forced mode. If omitted, it's auto-detected from quota + welcome-seen flag. */
  forcedMode?: QuotaModalMode;
  /** Called when user clicks "Upgrade". */
  onUpgrade?: () => void;
  /** Called when user dismisses (Got it / Close). */
  onDismiss?: () => void;
}

const WELCOME_SEEN_KEY = "quota-welcome-seen-v1";

export function QuotaWelcomeModal({
  open,
  onOpenChange,
  quota,
  forcedMode,
  onUpgrade,
  onDismiss,
}: QuotaWelcomeModalProps) {
  const { isPremium } = useIsPremium();
  const [resolvedMode, setResolvedMode] = useState<QuotaModalMode>("reminder");

  useEffect(() => {
    if (!open) return;

    if (forcedMode) {
      setResolvedMode(forcedMode);
      return;
    }

    // Auto decide based on quota state + first-time-welcome flag
    const hasSeenWelcome = typeof window !== "undefined" && 
      window.localStorage.getItem(WELCOME_SEEN_KEY) === "1";

    if (!hasSeenWelcome) {
      setResolvedMode("welcome");
    } else if (quota?.isQuotaExceeded) {
      setResolvedMode("exceeded");
    } else {
      setResolvedMode("reminder");
    }
  }, [open, forcedMode, quota]);

  const handleClose = () => {
    // Mark welcome as seen the first time any dialog closes in welcome mode
    if (resolvedMode === "welcome" && typeof window !== "undefined") {
      window.localStorage.setItem(WELCOME_SEEN_KEY, "1");
    }
    onOpenChange(false);
    onDismiss?.();
  };

  // Premium users: never show this modal
  if (isPremium) return null;

  const remaining = quota?.remaining ?? FREE_MONTHLY_APPLICATIONS;
  const progress = Math.min(
    100,
    ((FREE_MONTHLY_APPLICATIONS - remaining) / FREE_MONTHLY_APPLICATIONS) * 100
  );

  const headerByMode: Record<QuotaModalMode, { icon: any; title: string; badge?: string; badgeClass?: string; accent: string }> = {
    welcome: {
      icon: Sparkles,
      title: "Welcome to NaijaLift!",
      badge: "Free Plan",
      badgeClass: "bg-blue-100 text-blue-700 border-blue-200",
      accent: "from-blue-500 to-blue-700",
    },
    reminder: {
      icon: CalendarCheck,
      title: "Good to See You Back",
      badge: "Monthly Quota Update",
      badgeClass: "bg-emerald-100 text-emerald-700 border-emerald-200",
      accent: "from-emerald-500 to-emerald-700",
    },
    exceeded: {
      icon: AlertTriangle,
      title: "You've Used All 5 Applications",
      badge: "Quota Exceeded",
      badgeClass: "bg-amber-100 text-amber-700 border-amber-200",
      accent: "from-amber-500 to-amber-700",
    },
  };

  const h = headerByMode[resolvedMode];
  const Icon = h.icon;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto p-0 gap-0">
        {/* Top accent bar */}
        <div className={cn("h-2 w-full rounded-t-xl bg-gradient-to-r", h.accent)} />

        <DialogHeader className="px-5 sm:px-6 pt-5 sm:pt-6 pb-4 text-center">
          <div className="mx-auto mb-3 relative">
            <div className={cn(
              "h-14 w-14 rounded-full flex items-center justify-center bg-gradient-to-br text-white shadow-md",
              h.accent
            )}>
              <Icon className="h-7 w-7" />
            </div>
          </div>
          {h.badge && (
            <div className="mb-3">
              <Badge variant="outline" className={cn("text-xs font-medium border", h.badgeClass)}>
                {h.badge}
              </Badge>
            </div>
          )}
          <DialogTitle className="text-xl sm:text-2xl font-display leading-tight">
            {h.title}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-2">
            {resolvedMode === "welcome" && (
              <>
                Before you start applying, a quick note on your free account limits.
              </>
            )}
            {resolvedMode === "reminder" && (
              <>
                Here&apos;s how many applications you have left this month.
              </>
            )}
            {resolvedMode === "exceeded" && (
              <>
                Upgrade to apply to more opportunities this month.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 sm:px-6 pb-5 sm:pb-6 space-y-5">
          {/* Quota meter */}
          <div className="rounded-xl border p-4 space-y-3 bg-muted/30">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <CalendarCheck className="h-4 w-4" />
                Applications this month
              </span>
              <span className="text-sm font-semibold">
                {FREE_MONTHLY_APPLICATIONS - remaining} / {FREE_MONTHLY_APPLICATIONS}
              </span>
            </div>
            <Progress
              value={progress}
              className={cn(
                "h-2.5 rounded-full",
                resolvedMode === "exceeded" && "bg-amber-100",
                resolvedMode === "welcome" && "bg-blue-100"
              )}
              indicatorClassName={cn("rounded-full",
                resolvedMode === "exceeded"
                  ? "bg-gradient-to-r from-amber-500 to-amber-600"
                  : resolvedMode === "welcome"
                    ? "bg-gradient-to-r from-blue-500 to-blue-600"
                    : "bg-gradient-to-r from-emerald-500 to-emerald-600"
              )}
            />
            <div className={cn(
              "flex items-center justify-between pt-1 text-sm",
              resolvedMode === "exceeded" && "text-amber-700"
            )}>
              <div className="flex items-center gap-1.5">
                {remaining > 0 ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>
                      <strong className="font-bold">{remaining}</strong> application{remaining !== 1 ? "s" : ""} left
                    </span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4" />
                    <span>
                      <strong className="font-bold">0</strong> left this month
                    </span>
                  </>
                )}
              </div>
              {quota?.daysUntilReset != null && quota.daysUntilReset > 0 && (
                <span className="text-xs text-muted-foreground">
                  Resets in {quota.daysUntilReset} day{quota.daysUntilReset !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>

          {/* Mode-specific body */}
          {resolvedMode === "welcome" && (
            <div className="space-y-3 text-sm">
              <p className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <span>
                  Every user on the free plan gets <strong>5 applications per month</strong>. This keeps the platform fair and reduces spam for our verified recruiters.
                </span>
              </p>
              <ul className="space-y-2 pl-1">
                {[
                  "Apply to 5 jobs, grants, or scholarships each month",
                  "Save opportunities you want to check later (unlimited)",
                  "Use AI matching to discover picks ranked for you"
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {resolvedMode === "exceeded" && (
            <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100/40 dark:from-amber-950/20 dark:to-amber-900/10 p-4 space-y-2 text-sm">
              <p className="font-medium text-amber-800 dark:text-amber-200 flex items-center gap-2">
                <Crown className="h-4 w-4" />
                What premium gives you right now:
              </p>
              <ul className="space-y-1.5 text-amber-900/80 dark:text-amber-100/80">
                <li>→ Unlimited applications — every job, scholarship & grant</li>
                <li>→ AI-powered matching ranked by fit for your profile</li>
                <li>→ Early access before the public sees listings</li>
              </ul>
            </div>
          )}

          {resolvedMode === "reminder" && remaining <= 2 && remaining > 0 && (
            <div className="rounded-lg border border-blue-100 bg-blue-50/50 dark:bg-blue-950/20 p-3 text-sm text-blue-800 dark:text-blue-200 flex items-start gap-2">
              <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>
                Heads up — only <strong>{remaining}</strong> left this month. If you need more, consider upgrading to Premium.
              </span>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2 pt-1 sm:pt-0">
            <Button
              variant="outline"
              onClick={handleClose}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              {resolvedMode === "welcome" ? "Got it, thanks" : "Dismiss"}
            </Button>
            <Button
              onClick={() => {
                onOpenChange(false);
                onUpgrade?.();
              }}
              className="w-full sm:w-auto order-1 sm:order-2 gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-md shadow-amber-500/20"
            >
              <Crown className="h-4 w-4" />
              Get Unlimited — ₦530/mo
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
