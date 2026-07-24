import { Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { Bookmark, ExternalLink, MapPin, Trash2, Bell, LayoutDashboard, CreditCard, Sparkles, Settings } from "lucide-react";
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
import { APPLICATION_STATUSES, ApplicationStatus } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { NotificationSettings } from "@/components/dashboard/NotificationSettings";
import { NotificationList } from "@/components/notifications/NotificationList";
import { TrialCounter } from "@/components/dashboard/TrialCounter";
import { BillingSettings } from "@/components/dashboard/BillingSettings";
import { toast } from "sonner";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: applications, isLoading } = useUserApplications();
  const { matches, loading: matchesLoading, profileCompleted } = useOpportunityMatching();
  const { data: notifications } = useUserNotifications();
  const saveOpportunity = useSaveApplication();
  const updateStatus = useUpdateApplicationStatus();
  const removeApplication = useRemoveApplication();
  const { trackSave, trackClick } = useUserBehavior();

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
    <div className="container px-4 sm:px-6 py-6 sm:py-8">
      <div className="mb-6 space-y-1">
        <h1 className="text-2xl sm:text-3xl font-display font-bold">My Dashboard</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Stay on top of your applications, alerts, and billing in one place.
        </p>
      </div>

      {/* Trial Counter */}
      <div className="mb-6">
        <TrialCounter />
      </div>

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
            value="billing"
            className="flex min-w-[110px] flex-1 items-center justify-center gap-1 text-xs sm:text-sm"
          >
            <CreditCard className="h-4 w-4" />
            Billing
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recommendations">
          {matchesLoading ? (
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
                      <Button size="sm" variant="outline" asChild>
                        <a
                          href={match.opportunity.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => trackClick(match.opportunity.id)}
                        >
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

        <TabsContent value="billing">
          <BillingSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
