import { useState } from "react";
import { Search, Filter, Briefcase, GraduationCap, Zap, Users, Award, PartyPopper, X, Trophy, Compass, HandCoins, Crown, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useOpportunities } from "@/hooks/useOpportunities";
import { useSiteAlert } from "@/hooks/useSiteAlert";
import { FilterSidebar } from "@/components/opportunities/FilterSidebar";
import { OpportunityGrid } from "@/components/opportunities/OpportunityGrid";
import { OpportunityType } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useIsPremium } from "@/hooks/useSubscription";
import { useMonthlyQuota, FREE_MONTHLY_APPLICATIONS } from "@/hooks/useMonthlyQuota";
import { useInitializePayment } from "@/hooks/useSubscription";
import { useQuotaWelcomeModal } from "@/hooks/useQuotaWelcomeModal";
import { QuotaWelcomeModal } from "@/components/subscription/QuotaWelcomeModal";

const quickCategories: { type: OpportunityType | "grant_legacy"; label: string; icon: any; aliasFor?: OpportunityType[] }[] = [
  { type: "job", label: "Jobs", icon: Briefcase },
  { type: "recruitment", label: "Recruitments", icon: Users },
  { type: "internship", label: "Internships", icon: Compass },
  { type: "scholarship", label: "Scholarships", icon: GraduationCap },
  { type: "grant_legacy", label: "Grants", icon: HandCoins, aliasFor: ["grant", "ngo"] },
  { type: "competition", label: "Competitions", icon: Trophy },
  { type: "tech", label: "Tech Events", icon: Zap },
  { type: "social", label: "Social Events", icon: PartyPopper },
  { type: "career", label: "Career", icon: Award },
];

export default function Opportunities() {
  const [search, setSearch] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<OpportunityType[]>([]);
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [alertDismissed, setAlertDismissed] = useState(false);

  const { data: opportunities, isLoading } = useOpportunities({
    types: selectedTypes,
    states: selectedStates,
    search,
  });
  
  const { data: siteAlert } = useSiteAlert();
  const { user } = useAuth();
  const { isPremium } = useIsPremium();
  const { data: quota } = useMonthlyQuota();
  const initializePayment = useInitializePayment();

  // Auto-show quota reminder/welcome popup when user lands on Opportunities
  // (fires once per successful login session)
  const {
    modalOpen,
    onModalChange,
    onUpgrade: handleQuotaUpgrade,
  } = useQuotaWelcomeModal(quota, isPremium);

  const clearFilters = () => {
    setSelectedTypes([]);
    setSelectedStates([]);
    setSearch("");
  };

  const activeFilterCount = selectedTypes.length + selectedStates.length;

  const handleQuickFilter = (cat: { type: OpportunityType | "grant_legacy"; label: string; aliasFor?: OpportunityType[] }) => {
    const targets: OpportunityType[] = cat.aliasFor && cat.aliasFor.length > 0
      ? cat.aliasFor
      : [cat.type as OpportunityType];

    const allSelected = targets.length > 0 && targets.every(t => selectedTypes.includes(t));
    const anySelected = targets.some(t => selectedTypes.includes(t));

    if (allSelected || anySelected) {
      setSelectedTypes(selectedTypes.filter(t => !targets.includes(t)));
    } else {
      setSelectedTypes(targets);
    }
  };

  // When a free user has ZERO applications remaining this month:
  //  → Render the whole grid under a heavy blue-tinted blur overlay so they
  //    can't clearly see opportunity details — plus a bold call-to-action.
  const isQuotaExceededForFreeUser =
    !!user && !isPremium && !!quota && quota.isQuotaExceeded;

  return (
    <div className="min-h-screen gradient-hero">
      {/* Site Alert Banner */}
      {siteAlert?.is_active && siteAlert.message && !alertDismissed && (
        <div className={cn(
          "py-3 px-4 text-center text-sm font-medium relative",
          siteAlert.type === "info" && "bg-blue-500 text-white",
          siteAlert.type === "warning" && "bg-amber-500 text-white",
          siteAlert.type === "success" && "bg-emerald-600 text-white"
        )}>
          <span>{siteAlert.message}</span>
          <button 
            onClick={() => setAlertDismissed(true)}
            className="absolute right-4 top-1/2 -translate-y-1/2 hover:opacity-70"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {/* Hero Section */}
      <section className="py-6 sm:py-8 md:py-12 border-b border-border/30">
        <div className="container px-4 sm:px-6">
          <div className="max-w-3xl mx-auto text-center mb-4 sm:mb-6 md:mb-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-display font-bold mb-2 sm:mb-3 md:mb-4 leading-tight text-foreground">
              Discover Opportunities <br className="hidden md:block" />
              Across Nigeria
            </h1>
            <p className="text-xs sm:text-sm md:text-lg text-muted-foreground max-w-2xl mx-auto">
              NaijaLift brings verified scholarships, government initiatives, grants, tech events, and more—all in one place.
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative max-w-xl mx-auto mb-4 sm:mb-6">
            <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
            <Input
              placeholder="Search: 'remote jobs in Lagos', 'scholarships'..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 sm:h-11 md:h-12 pl-10 sm:pl-11 md:pl-12 pr-3 sm:pr-4 text-xs sm:text-sm md:text-base bg-card border-border shadow-sm placeholder:text-muted-foreground"
            />
          </div>

          {/* Quick Category Chips - horizontal scroll on mobile */}
          <div className="flex overflow-x-auto sm:flex-wrap sm:justify-center gap-2 md:gap-3 -mx-4 sm:mx-0 px-4 sm:px-0 pb-2 sm:pb-0 scrollbar-none">
            {quickCategories.map((cat) => {
              const targets: OpportunityType[] = cat.aliasFor && cat.aliasFor.length > 0
                ? cat.aliasFor
                : [cat.type as OpportunityType];
              const isActive = targets.some(t => selectedTypes.includes(t));
              return (
                <Button
                  key={cat.type}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleQuickFilter(cat)}
                  className={cn(
                    "text-xs gap-1 h-8 shrink-0 sm:shrink sm:h-9 sm:text-sm sm:gap-1.5",
                    !isActive && "bg-card hover:bg-muted"
                  )}
                >
                  <cat.icon className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  {cat.label}
                </Button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="container px-4 sm:px-6 py-4 sm:py-6 md:py-8">
        <div className="flex gap-4 lg:gap-6 lg:gap-8 flex-col lg:flex-row">
          {/* Desktop Filter Sidebar */}
          <div className={cn(
            "hidden lg:block w-64 shrink-0 transition-all duration-300",
            isQuotaExceededForFreeUser && "opacity-70 blur-[2px] pointer-events-none select-none"
          )}>
            <FilterSidebar
              selectedTypes={selectedTypes}
              selectedStates={selectedStates}
              onTypeChange={setSelectedTypes}
              onStateChange={setSelectedStates}
              onClearFilters={clearFilters}
            />
          </div>

          {/* Feed */}
          <div className={cn(
            "flex-1 min-w-0 relative",
          )}>
            {/* Mobile Filter Button */}
            <div className={cn(
              "lg:hidden mb-4 transition-all duration-300",
              isQuotaExceededForFreeUser && "opacity-60 blur-[1.5px] pointer-events-none select-none"
            )}>
              <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="w-full justify-between bg-card text-sm">
                    <span className="flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      Filters
                    </span>
                    {activeFilterCount > 0 && (
                      <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                        {activeFilterCount}
                      </span>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[85vw] max-w-sm bg-background p-4">
                  <div className="mt-4">
                    <FilterSidebar
                      selectedTypes={selectedTypes}
                      selectedStates={selectedStates}
                      onTypeChange={setSelectedTypes}
                      onStateChange={setSelectedStates}
                      onClearFilters={clearFilters}
                    />
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Results Header */}
            <div className={cn(
              "flex items-center justify-between mb-4 md:mb-6 transition-all duration-300",
              isQuotaExceededForFreeUser && "opacity-50 blur-[1px] pointer-events-none select-none"
            )}>
              <h2 className="font-display text-lg md:text-xl font-semibold text-foreground">
                {opportunities?.length ?? 0} Opportunities
              </h2>
            </div>

            {/* Opportunity Cards + blur overlay when quota exhausted */}
            <div className="relative">
              <div className={cn(
                "transition-all duration-500",
                isQuotaExceededForFreeUser && "blur-[6px] opacity-70 pointer-events-none select-none"
              )}
                style={{
                  // Apply a cool blue tint filter when locked
                  filter: isQuotaExceededForFreeUser
                    ? "blur(6px) hue-rotate(180deg) saturate(0.7) brightness(0.85)"
                    : undefined,
                }}
              >
                <OpportunityGrid opportunities={opportunities} isLoading={isLoading} />
              </div>

              {/* Blue-tinted paywall overlay for exhausted free users */}
              {isQuotaExceededForFreeUser && (
                <div className="absolute inset-0 z-10 flex items-start justify-center py-10 sm:py-16 pointer-events-auto">
                  <div className="relative w-[92%] max-w-md mx-auto rounded-2xl border border-blue-300/50 bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50 dark:from-blue-950/70 dark:via-indigo-950/60 dark:to-sky-950/50 shadow-2xl shadow-blue-500/20 backdrop-blur-sm p-5 sm:p-7 animate-fade-up">
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                      <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/40 border-2 border-white">
                        <AlertTriangle className="h-6 w-6 text-white" />
                      </div>
                    </div>

                    <div className="text-center pt-3 space-y-3">
                      <div>
                        <span className="inline-block px-3 py-1 rounded-full bg-blue-200/70 dark:bg-blue-500/20 text-blue-700 dark:text-blue-200 text-xs font-semibold tracking-wide uppercase">
                          Free Plan — Limit Reached
                        </span>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-display font-bold text-blue-900 dark:text-blue-50">
                        You&apos;ve Used All {FREE_MONTHLY_APPLICATIONS} Applications This Month
                      </h3>
                      <p className="text-sm text-blue-800/80 dark:text-blue-200/80 max-w-xs mx-auto">
                        Your opportunities feed is temporarily blurred on the free plan. Upgrade to Premium to instantly unlock browsing & apply to every listing.
                      </p>

                      <div className="rounded-xl bg-white/70 dark:bg-white/10 border border-blue-200/50 dark:border-white/10 p-3 text-left space-y-1.5 text-sm">
                        <div className="flex items-start gap-2">
                          <Crown className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                          <span className="text-blue-900 dark:text-blue-100">
                            <strong>Premium — ₦430 / month</strong>
                          </span>
                        </div>
                        <ul className="pl-6 space-y-1 text-blue-800/80 dark:text-blue-200/80 text-xs">
                          <li>• Unlimited applications to every job, grant & scholarship</li>
                          <li>• AI opportunity matching ranked for your profile</li>
                          <li>• SMS alerts & early access to new listings</li>
                        </ul>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2 pt-1">
                        <Button
                          onClick={() => initializePayment.mutate({})}
                          className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-md shadow-amber-500/20 gap-2"
                        >
                          <Crown className="h-4 w-4" />
                          Upgrade Now
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => onModalChange(true)}
                          className="flex-1 bg-white/60 hover:bg-white border-blue-200 text-blue-800"
                        >
                          See Quota Details
                        </Button>
                      </div>

                      <p className="text-[11px] text-blue-700/70 dark:text-blue-300/60">
                        {quota?.daysUntilReset != null && quota.daysUntilReset > 0 && (
                          <>Resets automatically in <strong>{quota.daysUntilReset} day{quota.daysUntilReset !== 1 ? "s" : ""}</strong></>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Welcome / reminder / exceeded quota popup */}
      <QuotaWelcomeModal
        open={modalOpen}
        onOpenChange={onModalChange}
        quota={quota ?? null}
        onUpgrade={handleQuotaUpgrade}
      />
    </div>
  );
}
