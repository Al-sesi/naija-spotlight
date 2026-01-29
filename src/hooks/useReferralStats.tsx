import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ReferralStat {
  ambassador_name: string;
  ambassador_email: string;
  referral_code: string;
  total_referrals: number;
  active_subscriptions: number;
  trial_users: number;
}

export function useReferralStats() {
  return useQuery({
    queryKey: ["referral-stats"],
    queryFn: async () => {
      // TODO: Implement actual data fetching when the backend view/function is ready
      // This is a placeholder to fix the build error
      console.log("Fetching referral stats...");
      
      // Mock data for development if needed, or just return empty
      return [] as ReferralStat[];
    },
  });
}
