import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ReferralStat {
  user_id: string;
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
      console.log("Fetching referral stats for all users...");

      // 1. Fetch ALL users with a referral_code (not just ambassadors)
      const { data: referrers, error: referrerError } = await supabase
        .from("profiles")
        .select("id, full_name, email, referral_code")
        .not("referral_code", "is", null);

      if (referrerError) {
        console.error("Error fetching referrers:", referrerError);
        throw referrerError;
      }

      if (!referrers || referrers.length === 0) {
        return [];
      }

      // 2. Fetch all users who were referred
      const { data: referrals, error: referralError } = await supabase
        .from("profiles")
        .select("referred_by, subscription_status")
        .not("referred_by", "is", null);

      if (referralError) {
        console.error("Error fetching referrals:", referralError);
        throw referralError;
      }

      // 3. Aggregate stats grouped by referral_code
      const statsMap = new Map<string, { total: number; active: number; trial: number }>();

      referrals?.forEach((user) => {
        const code = user.referred_by;
        if (!code) return;

        if (!statsMap.has(code)) {
          statsMap.set(code, { total: 0, active: 0, trial: 0 });
        }

        const stat = statsMap.get(code)!;
        stat.total += 1;

        // Use subscription_status = 'active' as the paid indicator
        if (user.subscription_status === "active") {
          stat.active += 1;
        } else {
          stat.trial += 1;
        }
      });

      // 4. Map referrers to their stats
      const results: ReferralStat[] = referrers.map((ref) => {
        const code = ref.referral_code || "";
        const stat = statsMap.get(code) || { total: 0, active: 0, trial: 0 };

        return {
          user_id: ref.id,
          ambassador_name: ref.full_name || "Unknown",
          ambassador_email: ref.email || "No Email",
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

// Hook for a single user to view their own referral stats
export function useMyReferralStats(userId: string | undefined) {
  return useQuery({
    queryKey: ["my-referral-stats", userId],
    enabled: !!userId,
    queryFn: async () => {
      // Get my referral code
      const { data: me, error: meError } = await supabase
        .from("profiles")
        .select("referral_code, full_name, email")
        .eq("id", userId!)
        .maybeSingle();

      if (meError) throw meError;
      if (!me?.referral_code) {
        return {
          referral_code: null as string | null,
          total_referrals: 0,
          active_subscriptions: 0,
          trial_users: 0,
        };
      }

      // Get everyone I referred
      const { data: referrals, error: refError } = await supabase
        .from("profiles")
        .select("subscription_status")
        .eq("referred_by", me.referral_code);

      if (refError) throw refError;

      let active = 0;
      let trial = 0;
      (referrals || []).forEach((u) => {
        if (u.subscription_status === "active") active += 1;
        else trial += 1;
      });

      return {
        referral_code: me.referral_code,
        total_referrals: (referrals || []).length,
        active_subscriptions: active,
        trial_users: trial,
      };
    },
  });
}
