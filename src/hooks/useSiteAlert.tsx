import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SiteAlert {
  id: string;
  message: string;
  is_active: boolean;
  type: "info" | "warning" | "success";
  created_at: string;
  updated_at: string;
}

export function useSiteAlert() {
  return useQuery({
    queryKey: ["site-alert"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_alerts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as SiteAlert | null;
    },
  });
}

export function useUpdateSiteAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (alert: { message: string; is_active: boolean; type: "info" | "warning" | "success" }) => {
      // Get existing alert
      const { data: existing } = await supabase
        .from("site_alerts")
        .select("id")
        .limit(1)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from("site_alerts")
          .update({
            message: alert.message,
            is_active: alert.is_active,
            type: alert.type,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
        
        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from("site_alerts")
          .insert({
            message: alert.message,
            is_active: alert.is_active,
            type: alert.type,
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-alert"] });
    },
  });
}
