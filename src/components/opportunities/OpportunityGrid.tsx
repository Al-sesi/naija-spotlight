import { Opportunity } from "@/hooks/useOpportunities";
import { OpportunityCard } from "./OpportunityCard";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchX, Clock, Sparkles } from "lucide-react";
import { isPast, parseISO } from "date-fns";

interface OpportunityGridProps {
  opportunities: Opportunity[] | undefined;
  isLoading: boolean;
}

export function OpportunityGrid({ opportunities, isLoading }: OpportunityGridProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-5">
            <div className="flex justify-between mb-3">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-16" />
            </div>
            <Skeleton className="h-6 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2 mb-4" />
            <Skeleton className="h-16 w-full mb-3" />
            <div className="flex gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-28" />
            </div>
            <div className="flex gap-2 mt-4">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-10" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!opportunities || opportunities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <SearchX className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No opportunities found</h3>
        <p className="text-muted-foreground text-sm max-w-md">
          Try adjusting your filters or search terms to find more opportunities.
        </p>
      </div>
    );
  }

  // Separate active and expired opportunities
  const now = new Date();
  const activeOpportunities = opportunities.filter(opp => {
    if (!opp.deadline) return true; // No deadline = active
    return !isPast(parseISO(opp.deadline));
  });
  
  const expiredOpportunities = opportunities.filter(opp => {
    if (!opp.deadline) return false;
    return isPast(parseISO(opp.deadline));
  });

  // If no active opportunities exist
  if (activeOpportunities.length === 0 && expiredOpportunities.length > 0) {
    return (
      <div className="space-y-8">
        {/* Friendly empty state for active section */}
        <div className="flex flex-col items-center justify-center py-12 text-center bg-gradient-to-b from-primary/5 to-transparent rounded-lg border border-dashed border-primary/20">
          <div className="rounded-full bg-primary/10 p-4 mb-4">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2 text-foreground">
            We are currently verifying new opportunities for you.
          </h3>
          <p className="text-muted-foreground text-sm max-w-md">
            Check back shortly! New opportunities are added regularly.
          </p>
        </div>

        {/* Expired section */}
        {expiredOpportunities.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <h3 className="text-sm font-medium">Past Opportunities ({expiredOpportunities.length})</h3>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
              {expiredOpportunities.map((opportunity, index) => (
                <OpportunityCard 
                  key={opportunity.id} 
                  opportunity={opportunity} 
                  style={{ animationDelay: `${index * 0.05}s` }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Active opportunities */}
      {activeOpportunities.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
          {activeOpportunities.map((opportunity, index) => (
            <OpportunityCard 
              key={opportunity.id} 
              opportunity={opportunity} 
              style={{ animationDelay: `${index * 0.05}s` }}
            />
          ))}
        </div>
      )}

      {/* Expired opportunities section */}
      {expiredOpportunities.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <h3 className="text-sm font-medium">Past Opportunities ({expiredOpportunities.length})</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
            {expiredOpportunities.map((opportunity, index) => (
              <OpportunityCard 
                key={opportunity.id} 
                opportunity={opportunity} 
                style={{ animationDelay: `${index * 0.05}s` }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
