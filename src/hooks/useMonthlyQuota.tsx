import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useIsPremium } from "./useSubscription";

export const FREE_MONTHLY_APPLICATIONS = 5;

export interface MonthlyQuota {
  applicationsThisMonth: number;
  quotaResetAt: Date | null;
  limit: number;
  remaining: number;
  isQuotaExceeded: boolean;
  daysUntilReset: number | null;
}

export function useMonthlyQuota() {
  const { user } = useAuth();
  const { isPremium } = useIsPremium();
  const queryClient = useQueryClient();

  const { data, isLoading, ...rest } = useQuery({
    queryKey: ["monthly-quota", user?.id],
    queryFn: async (): Promise<MonthlyQuota | null> => {
      if (!user) return null;

      // Premium users have unlimited applications
      if (isPremium) {
        return {
          applicationsThisMonth: 0,
          quotaResetAt: null,
          limit: Infinity,
          remaining: Infinity,
          isQuotaExceeded: false,
          daysUntilReset: null,
        };
      }

      // Reset quota server-side if it has expired
      try {
        const { error: rpcError } = await supabase.rpc("reset_quota_if_expired", {
          p_user_id: user.id,
        });
        if (rpcError) {
          console.warn("reset_quota_if_expired RPC failed:", rpcError);
        }
      } catch (e) {
        // If function does not exist yet (e.g., migration not applied),
        // we fall back gracefully — count logic still displays.
        console.warn("Quota reset RPC skipped:", e);
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("applications_this_month, quota_reset_at")
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;

      const applicationsThisMonth = profile?.applications_this_month ?? 0;
      const quotaResetAtStr = profile?.quota_reset_at ?? null;
      const quotaResetAt = quotaResetAtStr ? new Date(quotaResetAtStr) : null;

      let daysUntilReset: number | null = null;
      if (quotaResetAt) {
        const ms = quotaResetAt.getTime() - Date.now();
        daysUntilReset = Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
      }

      const remaining = Math.max(
        0,
        FREE_MONTHLY_APPLICATIONS - applicationsThisMonth
      );

      return {
        applicationsThisMonth,
        quotaResetAt,
        limit: FREE_MONTHLY_APPLICATIONS,
        remaining,
        isQuotaExceeded: remaining <= 0,
        daysUntilReset,
      };
    },
    enabled: !!user,
    staleTime: 1000 * 30, // 30s
  });

  /** Call this immediately after a user successfully applies to an opportunity */
  function incrementQuotaOptimistic() {
    queryClient.setQueryData<MonthlyQuota | null>(
      ["monthly-quota", user?.id],
      (prev) => {
        if (!prev) return prev;
        if (prev.limit === Infinity) return prev;
        const nextApplied = prev.applicationsThisMonth + 1;
        const remaining = Math.max(0, FREE_MONTHLY_APPLICATIONS - nextApplied);
        return {
          ...prev,
          applicationsThisMonth: nextApplied,
          remaining,
          isQuotaExceeded: remaining <= 0,
        };
      }
    );
    void queryClient.invalidateQueries({ queryKey: ["monthly-quota"] });
    void queryClient.invalidateQueries({ queryKey: ["user-profile"] });
  }

  return {
    data,
    isLoading,
    incrementQuotaOptimistic,
    refetch: rest.refetch,
    ...rest,
  };
}
