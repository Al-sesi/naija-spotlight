import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { OpportunityType } from "@/lib/constants";

export interface Opportunity {
  id: string;
  title: string;
  provider: string;
  category: OpportunityType;
  description: string | null;
  link: string;
  deadline: string | null;
  event_date: string | null;
  state: string;
  is_verified: boolean;
  is_remote: boolean;
  level: string | null;
  created_at: string;
}

interface OpportunityFilters {
  types: OpportunityType[];
  states: string[];
  search: string;
}

// Natural language search keywords
const searchKeywords = {
  categories: {
    scholarship: ["scholarship", "scholarships", "grant", "grants", "tuition", "fee", "financial aid"],
    recruitment: ["job", "jobs", "recruitment", "recruitments", "work", "career", "employment"],
    internship: ["intern", "interns", "internship", "internships"],
    competition: ["competition", "competitions", "contest", "contests", "hackathon", "hackathons"],
    tech: ["tech", "technology", "event", "events", "workshop", "workshops", "bootcamp", "bootcamps"],
    ngo: ["ngo", "ngos", "non-profit", "nonprofit"],
    career: ["career", "careers", "professional", "professionals"],
    social: ["social", "community", "volunteer", "volunteering"]
  },
  location: {
    remote: ["remote", "work from home", "wfh", "virtual"],
    nationwide: ["nationwide", "all nigeria", "anywhere in nigeria"],
    states: {
      lagos: ["lagos", "lag"],
      abuja: ["abuja", "fct"],
      kano: ["kano"],
      kaduna: ["kaduna"],
      "port harcourt": ["port harcourt", "ph", "rivers"],
      benin: ["benin", "edo"],
      ibadan: ["ibadan", "oyo"],
      enugu: ["enugu"]
    }
  },
  level: {
    entry: ["entry", "entry level", "beginner", "fresh graduate", "new graduate"],
    intermediate: ["intermediate", "mid-level", "associate"],
    professional: ["professional", "senior", "executive", "expert"]
  }
};

function parseNaturalLanguageSearch(search: string): {
  categories: string[],
  locations: string[],
  levels: string[],
  keywords: string
} {
  const lowerSearch = search.toLowerCase();
  const result = {
    categories: [] as string[],
    locations: [] as string[],
    levels: [] as string[],
    keywords: search
  };

  // Check for category keywords
  for (const [category, keywords] of Object.entries(searchKeywords.categories)) {
    if (keywords.some(keyword => lowerSearch.includes(keyword))) {
      result.categories.push(category);
    }
  }

  // Check for location keywords
  if (searchKeywords.location.remote.some(keyword => lowerSearch.includes(keyword))) {
    result.locations.push("Remote");
  }
  for (const [state, keywords] of Object.entries(searchKeywords.location.states)) {
    if (keywords.some(keyword => lowerSearch.includes(keyword))) {
      result.locations.push(state.charAt(0).toUpperCase() + state.slice(1));
    }
  }

  // Check for level keywords
  for (const [level, keywords] of Object.entries(searchKeywords.level)) {
    if (keywords.some(keyword => lowerSearch.includes(keyword))) {
      result.levels.push(level);
    }
  }

  return result;
}

export function useOpportunities(filters: OpportunityFilters) {
  return useQuery({
    queryKey: ["opportunities", filters],
    queryFn: async () => {
      let query = supabase
        .from("opportunities")
        .select("*")
        .order("deadline", { ascending: true, nullsFirst: false });

      // Parse natural language search
      let searchParams = filters.search ? parseNaturalLanguageSearch(filters.search) : null;
      
      // Combine user-selected categories with parsed categories
      let effectiveTypes = [...filters.types];
      let effectiveStates = [...filters.states];
      
      if (searchParams) {
        if (searchParams.categories.length > 0) {
          // Filter by parsed categories
          effectiveTypes = [...new Set([...effectiveTypes, ...searchParams.categories] as OpportunityType[])];
        }
        if (searchParams.locations.length > 0) {
          effectiveStates = [...new Set([...effectiveStates, ...searchParams.locations])];
        }
      }

      if (effectiveTypes.length > 0) {
        query = query.in("category", effectiveTypes);
      }

      if (effectiveStates.length > 0 && !effectiveStates.includes("All States")) {
        const stateFilters = effectiveStates.map(s => {
          if (s === "Remote") return "is_remote.eq.true";
          if (s === "Nationwide") return "state.eq.Nationwide";
          return `state.eq.${s}`;
        });
        
        // Handle state filtering with OR conditions
        if (effectiveStates.includes("Remote")) {
          query = query.or(`is_remote.eq.true,state.in.(${effectiveStates.filter(s => s !== "Remote").join(",")}),state.eq.Nationwide`);
        } else {
          query = query.or(`state.in.(${effectiveStates.join(",")}),state.eq.Nationwide`);
        }
      }

      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,provider.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Smart sorting: active (future deadline) at top, expired at bottom
      const now = new Date();
      const sorted = ((data || []) as Opportunity[]).sort((a, b) => {
        const aDeadline = a.deadline ? new Date(a.deadline) : null;
        const bDeadline = b.deadline ? new Date(b.deadline) : null;
        
        const aExpired = aDeadline ? aDeadline < now : false;
        const bExpired = bDeadline ? bDeadline < now : false;
        
        // Active opportunities first, expired at the bottom
        if (aExpired !== bExpired) {
          return aExpired ? 1 : -1;
        }
        
        // Within same group, sort by deadline (soonest first for active, most recent for expired)
        if (aDeadline && bDeadline) {
          return aExpired 
            ? bDeadline.getTime() - aDeadline.getTime() // Expired: most recently expired first
            : aDeadline.getTime() - bDeadline.getTime(); // Active: soonest deadline first
        }
        
        // Opportunities with deadlines come before those without
        if (aDeadline && !bDeadline) return -1;
        if (!aDeadline && bDeadline) return 1;
        
        // Fallback to created_at for opportunities without deadlines
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      
      return sorted;
    },
  });
}

export function useCreateOpportunity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (opportunity: Omit<Opportunity, "id" | "created_at">) => {
      const { data, error } = await supabase
        .from("opportunities")
        .insert(opportunity)
        .select()
        .single();

      if (error) throw error;
      return data as Opportunity;
    },
    onSuccess: async (created) => {
      const { data, error } = await supabase.functions.invoke("notify-new-opportunity", {
        body: { opportunity: created },
      });

      if (error) {
        console.error("notify-new-opportunity error", error, "response data:", data);
      }

      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
    },
  });
}

export function useDeleteOpportunity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("opportunities")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
    },
  });
}

export function useUpdateOpportunity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<Opportunity>) => {
      const { data, error } = await supabase
        .from("opportunities")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
    },
  });
}
