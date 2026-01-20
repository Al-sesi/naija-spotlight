import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { OWNER_EMAILS } from "@/lib/constants";
import { useToast } from "./use-toast";

export interface SubscriptionData {
  subscription_status: string;
  plan_type: string | null;
  trial_ends_at: string | null;
  subscription_started_at: string | null;
  subscription_ends_at: string | null;
  paystack_subscription_code: string | null;
  premium_categories: string[];
  verification_trial_ends_at: string | null;
  roles: string[];
}

export function useSubscription() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["subscription", user?.id],
    queryFn: async (): Promise<SubscriptionData | null> => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("subscription_status, plan_type, trial_ends_at, subscription_started_at, subscription_ends_at, paystack_subscription_code, premium_categories, verification_trial_ends_at")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Error fetching subscription:", error);
        return null;
      }

      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const roles = rolesData?.map((r) => r.role) ?? [];

      // Type assertion for fields that might be missing in the generated types but exist in DB
      const profileData = data as {
        subscription_status: string;
        plan_type: string | null;
        trial_ends_at: string | null;
        subscription_started_at: string | null;
        subscription_ends_at: string | null;
        paystack_subscription_code: string | null;
        premium_categories?: string[] | null;
        verification_trial_ends_at?: string | null;
      };

      return {
        subscription_status: profileData.subscription_status,
        plan_type: profileData.plan_type,
        trial_ends_at: profileData.trial_ends_at,
        subscription_started_at: profileData.subscription_started_at,
        subscription_ends_at: profileData.subscription_ends_at,
        paystack_subscription_code: profileData.paystack_subscription_code,
        premium_categories: profileData.premium_categories ?? [],
        verification_trial_ends_at: profileData.verification_trial_ends_at ?? null,
        roles,
      };
    },
    enabled: !!user,
  });
}

export function useIsPremium() {
  const { data: subscription, isLoading } = useSubscription();
  const { user } = useAuth();

  const now = new Date();

  const isAdmin = subscription?.roles?.includes("admin") ?? false;
  const isOwner =
    OWNER_EMAILS.includes((user?.email || "").toLowerCase()) || isAdmin;

  const isPremium =
    isOwner ||
    (!!subscription &&
      (subscription.subscription_status === "active" ||
        (subscription.trial_ends_at ? new Date(subscription.trial_ends_at) > now : false)));

  const isUltra = isOwner || (isPremium && subscription?.plan_type === 'ultra');


  const hasVerificationAccess =
    isPremium ||
    (subscription?.verification_trial_ends_at
      ? new Date(subscription.verification_trial_ends_at) > now
      : false);

  return { isPremium, isUltra, hasVerificationAccess, isLoading };
}

export function useInitializePayment() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ plan, categories, planTier }: { plan?: string; categories?: string[]; planTier?: "basic" | "ultra" }) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("paystack-initialize", {
        body: { plan, categories: categories ?? [], planTier },
      });

      if (response.error) {
        throw new Error(response.error.message || "Payment initialization failed");
      }

      return response.data;
    },
    onSuccess: (data) => {
      // Redirect to Paystack checkout
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Payment Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useCancelSubscription() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("paystack-cancel");

      if (response.error) {
        throw new Error(response.error.message || "Cancellation failed");
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
      toast({
        title: "Subscription Cancelled",
        description: "Your subscription has been cancelled. You'll retain access until the end of your billing period.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Cancellation Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
