import { useEffect } from "react";
import { differenceInDays, format, isPast, parseISO } from "date-fns";
import { BadgeCheck, Calendar, Clock, MapPin, ExternalLink, Bookmark, BookmarkCheck, GraduationCap, Lock, Crown, Eye } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Opportunity } from "@/hooks/useOpportunities";
import { useSaveApplication, useUserApplications, useRemoveApplication } from "@/hooks/useApplications";
import { useUserBehavior } from "@/hooks/useUserBehavior";
import { useAuth } from "@/hooks/useAuth";
import { useMonthlyQuota, FREE_MONTHLY_APPLICATIONS } from "@/hooks/useMonthlyQuota";
import { useIsPremium } from "@/hooks/useSubscription";
import { UpgradeModal } from "@/components/subscription/UpgradeModal";
import { OpportunityDetailModal } from "@/components/opportunities/OpportunityDetailModal";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const categoryStyles: Record<string, { bg: string; text: string; border: string; label: string }> = {
  government: {
    bg: "bg-category-government/10",
    text: "text-category-government",
    border: "border-category-government/30",
    label: "Recruitments",
  },
  job: {
    bg: "bg-category-job/10",
    text: "text-category-job",
    border: "border-category-job/30",
    label: "Job",
  },
  recruitment: {
    bg: "bg-category-recruitment/10",
    text: "text-category-recruitment",
    border: "border-category-recruitment/30",
    label: "Recruitments",
  },
  internship: {
    bg: "bg-category-internship/10",
    text: "text-category-internship",
    border: "border-category-internship/30",
    label: "Internships",
  },
  competition: {
    bg: "bg-category-competition/10",
    text: "text-category-competition",
    border: "border-category-competition/30",
    label: "Competitions",
  },
  grant: {
    bg: "bg-category-grant/10",
    text: "text-category-grant",
    border: "border-category-grant/30",
    label: "Grants",
  },
  ngo: {
    bg: "bg-category-grant/10",
    text: "text-category-grant",
    border: "border-category-grant/30",
    label: "Grants",
  },
  tech: {
    bg: "bg-category-tech/10",
    text: "text-category-tech",
    border: "border-category-tech/30",
    label: "Tech Event",
  },
  career: {
    bg: "bg-category-career/10",
    text: "text-category-career",
    border: "border-category-career/30",
    label: "Career",
  },
  scholarship: {
    bg: "bg-category-scholarship/10",
    text: "text-category-scholarship",
    border: "border-category-scholarship/30",
    label: "Scholarship",
  },
  social: {
    bg: "bg-category-social/10",
    text: "text-category-social",
    border: "border-category-social/30",
    label: "Social Event",
  },
};

interface OpportunityCardProps {
  opportunity: Opportunity;
  style?: { animationDelay: string };
}

export function OpportunityCard({ opportunity, style }: OpportunityCardProps) {
  const { user, session } = useAuth();
  const { data: applications } = useUserApplications();
  const saveApplication = useSaveApplication();
  const removeApplication = useRemoveApplication();
  const { trackView, trackSave, trackApply } = useUserBehavior();
  const { data: quota, isLoading: isQuotaLoading, incrementQuotaOptimistic } = useMonthlyQuota();
  const { isPremium } = useIsPremium();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  const savedApplication = applications?.find(a => a.opportunity_id === opportunity.id);
  const isSaved = !!savedApplication;

  useEffect(() => {
    trackView(opportunity.id);
  }, [opportunity.id, trackView]);

  // Check if email is confirmed
  const isEmailConfirmed = session?.user?.email_confirmed_at != null;

  const categoryStyle = categoryStyles[opportunity.category] || categoryStyles.career;
  const deadline = opportunity.deadline ? parseISO(opportunity.deadline) : null;
  const eventDate = opportunity.event_date ? parseISO(opportunity.event_date) : null;
  const displayDate = deadline || eventDate;
  const isExpired = deadline && isPast(deadline);
  const daysLeft = deadline && !isExpired ? differenceInDays(deadline, new Date()) : null;

  const isQuotaExceeded =
    !!user && !!quota && !isPremium && quota.isQuotaExceeded;

  const handleSave = async () => {
    if (!user) {
      toast.error("Please sign in to save opportunities");
      return;
    }

    if (!isEmailConfirmed) {
      toast.error("Please verify your email to save opportunities");
      return;
    }

    try {
      if (isSaved && savedApplication) {
        await removeApplication.mutateAsync(savedApplication.id);
        toast.success("Removed from saved");
      } else {
        await saveApplication.mutateAsync({ opportunityId: opportunity.id });
        trackSave(opportunity.id);
        toast.success("Saved to your dashboard");
      }
    } catch (error) {
      toast.error("Something went wrong");
    }
  };

  const handleApply = () => {
    if (!user) {
      toast.error("Please sign in to apply");
      return;
    }

    if (!isEmailConfirmed) {
      toast.error("Please verify your email before applying");
      return;
    }

    // Free users: 5 applications/month — after that, browse only, upgrade to apply
    if (!isPremium && quota && quota.isQuotaExceeded) {
      setShowUpgrade(true);
      return;
    }

    window.open(opportunity.link, "_blank", "noopener,noreferrer");
    trackApply(opportunity.id);
    // Optimistic + invalidate to reflect the quota right away
    incrementQuotaOptimistic();
    if (user && !isSaved) {
      saveApplication.mutate(
        { opportunityId: opportunity.id, status: "applied" },
        {
          onError: (err: any) => {
            const msg = err?.message ?? String(err ?? "");
            if (msg.toLowerCase().includes("quota") || msg.toLowerCase().includes("exceeded")) {
              toast.error("Monthly application quota of 5 exceeded. Please upgrade to Premium.");
              setShowUpgrade(true);
            } else {
              toast.error("Could not mark as applied — please try again");
            }
          },
        },
      );
    }
  };

  const applyDisabled =
    isExpired ||
    !user ||
    !isEmailConfirmed ||
    (!!user && !isPremium && quota && quota.isQuotaExceeded);

  return (
    <>
    <Card 
      className={cn(
        "group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 animate-fade-up border-border/50",
        isExpired && "opacity-60"
      )}
      style={style}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <Badge 
            variant="outline" 
            className={cn("text-xs font-medium", categoryStyle.bg, categoryStyle.text, categoryStyle.border)}
          >
            {categoryStyle.label}
          </Badge>
          <div className="flex flex-col items-end gap-1">
            {opportunity.is_verified && (
              <div className="flex items-center gap-1 text-primary" title="Verified by Naijalift">
                <BadgeCheck className="h-4 w-4 fill-primary text-primary-foreground" />
                <span className="text-xs font-medium hidden sm:inline">Verified</span>
              </div>
            )}
          </div>
        </div>
        <h3 className="text-base md:text-lg font-semibold leading-tight mt-2 line-clamp-2 group-hover:text-primary transition-colors">
          {opportunity.title}
        </h3>
        <p className="text-sm text-muted-foreground">{opportunity.provider}</p>
      </CardHeader>

      <CardContent className="pb-3 space-y-3">
        {opportunity.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{opportunity.description}</p>
        )}
        
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            <span>{opportunity.is_remote ? "Remote / International" : opportunity.state}</span>
          </div>
          {displayDate && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              <span>
                {deadline ? "Deadline: " : "Date: "}
                {format(displayDate, "MMM d, yyyy")}
              </span>
            </div>
          )}
        </div>

        {/* Scholarship specific: Level info */}
        {opportunity.category === "scholarship" && opportunity.level && (
          <div className="flex items-center gap-1.5 text-xs text-category-scholarship">
            <GraduationCap className="h-3.5 w-3.5" />
            <span>{opportunity.level}</span>
          </div>
        )}

        {daysLeft !== null && (
          <div className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium animate-countdown",
            daysLeft <= 7 
              ? "bg-destructive/10 text-destructive" 
              : daysLeft <= 30 
                ? "bg-accent/20 text-accent-foreground" 
                : "bg-primary/10 text-primary"
          )}>
            <Clock className="h-3.5 w-3.5" />
            {daysLeft === 0 ? "Last day to apply!" : `${daysLeft} days left`}
          </div>
        )}

        {isExpired && (
          <Badge variant="secondary" className="bg-muted text-muted-foreground">
            Deadline passed
          </Badge>
        )}
      </CardContent>

      <CardFooter className="pt-0 flex flex-col sm:flex-row gap-2">
        {/* Quota indicator badge for free users */}
        {user && !isPremium && quota && !isQuotaExceeded && (
          <div className="sm:hidden flex w-full items-center justify-between text-[11px] text-muted-foreground bg-muted/70 border border-border/70 rounded-md px-2.5 py-1 mb-1">
            <span>Free plan</span>
            <span className="font-medium">
              {quota.remaining}/{FREE_MONTHLY_APPLICATIONS} applies left
            </span>
          </div>
        )}

        {/* View Details button */}
        <Button
          variant="secondary"
          onClick={() => setShowDetail(true)}
          className="w-full sm:w-auto sm:shrink-0 text-xs sm:text-sm gap-1.5 bg-muted/60 hover:bg-muted border border-border/50"
        >
          <Eye className="h-3.5 w-3.5" />
          <span>View Details</span>
        </Button>

        <Button 
          onClick={handleApply}
          className={`flex-1 text-sm ${isQuotaExceeded ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white" : ""}`}
          disabled={applyDisabled}
        >
          {!user ? (
            <>
              <Lock className="h-4 w-4 mr-2" />
              Sign in to Apply
            </>
          ) : !isEmailConfirmed ? (
            <>
              <Lock className="h-4 w-4 mr-2" />
              Verify Email
            </>
          ) : isQuotaExceeded ? (
            <>
              <Crown className="h-4 w-4 mr-2" />
              Upgrade to Apply
            </>
          ) : (
            <>
              {user && !isPremium && quota ? (
                <span className="hidden sm:inline-flex mr-2 items-center text-[11px] px-1.5 py-0.5 rounded bg-white/15">
                  {quota.remaining}/{FREE_MONTHLY_APPLICATIONS}
                </span>
              ) : null}
              Apply Now
              <ExternalLink className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={handleSave}
          disabled={!user || !isEmailConfirmed}
          className={cn(isSaved && "text-primary border-primary")}
        >
          {isSaved ? (
            <BookmarkCheck className="h-4 w-4" />
          ) : (
            <Bookmark className="h-4 w-4" />
          )}
        </Button>
      </CardFooter>
    </Card>

    <UpgradeModal
      open={showUpgrade}
      onOpenChange={setShowUpgrade}
      feature="Unlimited Applications"
    />

    <OpportunityDetailModal
      open={showDetail}
      onOpenChange={setShowDetail}
      opportunity={opportunity}
    />
    </>
  );
}