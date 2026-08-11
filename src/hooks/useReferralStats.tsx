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
  link_clicks: number;
  click_to_signup_rate: number;
}

export interface TrackingFailure {
  id: string;
  failure_type: string;
  referral_code: string | null;
  error_message: string | null;
  created_at: string;
}

export function useReferralStats() {
  return useQuery({
    queryKey: ["referral-stats"],
    queryFn: async () => {
      console.log("Fetching referral stats for all users...");

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

      const { data: referrals, error: referralError } = await supabase
        .from("profiles")
        .select("referred_by, subscription_status")
        .not("referred_by", "is", null);

      if (referralError) {
        console.error("Error fetching referrals:", referralError);
        throw referralError;
      }

      let clicks: any[] = [];
      try {
        const { data: clicksData } = await supabase
          .from("referral_link_clicks")
          .select("referral_code");
        clicks = clicksData || [];
      } catch (e) {
        console.warn("Click tracking table may not exist yet, skipping:", e);
      }

      const statsMap = new Map<string, { total: number; active: number; trial: number; clicks: number }>();

      referrals?.forEach((user) => {
        const code = user.referred_by;
        if (!code) return;

        if (!statsMap.has(code)) {
          statsMap.set(code, { total: 0, active: 0, trial: 0, clicks: 0 });
        }

        const stat = statsMap.get(code)!;
        stat.total += 1;

        if (user.subscription_status === "active") {
          stat.active += 1;
        } else {
          stat.trial += 1;
        }
      });

      clicks.forEach((c) => {
        const code = c.referral_code;
        if (!code) return;
        if (!statsMap.has(code)) {
          statsMap.set(code, { total: 0, active: 0, trial: 0, clicks: 0 });
        }
        statsMap.get(code)!.clicks += 1;
      });

      const results: ReferralStat[] = referrers.map((ref) => {
        const code = ref.referral_code || "";
        const stat = statsMap.get(code) || { total: 0, active: 0, trial: 0, clicks: 0 };
        const rate = stat.clicks > 0 ? (stat.total / stat.clicks) * 100 : 0;

        return {
          user_id: ref.id,
          ambassador_name: ref.full_name || "Unknown",
          ambassador_email: ref.email || "No Email",
          referral_code: code,
          total_referrals: stat.total,
          active_subscriptions: stat.active,
          trial_users: stat.trial,
          link_clicks: stat.clicks,
          click_to_signup_rate: Math.round(rate * 10) / 10,
        };
      });

      return results;
    },
  });
}

export function useReferralTrackingFailures(enabled = true) {
  return useQuery({
    queryKey: ["referral-tracking-failures"],
    enabled,
    staleTime: 60000,
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("referral_tracking_failures")
          .select("*")
          .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .order("created_at", { ascending: false })
          .limit(50);

        if (error) {
          console.warn("Tracking failures table may not exist yet:", error);
          return [];
        }
        return (data || []) as TrackingFailure[];
      } catch (e) {
        console.warn("Failed to fetch tracking failures:", e);
        return [];
      }
    },
  });
}

export function useMyReferralStats(userId: string | undefined) {
  return useQuery({
    queryKey: ["my-referral-stats", userId],
    enabled: !!userId,
    queryFn: async () => {
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
          link_clicks: 0,
          click_to_signup_rate: 0,
        };
      }

      const { data: referrals, error: refError } = await supabase
        .from("profiles")
        .select("subscription_status")
        .eq("referred_by", me.referral_code);

      if (refError) throw refError;

      let linkClicks = 0;
      try {
        const { count } = await supabase
          .from("referral_link_clicks")
          .select("*", { count: "exact", head: true })
          .eq("referral_code", me.referral_code);
        linkClicks = count || 0;
      } catch (e) {
        console.warn("Click tracking not available:", e);
      }

      let active = 0;
      let trial = 0;
      (referrals || []).forEach((u) => {
        if (u.subscription_status === "active") active += 1;
        else trial += 1;
      });

      const total = (referrals || []).length;
      const rate = linkClicks > 0 ? (total / linkClicks) * 100 : 0;

      return {
        referral_code: me.referral_code,
        total_referrals: total,
        active_subscriptions: active,
        trial_users: trial,
        link_clicks: linkClicks,
        click_to_signup_rate: Math.round(rate * 10) / 10,
      };
    },
  });
}
