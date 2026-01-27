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

export function useOpportunities(filters: OpportunityFilters, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["opportunities", filters],
    enabled: options?.enabled,
    queryFn: async () => {
      let query = supabase
        .from("opportunities")
        .select("*")
        .order("deadline", { ascending: true, nullsFirst: false });

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
      if (error) {
        console.error("Error fetching opportunities:", error);
        throw error;
      }
      
      // Smart sorting: active (future deadline) at top, expired at bottom
      const now = new Date();
      const safeData = data || [];
      const sorted = (safeData as Opportunity[]).sort((a, b) => {
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
