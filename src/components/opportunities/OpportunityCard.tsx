import { differenceInDays, format, isPast, parseISO } from "date-fns";
import { BadgeCheck, Calendar, Clock, MapPin, ExternalLink, Bookmark, BookmarkCheck } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Opportunity } from "@/hooks/useOpportunities";
import { useSaveApplication, useUserApplications, useRemoveApplication } from "@/hooks/useApplications";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const categoryStyles = {
  government: {
    bg: "bg-category-government/10",
    text: "text-category-government",
    border: "border-category-government/30",
    label: "Gov Grant",
  },
  ngo: {
    bg: "bg-category-ngo/10",
    text: "text-category-ngo",
    border: "border-category-ngo/30",
    label: "NGO Program",
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
};

interface OpportunityCardProps {
  opportunity: Opportunity;
  style?: { animationDelay: string };
}

export function OpportunityCard({ opportunity, style }: OpportunityCardProps) {
  const { user } = useAuth();
  const { data: applications } = useUserApplications();
  const saveApplication = useSaveApplication();
  const removeApplication = useRemoveApplication();

  const savedApplication = applications?.find(a => a.opportunity_id === opportunity.id);
  const isSaved = !!savedApplication;

  const categoryStyle = categoryStyles[opportunity.category];
  const deadline = opportunity.deadline ? parseISO(opportunity.deadline) : null;
  const eventDate = opportunity.event_date ? parseISO(opportunity.event_date) : null;
  const displayDate = deadline || eventDate;
  const isExpired = deadline && isPast(deadline);
  const daysLeft = deadline && !isExpired ? differenceInDays(deadline, new Date()) : null;

  const handleSave = async () => {
    if (!user) {
      toast.error("Please sign in to save opportunities");
      return;
    }

    try {
      if (isSaved && savedApplication) {
        await removeApplication.mutateAsync(savedApplication.id);
        toast.success("Removed from saved");
      } else {
        await saveApplication.mutateAsync({ opportunityId: opportunity.id });
        toast.success("Saved to your dashboard");
      }
    } catch (error) {
      toast.error("Something went wrong");
    }
  };

  const handleApply = () => {
    window.open(opportunity.link, "_blank", "noopener,noreferrer");
    if (user && !isSaved) {
      saveApplication.mutate({ opportunityId: opportunity.id, status: "applied" });
    }
  };

  return (
    <Card 
      className={cn(
        "group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 animate-fade-up",
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
          <div className="flex items-center gap-1.5">
            {opportunity.is_verified && (
              <div className="flex items-center gap-1 text-primary">
                <BadgeCheck className="h-4 w-4 fill-primary text-primary-foreground" />
                <span className="text-xs font-medium">Verified</span>
              </div>
            )}
          </div>
        </div>
        <h3 className="text-lg font-semibold leading-tight mt-2 line-clamp-2 group-hover:text-primary transition-colors">
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
            <span>{opportunity.is_remote ? "Remote" : opportunity.state}</span>
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

      <CardFooter className="pt-0 flex gap-2">
        <Button 
          onClick={handleApply}
          className="flex-1"
          disabled={isExpired}
        >
          Apply Now
          <ExternalLink className="h-4 w-4 ml-2" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={handleSave}
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
  );
}
