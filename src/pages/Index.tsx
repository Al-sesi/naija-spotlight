import { useState } from "react";
import { Search, Filter, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useOpportunities } from "@/hooks/useOpportunities";
import { FilterSidebar } from "@/components/opportunities/FilterSidebar";
import { OpportunityGrid } from "@/components/opportunities/OpportunityGrid";
import { OpportunityType } from "@/lib/constants";

export default function Index() {
  const [search, setSearch] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<OpportunityType[]>([]);
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);

  const { data: opportunities, isLoading } = useOpportunities({
    types: selectedTypes,
    states: selectedStates,
    search,
  });

  const clearFilters = () => {
    setSelectedTypes([]);
    setSelectedStates([]);
    setSearch("");
  };

  const activeFilterCount = selectedTypes.length + selectedStates.length;

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative gradient-hero py-16 md:py-24">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <div className="container relative">
          <div className="max-w-3xl mx-auto text-center text-primary-foreground">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-foreground/10 backdrop-blur-sm mb-6">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-medium">Your Gateway to Opportunities</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-4 leading-tight">
              Discover Opportunities <br className="hidden md:block" />
              Across Nigeria
            </h1>
            <p className="text-lg md:text-xl opacity-90 mb-8 max-w-2xl mx-auto">
              Find government initiatives, NGO grants, tech events, and career opportunities—all in one place.
            </p>

            {/* Search Bar */}
            <div className="relative max-w-xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search opportunities, providers, keywords..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-14 pl-12 pr-4 text-base bg-background/95 backdrop-blur border-0 shadow-lg text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="container py-8 md:py-12">
        <div className="flex gap-8">
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
          <div className="flex-1">
            {/* Mobile Filter Button */}
            <div className="lg:hidden mb-4">
              <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
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
                <SheetContent side="left" className="w-80 bg-background">
                  <div className="mt-6">
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
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-xl font-semibold">
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
