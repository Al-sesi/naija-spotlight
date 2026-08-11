import { Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { Bookmark, ExternalLink, MapPin, Trash2, Bell, LayoutDashboard, CreditCard, Sparkles, Settings, ArrowRight, Crown, Lock, Gift, Copy, Check, Users, MousePointerClick, TrendingUp } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useUserApplications, useUpdateApplicationStatus, useRemoveApplication, useSaveApplication } from "@/hooks/useApplications";
import { useOpportunityMatching } from "@/hooks/useOpportunityMatching";
import { useUserNotifications } from "@/hooks/useNotifications";
import { useUserBehavior } from "@/hooks/useUserBehavior";
import { useMonthlyQuota, FREE_MONTHLY_APPLICATIONS } from "@/hooks/useMonthlyQuota";
import { useIsPremium } from "@/hooks/useSubscription";
import { APPLICATION_STATUSES, ApplicationStatus } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { NotificationSettings } from "@/components/dashboard/NotificationSettings";
import { NotificationList } from "@/components/notifications/NotificationList";
import { UpgradeModal } from "@/components/subscription/UpgradeModal";
import { QuotaWelcomeModal } from "@/components/subscription/QuotaWelcomeModal";
import { useMyReferralStats } from "@/hooks/useReferralStats";
import { useQuotaWelcomeModal } from "@/hooks/useQuotaWelcomeModal";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: applications, isLoading } = useUserApplications();
  const { matches, loading: matchesLoading, profileCompleted } = useOpportunityMatching();
  const { data: notifications } = useUserNotifications();
  const saveOpportunity = useSaveApplication();
  const updateStatus = useUpdateApplicationStatus();
  const removeApplication = useRemoveApplication();
  const { trackSave, trackClick, trackApply } = useUserBehavior();
  const { data: quota, incrementQuotaOptimistic } = useMonthlyQuota();
  const { isPremium } = useIsPremium();
  const { data: myRefStats } = useMyReferralStats(user?.id);
  const [showUpgradeFromRec, setShowUpgradeFromRec] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);

  const {
    modalOpen: quotaModalOpen,
    onModalChange: onQuotaModalChange,
    onUpgrade: handleQuotaUpgrade,
  } = useQuotaWelcomeModal(quota, isPremium);

  const handleRecommendationSave = async (opportunityId: string) => {
    try {
      await saveOpportunity.mutateAsync({ opportunityId });
      trackSave(opportunityId);
      toast.success("Saved to your dashboard");
    } catch (error) {
      console.error("Error saving recommendation:", error);
      toast.error("Could not save this opportunity");
    }
  };

  const handleRecommendationApply = (link: string, opportunityId: string) => {
    // For you tab: click-through to opportunity page counts toward monthly quota
    if (!isPremium && quota && quota.isQuotaExceeded) {
      setShowUpgradeFromRec(true);
      return;
    }
    window.open(link, "_blank", "noopener,noreferrer");
    trackApply(opportunityId);
    incrementQuotaOptimistic();
    const existing = applications?.find(a => a.opportunity_id === opportunityId);
    if (!existing) {
      saveOpportunity.mutate(
        { opportunityId, status: "applied" },
        {
          onError: (err: any) => {
            const msg = err?.message ?? String(err ?? "");
            if (msg.toLowerCase().includes("quota") || msg.toLowerCase().includes("exceeded")) {
              toast.error("Monthly application quota of 5 exceeded. Please upgrade to Premium.");
              setShowUpgradeFromRec(true);
            }
          },
        },
      );
    } else if (existing.status !== "applied") {
      updateStatus.mutate({ id: existing.id, status: "applied" }, {
        onError: (err: any) => {
          const msg = err?.message ?? String(err ?? "");
          if (msg.toLowerCase().includes("quota") || msg.toLowerCase().includes("exceeded")) {
            toast.error("Monthly application quota of 5 exceeded. Please upgrade to Premium.");
            setShowUpgradeFromRec(true);
          }
        },
      });
    }
  };

  if (!user) {
    return (
      <div className="container py-16 text-center">
        <Bookmark className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h2 className="text-2xl font-display font-bold mb-2">Track Your Applications</h2>
        <p className="text-muted-foreground mb-6">Sign in to save and track opportunities you've applied to.</p>
        <Link to="/auth">
          <Button>Sign In</Button>
        </Link>
      </div>
    );
  }

  return (
    <>
    <div className="container px-4 sm:px-6 py-6 sm:py-8">
      <div className="mb-6 space-y-1">
        <h1 className="text-2xl sm:text-3xl font-display font-bold">My Dashboard</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Stay on top of your applications, alerts, and billing in one place.
        </p>
      </div>

      {/* Application Quota Counter - for free users */}
      {!isPremium && quota && (
        <div className="mb-6">
          <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-0">
            <CardContent className="px-4 py-4 sm:px-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <span className="font-semibold text-sm">Monthly Applications</span>
                </div>
                <span className="text-2xl font-bold font-display text-primary sm:text-3xl">
                  {FREE_MONTHLY_APPLICATIONS - quota.applicationsThisMonth} / {FREE_MONTHLY_APPLICATIONS}
                </span>
              </div>
              <Progress
                value={(quota.applicationsThisMonth / FREE_MONTHLY_APPLICATIONS) * 100}
                className="h-2"
              />
              <p className="text-xs text-muted-foreground mt-2">
                {quota.isQuotaExceeded
                  ? `You've used all ${FREE_MONTHLY_APPLICATIONS} free applications this month. ` +
                    `Upgrade to apply to more — resets in ${quota.daysUntilReset ?? 30} day(s).`
                  : `${quota.applicationsThisMonth} of ${FREE_MONTHLY_APPLICATIONS} used — ` +
                    `${quota.remaining} application${quota.remaining === 1 ? "" : "s"} left this month. ` +
                    quota.daysUntilReset != null && quota.daysUntilReset <= 7
                      ? `Resets in ${quota.daysUntilReset} day(s).`
                      : ""}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="recommendations" className="space-y-5 sm:space-y-6 max-w-full">
        <TabsList className="flex w-full max-w-full overflow-x-auto whitespace-nowrap rounded-xl bg-muted/60 p-1 shadow-sm gap-1">
          <TabsTrigger
            value="recommendations"
            className="flex min-w-[110px] flex-1 items-center justify-center gap-1 text-xs sm:text-sm"
          >
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">For You</span>
            <span className="sm:hidden">You</span>
          </TabsTrigger>
          <TabsTrigger
            value="applications"
            className="flex min-w-[110px] flex-1 items-center justify-center gap-1 text-xs sm:text-sm"
          >
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">Applications</span>
            <span className="sm:hidden">Apps</span>
          </TabsTrigger>
          <TabsTrigger
            value="notifications"
            className="flex min-w-[110px] flex-1 items-center justify-center gap-1 text-xs sm:text-sm"
          >
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notifications</span>
            <span className="sm:hidden">Alerts</span>
          </TabsTrigger>
          <TabsTrigger
            value="referrals"
            className="flex min-w-[110px] flex-1 items-center justify-center gap-1 text-xs sm:text-sm"
          >
            <Gift className="h-4 w-4" />
            <span className="hidden sm:inline">Referrals</span>
            <span className="sm:hidden">Refs</span>
          </TabsTrigger>
          <TabsTrigger
            value="billing"
            className="flex min-w-[110px] flex-1 items-center justify-center gap-1 text-xs sm:text-sm"
          >
            <CreditCard className="h-4 w-4" />
            Billing
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recommendations">
          {!isPremium ? (
            <Card className="border-amber-500/40 bg-gradient-to-br from-amber-50/40 to-transparent dark:from-amber-950/20">
              <CardContent className="py-12 sm:py-16 text-center space-y-6">
                <div className="mx-auto h-20 w-20 rounded-full bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-900/40 dark:to-amber-800/20 flex items-center justify-center shadow-lg shadow-amber-500/20">
                  <Crown className="h-10 w-10 text-amber-500" />
                </div>
                <div className="space-y-2 max-w-lg mx-auto">
                  <h3 className="text-xl sm:text-2xl font-display font-bold">
                    AI Opportunity Matching is Premium
                  </h3>
                  <p className="text-sm sm:text-base text-muted-foreground">
                    Our AI engine scans every opportunity and curates a personalized shortlist just for you — based on your profile, interests, skills, and past behavior. Upgrade to Premium Lifter to unlock your matches.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                  <Button
                    size="lg"
                    onClick={() => setShowUpgradeFromRec(true)}
                    className="gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg shadow-amber-500/30 font-semibold"
                  >
                    <Crown className="h-5 w-5" />
                    Unlock AI Matching
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 max-w-2xl mx-auto pt-4">
                  <div className="rounded-lg bg-muted/50 border border-border/50 p-3 sm:p-4 text-left">
                    <Sparkles className="h-5 w-5 text-primary mb-2" />
                    <p className="text-xs sm:text-sm font-semibold">Personalized Picks</p>
                    <p className="text-[11px] sm:text-xs text-muted-foreground mt-1">
                      Matches ranked by how well they fit your profile.
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/50 border border-border/50 p-3 sm:p-4 text-left">
                    <Lock className="h-5 w-5 text-primary mb-2" />
                    <p className="text-xs sm:text-sm font-semibold">Match Scores</p>
                    <p className="text-[11px] sm:text-xs text-muted-foreground mt-1">
                      See exactly why each opportunity is a good fit.
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/50 border border-border/50 p-3 sm:p-4 text-left">
                    <Crown className="h-5 w-5 text-primary mb-2" />
                    <p className="text-xs sm:text-sm font-semibold">Updated Daily</p>
                    <p className="text-[11px] sm:text-xs text-muted-foreground mt-1">
                      New opportunities surfaced automatically every day.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : matchesLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map(i => (
                <Card key={i} className="animate-pulse">
                  <CardHeader><div className="h-6 bg-muted rounded w-3/4" /></CardHeader>
                  <CardContent><div className="h-20 bg-muted rounded" /></CardContent>
                </Card>
              ))}
            </div>
          ) : !matches?.length ? (
            <Card className="text-center py-12">
              <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">
                {profileCompleted ? "No strong matches yet" : "No recommendations yet"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {profileCompleted
                  ? "We couldn't find any active opportunities that fit your profile well enough yet."
                  : "Complete your profile to get personalized recommendations!"}
              </p>
              {!profileCompleted && (
                <Link to="/onboarding">
                  <Button>Complete Profile</Button>
                </Link>
              )}
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {matches.slice(0, 6).map((match) => (
                <Card key={match.opportunity.id} className="group">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className={cn(
                            "text-xs",
                            match.score >= 80 ? "border-green-500 text-green-500" :
                            match.score >= 60 ? "border-yellow-500 text-yellow-500" :
                            "border-gray-400 text-gray-500"
                          )}>
                            {match.score}% Match
                          </Badge>
                        </div>
                        <Progress value={match.score} className="h-2" />
                      </div>
                    </div>
                    <CardTitle className="text-base line-clamp-2 mt-2">{match.opportunity.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">{match.opportunity.provider}</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      {match.opportunity.state}
                      {match.opportunity.deadline && (
                        <span className="ml-auto">Deadline: {format(parseISO(match.opportunity.deadline), "MMM d")}</span>
                      )}
                    </div>

                    <div className="space-y-1">
                      {match.reasons.slice(0, 2).map((reason, i) => (
                        <div key={i} className="text-xs text-muted-foreground flex items-center gap-1">
                          <span className="text-green-500">✓</span>
                          {reason}
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleRecommendationSave(match.opportunity.id)}
                        disabled={saveOpportunity.isPending}
                      >
                        <Bookmark className="h-4 w-4 mr-2" />
                        Save
                      </Button>
                      {(!quota || !isPremium) && quota && quota.isQuotaExceeded ? (
                        <Button
                          size="sm"
                          className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white"
                          onClick={() => setShowUpgradeFromRec(true)}
                        >
                          <Crown className="h-4 w-4 mr-2" />
                          Upgrade
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleRecommendationApply(
                              match.opportunity.link,
                              match.opportunity.id
                            )
                          }
                        >
                          {!isPremium && quota ? (
                            <span className="mr-1 text-[11px] opacity-80">
                              {quota.remaining}/{FREE_MONTHLY_APPLICATIONS}
                            </span>
                          ) : null}
                          Apply
                          <ExternalLink className="h-4 w-4 ml-2" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="applications">
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map(i => (
                <Card key={i} className="animate-pulse">
                  <CardHeader><div className="h-6 bg-muted rounded w-3/4" /></CardHeader>
                  <CardContent><div className="h-20 bg-muted rounded" /></CardContent>
                </Card>
              ))}
            </div>
          ) : !applications?.length ? (
            <Card className="text-center py-12">
              <Bookmark className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No saved opportunities</h3>
              <p className="text-muted-foreground mb-4">Start exploring and save opportunities you're interested in.</p>
              <Link to="/">
                <Button>Browse Opportunities</Button>
              </Link>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {applications.map((app) => (
                <Card key={app.id} className="group">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <Badge variant="outline" className={cn(
                        "text-xs",
                        app.status === "saved" && "border-status-saved text-status-saved",
                        app.status === "applied" && "border-status-applied text-status-applied",
                        app.status === "shortlisted" && "border-status-shortlisted text-status-shortlisted",
                        app.status === "rejected" && "border-status-rejected text-status-rejected"
                      )}>
                        {APPLICATION_STATUSES.find(s => s.value === app.status)?.label}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeApplication.mutate(app.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <CardTitle className="text-base line-clamp-2">{app.opportunity?.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">{app.opportunity?.provider}</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      {app.opportunity?.state}
                      {app.opportunity?.deadline && (
                        <span className="ml-auto">Deadline: {format(parseISO(app.opportunity.deadline), "MMM d")}</span>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Select
                        value={app.status}
                        onValueChange={(value) => updateStatus.mutate({ id: app.id, status: value as ApplicationStatus })}
                      >
                        <SelectTrigger className="flex-1 h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-popover">
                          {APPLICATION_STATUSES.map(status => (
                            <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button size="sm" variant="outline" asChild>
                        <a href={app.opportunity?.link} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="notifications">
          <Tabs defaultValue="alerts" className="w-full">
            <TabsList className="w-full max-w-xs mb-6">
              <TabsTrigger value="alerts" className="flex-1 gap-2">
                <Bell className="h-4 w-4" />
                Alerts
                {notifications?.filter((n) => !n.is_read).length > 0 && (
                  <Badge className="h-2 w-2 rounded-full p-0 bg-primary" />
                )}
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex-1 gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </TabsTrigger>
            </TabsList>
            <TabsContent value="alerts">
              <NotificationList />
            </TabsContent>
            <TabsContent value="settings">
              <NotificationSettings />
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="referrals">
          <ReferralsDashboard
            stats={myRefStats}
            copiedRef={copiedRef}
            setCopiedRef={setCopiedRef}
          />
        </TabsContent>

        <TabsContent value="billing">
          <Card className="border-amber-500/30 bg-gradient-to-br from-amber-50/50 to-transparent dark:from-amber-950/20">
            <CardContent className="py-10 sm:py-12 text-center space-y-5">
              <div className="mx-auto h-16 w-16 rounded-full bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-900/40 dark:to-amber-800/20 flex items-center justify-center">
                <CreditCard className="h-8 w-8 text-amber-500" />
              </div>
              <div className="space-y-2 max-w-md mx-auto">
                <h3 className="text-xl sm:text-2xl font-display font-bold">
                  Billing & Subscription
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground">
                  Manage your plan, upgrade to Premium, view your billing history, or cancel your subscription — all in one place.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <Button asChild size="lg" className="gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg shadow-amber-500/30 font-semibold">
                  <Link to="/billing">
                    Open Billing Page
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                🔒 Secured by Paystack • Cancel anytime
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>

    <UpgradeModal
      open={showUpgradeFromRec}
      onOpenChange={setShowUpgradeFromRec}
      feature="Unlimited Applications"
    />

    <QuotaWelcomeModal
      open={quotaModalOpen}
      onOpenChange={onQuotaModalChange}
      quota={quota ?? null}
      onUpgrade={handleQuotaUpgrade}
    />
    </>
  );
}

// User-facing Referrals Dashboard Component
interface ReferralsDashboardProps {
  stats?: {
    referral_code: string | null;
    total_referrals: number;
    active_subscriptions: number;
    trial_users: number;
    link_clicks: number;
    click_to_signup_rate: number;
  };
  copiedRef: boolean;
  setCopiedRef: (v: boolean) => void;
}

function ReferralsDashboard({ stats, copiedRef, setCopiedRef }: ReferralsDashboardProps) {
  const referralLink =
    typeof window !== "undefined" && stats?.referral_code
      ? `${window.location.origin}/sign-up?ref=${encodeURIComponent(stats.referral_code)}`
      : "";

  const handleCopy = async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopiedRef(true);
      toast.success("Referral link copied to clipboard!");
      setTimeout(() => setCopiedRef(false), 2000);
    } catch {
      toast.error("Failed to copy link. Please copy it manually.");
    }
  };

  const code = stats?.referral_code || null;
  const total = stats?.total_referrals || 0;
  const premium = stats?.active_subscriptions || 0;
  const free = stats?.trial_users || 0;
  const clicks = stats?.link_clicks || 0;
  const clickRate = stats?.click_to_signup_rate || 0;

  return (
    <div className="space-y-6">
      {/* Hero card with link */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background overflow-hidden relative">
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-primary/10 blur-3xl -translate-y-1/2 translate-x-1/3" />
        <CardContent className="px-5 py-6 sm:px-8 sm:py-8 relative">
          <div className="flex items-start gap-4 sm:gap-6 flex-col sm:flex-row">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/30 shrink-0">
              <Gift className="h-7 w-7" />
            </div>
            <div className="flex-1 space-y-4 w-full">
              <div>
                <h3 className="text-xl sm:text-2xl font-display font-bold">
                  Invite friends, unlock rewards
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground mt-1">
                  Share NaijaLift with your network using your unique link. Anyone who signs up
                  through it will be credited to you.
                </p>
              </div>

              {code ? (
                <div className="space-y-2 max-w-2xl">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <Input
                        readOnly
                        value={referralLink}
                        className="pr-10 font-mono text-xs sm:text-sm h-11"
                      />
                    </div>
                    <Button onClick={handleCopy} className="h-11 gap-2">
                      {copiedRef ? (
                        <>
                          <Check className="h-4 w-4 text-green-500" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          Copy Link
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="font-mono">
                      Code: {code}
                    </Badge>
                    <span>Share via WhatsApp, Twitter, or email</span>
                  </div>
                </div>
              ) : (
                <div className="bg-muted/40 border border-dashed border-muted rounded-lg p-4 text-sm text-muted-foreground">
                  You don&apos;t have a referral code yet. Ask an admin or ambassador to generate
                  one for you and it will appear here!
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats row */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <MousePointerClick className="h-4 w-4 text-purple-500" />
              Link Clicks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-display">{clicks}</div>
            <p className="text-xs text-muted-foreground mt-1">people visited your link</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              Total Invited
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-display">{total}</div>
            <p className="text-xs text-muted-foreground mt-1">people signed up via your link</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50/60 to-transparent dark:from-amber-950/20 border-amber-200/60 dark:border-amber-800/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-700 dark:text-amber-300 flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Premium Subs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-display">{premium}</div>
            <p className="text-xs text-muted-foreground mt-1">who upgraded to Premium</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-indigo-500" />
              Click→Signup
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-display">{clickRate > 0 ? `${clickRate}%` : "—"}</div>
            <p className="text-xs text-muted-foreground mt-1">visit to signup rate</p>
          </CardContent>
        </Card>
      </div>

      {code && (clicks > 0 || total > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-indigo-500" />
              Your Funnel
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Link visits → Signups</span>
                <span className="font-bold tabular-nums">
                  {clicks > 0 ? `${clickRate}%` : "0%"}
                  <span className="text-muted-foreground font-normal ml-1">({total}/{clicks || 0})</span>
                </span>
              </div>
              <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-400 to-indigo-600 rounded-full"
                  style={{ width: `${clicks > 0 ? Math.min(100, clickRate) : 0}%` }}
                />
              </div>
            </div>
            {total > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Signups → Premium upgrades</span>
                  <span className="font-bold tabular-nums">
                    {total > 0 ? `${Math.round((premium / total) * 100)}%` : "0%"}
                    <span className="text-muted-foreground font-normal ml-1">({premium}/{total})</span>
                  </span>
                </div>
                <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full"
                    style={{ width: `${total > 0 ? Math.min(100, (premium / total) * 100) : 0}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {premium} of your {total} referrals upgraded to Premium for ₦530/month.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
