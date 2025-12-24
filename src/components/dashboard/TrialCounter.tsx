import { differenceInDays } from "date-fns";
import { Clock, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useUserProfile } from "@/hooks/useNotificationPreferences";

export function TrialCounter() {
  const { data: profile, isLoading } = useUserProfile();

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
        <CardContent className="py-4">
          <div className="animate-pulse h-12 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!profile?.trial_ends_at) {
    return null;
  }

  const trialEndsAt = new Date(profile.trial_ends_at);
  const now = new Date();
  const daysRemaining = Math.max(0, differenceInDays(trialEndsAt, now));
  const progress = Math.max(0, Math.min(100, (daysRemaining / 30) * 100));
  const isExpired = daysRemaining <= 0;

  return (
    <Card className={`bg-gradient-to-r ${isExpired ? 'from-destructive/10 to-destructive/5' : 'from-primary/10 to-primary/5'} border-0`}>
      <CardContent className="py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {isExpired ? (
              <Clock className="h-5 w-5 text-destructive" />
            ) : (
              <Sparkles className="h-5 w-5 text-primary" />
            )}
            <span className="font-semibold text-sm">
              {isExpired ? "Trial Expired" : "Your LIFT Trial"}
            </span>
          </div>
          <span className={`text-2xl font-bold font-display ${isExpired ? 'text-destructive' : 'text-primary'}`}>
            {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
        <p className="text-xs text-muted-foreground mt-2">
          {isExpired 
            ? "Your free trial has ended. Subscribe to continue receiving alerts."
            : "Trial Days Remaining — Enjoy all premium features free during beta!"}
        </p>
      </CardContent>
    </Card>
  );
}
