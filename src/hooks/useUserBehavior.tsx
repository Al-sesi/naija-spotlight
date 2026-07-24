import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Json } from "@/integrations/supabase/types";

type BehaviorType =
  | "view"
  | "save"
  | "apply"
  | "ignore"
  | "click"
  | "share"
  | "dismiss";

export function useUserBehavior() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const trackBehavior = useMutation({
    mutationFn: async ({
      opportunityId,
      behaviorType,
      metadata,
    }: {
      opportunityId: string;
      behaviorType: BehaviorType;
      metadata?: Json;
    }) => {
      void metadata;

      if (!user) {
        return;
      }

      const { error } = await supabase.from("user_behavior").insert({
        user_id: user.id,
        opportunity_id: opportunityId,
        action_type: behaviorType,
      });

      if (error) {
        console.error("Error tracking user behavior:", error);
        throw error;
      }

      return behaviorType;
    },
    onSuccess: (behaviorType) => {
      if (behaviorType !== "view" && user?.id) {
        queryClient.invalidateQueries({ queryKey: ["opportunity-matching", user.id] });
      }
    },
  });

  const trackView = (opportunityId: string, metadata?: Json) => {
    if (user) {
      trackBehavior.mutate({ opportunityId, behaviorType: "view", metadata });
    }
  };

  const trackSave = (opportunityId: string, metadata?: Json) => {
    if (user) {
      trackBehavior.mutate({ opportunityId, behaviorType: "save", metadata });
    }
  };

  const trackApply = (opportunityId: string, metadata?: Json) => {
    if (user) {
      trackBehavior.mutate({ opportunityId, behaviorType: "apply", metadata });
    }
  };

  const trackClick = (opportunityId: string, metadata?: Json) => {
    if (user) {
      trackBehavior.mutate({ opportunityId, behaviorType: "click", metadata });
    }
  };

  const trackIgnore = (opportunityId: string, metadata?: Json) => {
    if (user) {
      trackBehavior.mutate({ opportunityId, behaviorType: "ignore", metadata });
    }
  };

  return {
    trackView,
    trackSave,
    trackApply,
    trackClick,
    trackIgnore,
    isPending: trackBehavior.isPending,
  };
}
