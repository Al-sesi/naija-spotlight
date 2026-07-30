import { useEffect, useState } from "react";
import { differenceInDays, format, isPast, parseISO } from "date-fns";
import {
  BadgeCheck,
  Calendar,
  Clock,
  MapPin,
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  GraduationCap,
  Lock,
  Crown,
  X,
  Link2,
  Building2,
  FileText,
  Globe,
  Tag,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Opportunity } from "@/hooks/useOpportunities";
import { useAuth } from "@/hooks/useAuth";
import { useMonthlyQuota, FREE_MONTHLY_APPLICATIONS } from "@/hooks/useMonthlyQuota";
import { useIsPremium } from "@/hooks/useSubscription";
import { useUserBehavior } from "@/hooks/useUserBehavior";
import { useSaveApplication, useUserApplications, useRemoveApplication } from "@/hooks/useApplications";
import { UpgradeModal } from "@/components/subscription/UpgradeModal";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const categoryStyles: Record<string, { bg: string; text: string; border: string; label: string }> = {
  government: { bg: "bg-category-government/10", text: "text-category-government", border: "border-category-government/30", label: "Recruitments" },
  job: { bg: "bg-category-job/10", text: "text-category-job", border: "border-category-job/30", label: "Job" },
  recruitment: { bg: "bg-category-recruitment/10", text: "text-category-recruitment", border: "border-category-recruitment/30", label: "Recruitments" },
  internship: { bg: "bg-category-internship/10", text: "text-category-internship", border: "border-category-internship/30", label: "Internships" },
  competition: { bg: "bg-category-competition/10", text: "text-category-competition", border: "border-category-competition/30", label: "Competitions" },
  grant: { bg: "bg-category-grant/10", text: "text-category-grant", border: "border-category-grant/30", label: "Grants" },
  ngo: { bg: "bg-category-grant/10", text: "text-category-grant", border: "border-category-grant/30", label: "Grants" },
  tech: { bg: "bg-category-tech/10", text: "text-category-tech", border: "border-category-tech/30", label: "Tech Event" },
  career: { bg: "bg-category-career/10", text: "text-category-career", border: "border-category-career/30", label: "Career" },
  scholarship: { bg: "bg-category-scholarship/10", text: "text-category-scholarship", border: "border-category-scholarship/30", label: "Scholarship" },
  social: { bg: "bg-category-social/10", text: "text-category-social", border: "border-category-social/30", label: "Social Event" },
};

interface OpportunityDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opportunity: Opportunity | null;
}

export function OpportunityDetailModal({ open, onOpenChange, opportunity }: OpportunityDetailModalProps) {
  const { user, session } = useAuth();
  const { data: applications } = useUserApplications();
  const saveApplication = useSaveApplication();
  const removeApplication = useRemoveApplication();
  const { trackSave, trackApply } = useUserBehavior();
  const { data: quota, incrementQuotaOptimistic } = useMonthlyQuota();
  const { isPremium } = useIsPremium();
  const [showUpgrade, setShowUpgrade] = useState(false);

  const savedApplication = applications?.find(a => a.opportunity_id === opportunity?.id);
  const isSaved = !!savedApplication;

  const isEmailConfirmed = session?.user?.email_confirmed_at != null;

  if (!opportunity) return null;

  const categoryStyle = categoryStyles[opportunity.category] || categoryStyles.career;
  const deadline = opportunity.deadline ? parseISO(opportunity.deadline) : null;
  const eventDate = opportunity.event_date ? parseISO(opportunity.event_date) : null;
  const displayDate = deadline || eventDate;
  const isExpired = deadline && isPast(deadline);
  const daysLeft = deadline && !isExpired ? differenceInDays(deadline, new Date()) : null;

  const isQuotaExceeded = !!user && !!quota && !isPremium && quota.isQuotaExceeded;

  const handleSave = async () => {
    if (!user) { toast.error("Please sign in to save opportunities"); return; }
    if (!isEmailConfirmed) { toast.error("Please verify your email to save opportunities"); return; }

    try {
      if (isSaved && savedApplication) {
        await removeApplication.mutateAsync(savedApplication.id);
        toast.success("Removed from saved");
      } else {
        await saveApplication.mutateAsync({ opportunityId: opportunity.id });
        trackSave(opportunity.id);
        toast.success("Saved to your dashboard");
      }
    } catch {
      toast.error("Something went wrong");
    }
  };

  const handleApply = () => {
    if (!user) { toast.error("Please sign in to apply"); return; }
    if (!isEmailConfirmed) { toast.error("Please verify your email before applying"); return; }
    if (!isPremium && quota && quota.isQuotaExceeded) { setShowUpgrade(true); return; }

    window.open(opportunity.link, "_blank", "noopener,noreferrer");
    trackApply(opportunity.id);
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
            }
          },
        },
      );
    }
  };

  const applyDisabled = isExpired || !user || !isEmailConfirmed || (!!user && !isPremium && quota && quota.isQuotaExceeded);

  const createdAt = opportunity.created_at ? parseISO(opportunity.created_at) : null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[95vw] sm:max-w-[640px] max-h-[90vh] p-0 overflow-hidden flex flex-col">
          {/* Header section with gradient bg */}
          <div className="relative border-b bg-gradient-to-br from-primary/5 via-background to-background">
            <DialogHeader className="p-4 sm:p-6 pb-4 text-left">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
                  <Badge variant="outline" className={cn("text-xs font-medium shrink-0", categoryStyle.bg, categoryStyle.text, categoryStyle.border)}>
                    <Tag className="h-3 w-3 mr-1" />
                    {categoryStyle.label}
                  </Badge>
                  {opportunity.is_verified && (
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 shrink-0 gap-1">
                      <BadgeCheck className="h-3.5 w-3.5 fill-primary text-primary-foreground" />
                      <span className="text-xs font-medium">Verified</span>
                      <Sparkles className="h-3 w-3 hidden sm:inline" />
                    </Badge>
                  )}
                </div>
                <DialogClose asChild className="shrink-0 -mt-1 -mr-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full opacity-70 hover:opacity-100 hover:bg-muted">
                    <X className="h-4 w-4" />
                  </Button>
                </DialogClose>
              </div>

              <DialogTitle className="mt-3 text-xl sm:text-2xl font-display font-bold leading-tight text-foreground pr-2">
                {opportunity.title}
              </DialogTitle>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-primary/70" />
                  <span className="font-medium text-foreground/80">{opportunity.provider}</span>
                </div>
                {createdAt && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground/70">
                    <FileText className="h-3 w-3" />
                    <span>Posted {format(createdAt, "MMM d, yyyy")}</span>
                  </div>
                )}
              </div>
            </DialogHeader>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5">
            <div className="space-y-4 sm:space-y-5">
              {/* Key Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-start gap-3 p-3 sm:p-3.5 rounded-lg bg-card border border-border/60">
                  <div className="h-8 w-8 shrink-0 rounded-md bg-primary/10 flex items-center justify-center text-primary">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground">Location</div>
                    <div className="mt-0.5 text-sm font-medium text-foreground break-words">
                      {opportunity.is_remote ? "Remote / International" : opportunity.state || "Not specified"}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 sm:p-3.5 rounded-lg bg-card border border-border/60">
                  <div className="h-8 w-8 shrink-0 rounded-md bg-accent/20 flex items-center justify-center text-accent-foreground">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground">
                      {deadline ? "Application Deadline" : eventDate ? "Event Date" : "Timeline"}
                    </div>
                    <div className="mt-0.5 text-sm font-medium text-foreground">
                      {displayDate ? format(displayDate, "EEEE, MMMM d, yyyy") : "Not specified"}
                    </div>
                    {daysLeft !== null && (
                      <div className={cn(
                        "mt-1 inline-flex items-center gap-1 text-xs font-medium",
                        daysLeft <= 7 ? "text-destructive" : daysLeft <= 30 ? "text-accent-foreground" : "text-primary"
                      )}>
                        <Clock className="h-3 w-3" />
                        {daysLeft === 0 ? "Last day today!" : `${daysLeft} day${daysLeft !== 1 ? "s" : ""} left`}
                      </div>
                    )}
                    {isExpired && (
                      <Badge variant="secondary" className="mt-1 bg-muted text-muted-foreground text-[10px]">
                        Deadline passed
                      </Badge>
                    )}
                  </div>
                </div>

                {opportunity.category === "scholarship" && opportunity.level && (
                  <div className="flex items-start gap-3 p-3 sm:p-3.5 rounded-lg bg-card border border-border/60">
                    <div className="h-8 w-8 shrink-0 rounded-md bg-category-scholarship/10 flex items-center justify-center text-category-scholarship">
                      <GraduationCap className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground">Level</div>
                      <div className="mt-0.5 text-sm font-medium text-foreground break-words">{opportunity.level}</div>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3 p-3 sm:p-3.5 rounded-lg bg-card border border-border/60">
                  <div className="h-8 w-8 shrink-0 rounded-md bg-primary/10 flex items-center justify-center text-primary">
                    <Globe className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground">Mode</div>
                    <div className="mt-0.5 text-sm font-medium text-foreground">
                      {opportunity.is_remote ? "Remote / Work-from-home" : "On-site / Physical"}
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Full Description */}
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <FileText className="h-4 w-4 text-primary/70" />
                  <h4 className="text-sm font-semibold tracking-wide uppercase text-foreground/80">Full Details</h4>
                </div>
                <div className="text-sm leading-relaxed text-foreground/85 space-y-3 whitespace-pre-line">
                  {opportunity.description ? (
                    opportunity.description
                      .split(/\n{2,}/)
                      .filter(Boolean)
                      .map((para, i) => (
                        <p key={i} className="text-foreground/85 leading-relaxed">
                          {para.trim()}
                        </p>
                      ))
                  ) : (
                    <p className="italic text-muted-foreground/80">No detailed description provided for this opportunity.</p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Application link note */}
              <div className="flex items-start gap-3 p-3 sm:p-4 rounded-lg bg-primary/5 border border-primary/15">
                <Link2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm">
                  <p className="font-semibold text-primary">Ready to apply?</p>
                  <p className="mt-1 text-foreground/75 leading-relaxed">
                    Click the <span className="font-medium text-foreground">Apply Now</span> button below to visit the official application page on the provider&apos;s website in a new tab.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action footer */}
          <div className="shrink-0 border-t bg-muted/20 px-4 sm:px-6 py-3 sm:py-4">
            {user && !isPremium && quota && !isQuotaExceeded && (
              <div className="sm:hidden flex w-full items-center justify-between text-[11px] text-muted-foreground bg-muted/70 border border-border/70 rounded-md px-2.5 py-1.5 mb-2.5">
                <span>Free plan</span>
                <span className="font-medium">{quota.remaining}/{FREE_MONTHLY_APPLICATIONS} applies left</span>
              </div>
            )}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
              <Button
                variant="outline"
                onClick={handleSave}
                disabled={!user || !isEmailConfirmed}
                className={cn(
                  "w-full sm:w-auto order-2 sm:order-1 gap-2",
                  isSaved && "text-primary border-primary bg-primary/5 hover:bg-primary/10"
                )}
              >
                {isSaved ? (
                  <>
                    <BookmarkCheck className="h-4 w-4" />
                    <span>Saved</span>
                  </>
                ) : (
                  <>
                    <Bookmark className="h-4 w-4" />
                    <span>Save Opportunity</span>
                  </>
                )}
              </Button>

              <Button
                onClick={handleApply}
                disabled={applyDisabled}
                className={cn(
                  "w-full sm:flex-1 order-1 sm:order-2 text-sm sm:gap-2",
                  isQuotaExceeded && "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white"
                )}
              >
                {!user ? (
                  <>
                    <Lock className="h-4 w-4" />
                    Sign in to Apply
                  </>
                ) : !isEmailConfirmed ? (
                  <>
                    <Lock className="h-4 w-4" />
                    Verify Email First
                  </>
                ) : isQuotaExceeded ? (
                  <>
                    <Crown className="h-4 w-4" />
                    Upgrade to Apply
                  </>
                ) : (
                  <>
                    {user && !isPremium && quota && (
                      <span className="hidden sm:inline-flex items-center text-[11px] px-2 py-0.5 rounded bg-white/15 mr-1">
                        {quota.remaining}/{FREE_MONTHLY_APPLICATIONS}
                      </span>
                    )}
                    Apply Now — Official Page
                    <ExternalLink className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <UpgradeModal
        open={showUpgrade}
        onOpenChange={setShowUpgrade}
        feature="Unlimited Applications"
      />
    </>
  );
}
