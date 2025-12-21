import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NIGERIAN_STATES, OPPORTUNITY_TYPES, OpportunityType } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface FilterSidebarProps {
  selectedTypes: OpportunityType[];
  selectedStates: string[];
  onTypeChange: (types: OpportunityType[]) => void;
  onStateChange: (states: string[]) => void;
  onClearFilters: () => void;
  className?: string;
}

export function FilterSidebar({
  selectedTypes,
  selectedStates,
  onTypeChange,
  onStateChange,
  onClearFilters,
  className,
}: FilterSidebarProps) {
  const hasFilters = selectedTypes.length > 0 || selectedStates.length > 0;

  const handleTypeToggle = (type: OpportunityType) => {
    if (selectedTypes.includes(type)) {
      onTypeChange(selectedTypes.filter(t => t !== type));
    } else {
      onTypeChange([...selectedTypes, type]);
    }
  };

  const handleStateSelect = (state: string) => {
    if (state === "All States") {
      onStateChange([]);
    } else if (selectedStates.includes(state)) {
      onStateChange(selectedStates.filter(s => s !== state));
    } else {
      onStateChange([...selectedStates, state]);
    }
  };

  return (
    <aside className={cn("w-full", className)}>
      <div className="sticky top-24">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-semibold">Filters</h2>
          {hasFilters && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClearFilters}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>

        {/* State Search */}
        <div className="mb-6">
          <Label className="text-sm font-medium mb-2 block">Search by State</Label>
          <Select
            value={selectedStates.length === 1 ? selectedStates[0] : undefined}
            onValueChange={handleStateSelect}
          >
            <SelectTrigger className="w-full bg-background">
              <SelectValue placeholder="Select a state" />
            </SelectTrigger>
            <SelectContent className="bg-popover max-h-[300px]">
              <ScrollArea className="h-[280px]">
                {NIGERIAN_STATES.map((state) => (
                  <SelectItem key={state} value={state} className="cursor-pointer">
                    {state}
                  </SelectItem>
                ))}
              </ScrollArea>
            </SelectContent>
          </Select>
          {selectedStates.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {selectedStates.map((state) => (
                <Button
                  key={state}
                  variant="secondary"
                  size="sm"
                  onClick={() => handleStateSelect(state)}
                  className="h-7 text-xs"
                >
                  {state}
                  <X className="h-3 w-3 ml-1" />
                </Button>
              ))}
            </div>
          )}
        </div>

        <Separator className="my-4" />

        {/* Opportunity Type */}
        <div>
          <Label className="text-sm font-medium mb-3 block">Opportunity Type</Label>
          <div className="space-y-3">
            {OPPORTUNITY_TYPES.map((type) => (
              <div key={type.value} className="flex items-center space-x-2">
                <Checkbox
                  id={type.value}
                  checked={selectedTypes.includes(type.value)}
                  onCheckedChange={() => handleTypeToggle(type.value)}
                />
                <label
                  htmlFor={type.value}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2"
                >
                  <span 
                    className={cn(
                      "w-2.5 h-2.5 rounded-full",
                      type.value === "government" && "bg-category-government",
                      type.value === "ngo" && "bg-category-ngo",
                      type.value === "tech" && "bg-category-tech",
                      type.value === "career" && "bg-category-career"
                    )}
                  />
                  {type.label}
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
