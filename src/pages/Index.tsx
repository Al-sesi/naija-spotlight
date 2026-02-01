import { useState } from "react";
import { Search, Filter, Briefcase, GraduationCap, Zap, Users, Award, PartyPopper, X, Trophy, Compass } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useOpportunities } from "@/hooks/useOpportunities";
import { useSiteAlert } from "@/hooks/useSiteAlert";
import { FilterSidebar } from "@/components/opportunities/FilterSidebar";
import { OpportunityGrid } from "@/components/opportunities/OpportunityGrid";
import { OpportunityType } from "@/lib/constants";
import { cn } from "@/lib/utils";

const quickCategories = [
  { type: "recruitment", label: "Recruitments", icon: Briefcase },
  { type: "internship", label: "Internships", icon: Compass },
  { type: "scholarship", label: "Scholarships", icon: GraduationCap },
  { type: "competition", label: "Competitions", icon: Trophy },
  { type: "ngo", label: "Grants", icon: Award },
  { type: "tech", label: "Tech Events", icon: Zap },
  { type: "social", label: "Social Events", icon: PartyPopper },
  { type: "career", label: "Career", icon: Users },
];

export default function Index() {
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

  const clearFilters = () => {
    setSelectedTypes([]);
    setSelectedStates([]);
    setSearch("");
  };

  const activeFilterCount = selectedTypes.length + selectedStates.length;

  const handleQuickFilter = (type: OpportunityType) => {
    if (selectedTypes.includes(type)) {
      setSelectedTypes(selectedTypes.filter(t => t !== type));
    } else {
      setSelectedTypes([type]);
    }
  };

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
      <section className="py-8 md:py-12 border-b border-border/30">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center mb-6 md:mb-8">
            <h1 className="text-2xl md:text-4xl lg:text-5xl font-display font-bold mb-3 md:mb-4 leading-tight text-foreground">
              Discover Opportunities <br className="hidden md:block" />
              Across Nigeria
            </h1>
            <p className="text-sm md:text-lg text-muted-foreground max-w-2xl mx-auto">
              Find verified scholarships, government initiatives, grants, tech events, and more—all in one place.
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative max-w-xl mx-auto mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
            <Input
              placeholder="Search opportunities..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 md:h-12 pl-11 md:pl-12 pr-4 text-sm md:text-base bg-card border-border shadow-sm placeholder:text-muted-foreground"
            />
          </div>

          {/* Quick Category Chips */}
          <div className="flex flex-wrap justify-center gap-2 md:gap-3">
            {quickCategories.map((cat) => {
              const isActive = selectedTypes.includes(cat.type as OpportunityType);
              return (
                <Button
                  key={cat.type}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleQuickFilter(cat.type as OpportunityType)}
                  className={cn(
                    "text-xs md:text-sm gap-1.5 h-8 md:h-9",
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
      <section className="container py-6 md:py-8">
        <div className="flex gap-6 lg:gap-8">
          {/* Desktop Filter Sidebar */}
          <div className="hidden lg:block w-64 shrink-0">
            <FilterSidebar
              selectedTypes={selectedTypes}
              selectedStates={selectedStates}
              onTypeChange={setSelectedTypes}
              onStateChange={setSelectedStates}
              onClearFilters={clearFilters}
            />
          </div>

          {/* Feed */}
          <div className="flex-1 min-w-0">
            {/* Mobile Filter Button */}
            <div className="lg:hidden mb-4">
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
                <SheetContent side="left" className="w-80 bg-background p-4">
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
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <h2 className="font-display text-lg md:text-xl font-semibold text-foreground">
                {opportunities?.length ?? 0} Opportunities
              </h2>
            </div>

            {/* Opportunity Cards */}
            <OpportunityGrid opportunities={opportunities} isLoading={isLoading} />
          </div>
        </div>
      </section>
    </div>
  );
}