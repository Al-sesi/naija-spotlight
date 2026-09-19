import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
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
  ArrowLeft,
  Building2,
  FileText,
  Globe,
  Tag,
  Sparkles,
  Share2,
  MessageCircle,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Opportunity } from "@/hooks/useOpportunities";
import { useAuth } from "@/hooks/useAuth";
import { useMonthlyQuota, FREE_MONTHLY_APPLICATIONS } from "@/hooks/useMonthlyQuota";
import { useIsPremium } from "@/hooks/useSubscription";
import { useUserBehavior } from "@/hooks/useUserBehavior";
import { useSaveApplication, useUserApplications, useRemoveApplication } from "@/hooks/useApplications";
import { UpgradeModal } from "@/components/subscription/UpgradeModal";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

const WHATSAPP_GROUP_LINK = "https://chat.whatsapp.com/DKZf3TXtrOdHUlwwo3vKST?s=cl&p=a&mlu=4&ilr=4";

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

export default function OpportunityDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const { data: applications } = useUserApplications();
  const saveApplication = useSaveApplication();
  const removeApplication = useRemoveApplication();
  const { trackSave, trackApply, trackView } = useUserBehavior();
  const { data: quota, incrementQuotaOptimistic } = useMonthlyQuota();
  const { isPremium } = useIsPremium();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const fetchOpp = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("opportunities")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error("Error fetching opportunity:", error);
        setNotFound(true);
        setLoading(false);
        return;
      }

      if (!data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setOpportunity(data as Opportunity);
      setLoading(false);
    };

    fetchOpp();

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (opportunity?.id) {
      trackView(opportunity.id);
    }
  }, [opportunity?.id, trackView]);

  const savedApplication = applications?.find(a => a.opportunity_id === opportunity?.id);
  const isSaved = !!savedApplication;
  const isEmailConfirmed = session?.user?.email_confirmed_at != null;

  const categoryStyle = opportunity
    ? categoryStyles[opportunity.category] || categoryStyles.career
    : categoryStyles.career;
  const deadline = opportunity?.deadline ? parseISO(opportunity.deadline) : null;
  const eventDate = opportunity?.event_date ? parseISO(opportunity.event_date) : null;
  const displayDate = deadline || eventDate;
  const isExpired = deadline && isPast(deadline);
  const daysLeft = deadline && !isExpired ? differenceInDays(deadline, new Date()) : null;
  const isQuotaExceeded = !!user && !!quota && !isPremium && quota.isQuotaExceeded;

  const handleSave = async () => {
    if (!opportunity) return;
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
    if (!opportunity) return;
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

  const applyDisabled = !opportunity || isExpired || !user || !isEmailConfirmed || (!!user && !isPremium && quota && quota.isQuotaExceeded);

  const shareUrl = opportunity ? `${window.location.origin}/opportunities/${opportunity.id}` : window.location.href;
  const shareTitle = opportunity ? `${opportunity.title} — NAIJALIFT Opportunity` : "NAIJALIFT Opportunity";
  const shareText = opportunity
    ? `Check out this opportunity on NAIJALIFT:\n\n${opportunity.title}\n${opportunity.provider}\n\nDeadline: ${displayDate ? format(displayDate, "MMM d, yyyy") : "Open"}\n\n`
    : "Check out this opportunity on NAIJALIFT:\n\n";

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Could not copy link");
    }
  };

  const handleShareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
      } catch {
        // User cancelled — silent
      }
    } else {
      handleCopyLink();
    }
  };

  const handleShareWhatsApp = () => {
    const message = encodeURIComponent(`${shareText}${shareUrl}`);
    window.open(`https://wa.me/?text=${message}`, "_blank", "noopener,noreferrer");
  };

  const handleShareTwitter = () => {
    const text = encodeURIComponent(`${opportunity?.title || "Opportunity"} via NAIJALIFT`);
    const url = encodeURIComponent(shareUrl);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, "_blank", "noopener,noreferrer");
  };

  if (loading) {
    return (
      <div className="container min-h-[70vh] py-8 md:py-12 max-w-3xl">
        <div className="flex items-center gap-2 mb-6">
          <Skeleton className="h-9 w-24" />
        </div>
        <div className="rounded-2xl border bg-card p-5 sm:p-8 space-y-6">
          <div className="flex items-start justify-between gap-4">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
          <Skeleton className="h-9 w-full sm:w-3/4" />
          <Skeleton className="h-5 w-1/3" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
          </div>
          <Skeleton className="h-40 w-full rounded-lg" />
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
            <Skeleton className="h-11 w-full sm:w-40 rounded-md shrink-0" />
            <Skeleton className="h-11 flex-1 rounded-md" />
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !opportunity) {
    return (
      <div className="container min-h-[70vh] py-16 md:py-24 text-center max-w-lg">
        <div className="mx-auto mb-6 rounded-full bg-muted p-5 w-fit">
          <FileText className="h-10 w-10 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Opportunity not found</h1>
        <p className="text-muted-foreground mb-6">
          This opportunity may have been removed, or the link may be incorrect.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={() => navigate(-1)} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" /> Go Back
          </Button>
          <Button asChild>
            <Link to="/opportunities">
              Browse all opportunities
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const createdAt = opportunity.created_at ? parseISO(opportunity.created_at) : null;

  return (
    <div className="container min-h-[70vh] py-6 md:py-10 max-w-3xl">
      {/* Back / Breadcrumb */}
      <div className="flex items-center gap-2 mb-5 text-sm">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1.5 -ml-2">
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Back</span>
        </Button>
        <span className="text-muted-foreground/60">/</span>
        <Link to="/opportunities" className="text-muted-foreground hover:text-foreground transition-colors">
          Opportunities
        </Link>
        <span className="text-muted-foreground/60">/</span>
        <span className="text-foreground font-medium truncate">{opportunity.title.slice(0, 32)}{opportunity.title.length > 32 ? "…" : ""}</span>
      </div>

      <article className="relative rounded-2xl border bg-card shadow-sm overflow-hidden">
        {/* Header */}
        <header className="relative border-b bg-gradient-to-br from-primary/5 via-background to-background">
          <div className="p-5 sm:p-7 pb-5">
            <div className="flex items-start justify-between gap-3 mb-4">
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
                {isExpired && (
                  <Badge variant="secondary" className="bg-muted text-muted-foreground shrink-0">
                    Deadline passed
                  </Badge>
                )}
              </div>

              {/* Share actions */}
              <div className="flex items-center gap-1.5 shrink-0 -mt-1 -mr-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full"
                  onClick={handleShareTwitter}
                  title="Share on X (Twitter)"
                  aria-label="Share on X"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full text-[#25D366] hover:text-[#1ebe5a] hover:bg-[#25D366]/10"
                  onClick={handleShareWhatsApp}
                  title="Share via WhatsApp"
                  aria-label="Share via WhatsApp"
                >
                  <MessageCircle className="h-4 w-4 fill-current/20" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full"
                  onClick={handleShareNative}
                  title="Share link"
                  aria-label="Share link"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="hidden sm:inline-flex h-9 rounded-full gap-1.5 border-border/60"
                  onClick={handleCopyLink}
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-medium">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="h-3.5 w-3.5" />
                      <span className="text-xs font-medium">Copy link</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-display font-bold leading-tight text-foreground">
              {opportunity.title}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
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

            {daysLeft !== null && (
              <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium animate-countdown" style={{
                backgroundColor: daysLeft <= 7 ? "rgba(239,68,68,0.10)" : daysLeft <= 30 ? "rgba(251,146,60,0.12)" : "rgba(251,146,60,0.10)",
                color: daysLeft <= 7 ? "rgb(239,68,68)" : daysLeft <= 30 ? "rgb(234,88,12)" : "rgb(234,88,12)",
              }}>
                <Clock className="h-3.5 w-3.5" />
                {daysLeft === 0 ? "Last day to apply today!" : `${daysLeft} day${daysLeft !== 1 ? "s" : ""} left to apply`}
              </div>
            )}
          </div>
        </header>

        {/* Body */}
        <div className="px-5 sm:px-7 py-5 sm:py-6 space-y-5 sm:space-y-6">
          {/* Key Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-start gap-3 p-3.5 rounded-lg bg-background border border-border/60">
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

            <div className="flex items-start gap-3 p-3.5 rounded-lg bg-background border border-border/60">
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
              </div>
            </div>

            {opportunity.category === "scholarship" && opportunity.level && (
              <div className="flex items-start gap-3 p-3.5 rounded-lg bg-background border border-border/60">
                <div className="h-8 w-8 shrink-0 rounded-md bg-category-scholarship/10 flex items-center justify-center text-category-scholarship">
                  <GraduationCap className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground">Level</div>
                  <div className="mt-0.5 text-sm font-medium text-foreground break-words">{opportunity.level}</div>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3 p-3.5 rounded-lg bg-background border border-border/60">
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
          <section>
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-4 w-4 text-primary/70" />
              <h2 className="text-sm font-semibold tracking-wide uppercase text-foreground/80">Full Details</h2>
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
                <p className="italic text-muted-foreground/80">No detailed description provided. Click Apply Now to visit the official page.</p>
              )}
            </div>
          </section>

          <Separator />

          {/* CTA block */}
          <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/15">
            <ExternalLink className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm">
              <p className="font-semibold text-primary">Ready to apply?</p>
              <p className="mt-1 text-foreground/75 leading-relaxed">
                Click <span className="font-medium text-foreground">Apply Now</span> below to open the official application page on the provider&apos;s website in a new tab.
              </p>
            </div>
          </div>

          {/* Share / Join community section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-xl border bg-muted/30 flex flex-col items-start gap-2">
              <div className="flex items-center gap-2">
                <Share2 className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Share this opportunity</h3>
              </div>
              <p className="text-xs text-muted-foreground">Know someone who&apos;d love this? Send it their way.</p>
              <div className="flex flex-wrap gap-2 mt-1">
                <Button size="sm" variant="outline" onClick={handleShareWhatsApp} className="gap-1.5 h-9 text-[#25D366] hover:text-[#1ebe5a] border-[#25D366]/30 hover:bg-[#25D366]/5">
                  <MessageCircle className="h-4 w-4 fill-current/20" />
                  WhatsApp
                </Button>
                <Button size="sm" variant="outline" onClick={handleShareTwitter} className="gap-1.5 h-9">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" aria-hidden="true">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  X
                </Button>
                <Button size="sm" variant="outline" onClick={handleCopyLink} className="gap-1.5 h-9">
                  {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Share2 className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy link"}
                </Button>
              </div>
            </div>

            <div className="p-4 rounded-xl border bg-muted/30 flex flex-col items-start gap-2">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-[#25D366]" />
                <h3 className="text-sm font-semibold">Join our community</h3>
              </div>
              <p className="text-xs text-muted-foreground">Get early access and tips from thousands of Nigerians.</p>
              <Button
                asChild
                size="sm"
                className="mt-1 h-9 bg-[#25D366] hover:bg-[#1ebe5a] text-white gap-1.5"
              >
                <a href={WHATSAPP_GROUP_LINK} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-4 w-4 fill-white/20" />
                  Join WhatsApp Group
                </a>
              </Button>
            </div>
          </div>
        </div>

        {/* Sticky action footer */}
        <footer className="sticky bottom-0 z-10 shrink-0 border-t bg-muted/30 backdrop-blur px-5 sm:px-7 py-3 sm:py-4">
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
                  <Lock className="h-4 w-4 mr-1" />
                  Sign in to Apply
                </>
              ) : !isEmailConfirmed ? (
                <>
                  <Lock className="h-4 w-4 mr-1" />
                  Verify Email First
                </>
              ) : isQuotaExceeded ? (
                <>
                  <Crown className="h-4 w-4 mr-1" />
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
        </footer>
      </article>

      <UpgradeModal
        open={showUpgrade}
        onOpenChange={setShowUpgrade}
        feature="Unlimited Applications"
      />
    </div>
  );
}
