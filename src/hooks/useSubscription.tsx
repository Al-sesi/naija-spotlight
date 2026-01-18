import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
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

      return {
        subscription_status: data.subscription_status,
        plan_type: data.plan_type,
        trial_ends_at: data.trial_ends_at,
        subscription_started_at: data.subscription_started_at,
        subscription_ends_at: data.subscription_ends_at,
        paystack_subscription_code: data.paystack_subscription_code,
        premium_categories: (data as any).premium_categories ?? [],
        verification_trial_ends_at: (data as any).verification_trial_ends_at ?? null,
      };
    },
    enabled: !!user,
  });
}

export function useIsPremium() {
  const { data: subscription, isLoading } = useSubscription();

  const now = new Date();

  const isPremium =
    !!subscription &&
    (subscription.subscription_status === "active" ||
      (subscription.trial_ends_at ? new Date(subscription.trial_ends_at) > now : false));

  const hasVerificationAccess =
    isPremium ||
    (subscription?.verification_trial_ends_at
      ? new Date(subscription.verification_trial_ends_at) > now
      : false);

  return { isPremium, hasVerificationAccess, isLoading };
}

export function useInitializePayment() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ plan, categories }: { plan?: string; categories?: string[] }) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("paystack-initialize", {
        body: { plan, categories: categories ?? [] },
        headers: {
          "x-access-token": session.access_token,
        },
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
