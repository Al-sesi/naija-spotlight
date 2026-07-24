import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useRecommendationAnalytics() {
  return useQuery({
    queryKey: ["admin-analytics"],
    queryFn: async () => {
      // Get total matches
      const { count: totalMatches, error: matchesError } = await supabase
        .from("recommendations")
        .select("*", { count: "exact", head: true });

      // Get total user behavior events
      const { count: totalEvents, error: eventsError } = await supabase
        .from("user_behavior")
        .select("*", { count: "exact", head: true });

      // Get notifications sent
      const { count: totalNotifications, error: notificationsError } = await supabase
        .from("user_notifications")
        .select("*", { count: "exact", head: true });

      // Get top opportunities by behavior
      const { data: topOpportunities, error: topOppsError } = await supabase
        .from("user_behavior")
        .select("opportunity_id, type, opportunities(title, category, provider)")
        .order("created_at", { ascending: false })
        .limit(10);

      if (matchesError || eventsError || notificationsError || topOppsError) {
        console.error("Error fetching analytics:", matchesError || eventsError || notificationsError || topOppsError);
      }

      return {
        totalMatches: totalMatches || 0,
        totalEvents: totalEvents || 0,
        totalNotifications: totalNotifications || 0,
        topOpportunities: topOpportunities || [],
      };
    },
  });
}
