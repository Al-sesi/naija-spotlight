import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ReferralStat {
  ambassador_id: string;
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
      const { data, error } = await supabase
        .from("referral_stats_detailed")
        .select("*")
        .order("total_referrals", { ascending: false });

      if (error) throw error;
      return data as ReferralStat[];
    },
  });
}
