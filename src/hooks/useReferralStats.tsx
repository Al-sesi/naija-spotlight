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
      console.log("Fetching referral stats...");

      // 1. Fetch all ambassadors
      const { data: ambassadors, error: ambassadorError } = await supabase
        .from("profiles")
        .select("full_name, email, referral_code")
        .eq("role", "ambassador");

      if (ambassadorError) {
        console.error("Error fetching ambassadors:", ambassadorError);
        throw ambassadorError;
      }

      if (!ambassadors || ambassadors.length === 0) {
        return [];
      }

      // 2. Fetch all users who were referred
      // We only need the referred_by code and their plan status
      const { data: referrals, error: referralError } = await supabase
        .from("profiles")
        .select("referred_by, plan_type")
        .not("referred_by", "is", null);

      if (referralError) {
        console.error("Error fetching referrals:", referralError);
        throw referralError;
      }

      // 3. Aggregate stats
      const statsMap = new Map<string, { total: number; active: number; trial: number }>();

      referrals?.forEach((user) => {
        const code = user.referred_by;
        if (!code) return;

        if (!statsMap.has(code)) {
          statsMap.set(code, { total: 0, active: 0, trial: 0 });
        }

        const stat = statsMap.get(code)!;
        stat.total += 1;

        // Assuming 'premium_lifter' is the active plan type based on project context
        if (user.plan_type === "premium_lifter") {
          stat.active += 1;
        } else {
          stat.trial += 1;
        }
      });

      // 4. Map ambassadors to stats
      const results: ReferralStat[] = ambassadors.map((amb) => {
        const code = amb.referral_code || "";
        const stat = statsMap.get(code) || { total: 0, active: 0, trial: 0 };

        return {
          ambassador_name: amb.full_name || "Unknown",
          ambassador_email: amb.email || "No Email",
          referral_code: code,
          total_referrals: stat.total,
          active_subscriptions: stat.active,
          trial_users: stat.trial,
        };
      });

      return results;
    },
  });
}
