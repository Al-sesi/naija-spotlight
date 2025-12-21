import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { OpportunityType, NigerianState } from "@/lib/constants";

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
  created_at: string;
}

interface OpportunityFilters {
  types: OpportunityType[];
  states: string[];
  search: string;
}

export function useOpportunities(filters: OpportunityFilters) {
  return useQuery({
    queryKey: ["opportunities", filters],
    queryFn: async () => {
      let query = supabase
        .from("opportunities")
        .select("*")
        .order("created_at", { ascending: false });

      if (filters.types.length > 0) {
        query = query.in("category", filters.types);
      }

      if (filters.states.length > 0 && !filters.states.includes("All States")) {
        const stateFilters = filters.states.map(s => {
          if (s === "Remote") return "is_remote.eq.true";
          if (s === "Nationwide") return "state.eq.Nationwide";
          return `state.eq.${s}`;
        });
        
        // Handle state filtering with OR conditions
        if (filters.states.includes("Remote")) {
          query = query.or(`is_remote.eq.true,state.in.(${filters.states.filter(s => s !== "Remote").join(",")}),state.eq.Nationwide`);
        } else {
          query = query.or(`state.in.(${filters.states.join(",")}),state.eq.Nationwide`);
        }
      }

      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,provider.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Opportunity[];
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
      return data;
    },
    onSuccess: () => {
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
