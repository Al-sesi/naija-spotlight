import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";
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

  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

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
      const currentUser = userRef.current;
      if (!currentUser) {
        return;
      }

      const { error } = await supabase.from("user_behavior").insert({
        user_id: currentUser.id,
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
      const currentUser = userRef.current;
      if (behaviorType !== "view" && currentUser?.id) {
        void queryClient.invalidateQueries({ queryKey: ["opportunity-matching", currentUser.id] });
      }
    },
  });

  const mutateRef = useRef(trackBehavior.mutate);
  useEffect(() => {
    mutateRef.current = trackBehavior.mutate;
  }, [trackBehavior.mutate]);

  const stableMutate = useCallback((
    opportunityId: string, behaviorType: BehaviorType, metadata?: Json) => {
    mutateRef.current({ opportunityId, behaviorType, metadata });
  }, []);

  const trackView = useCallback((opportunityId: string, metadata?: Json) => {
    if (userRef.current) {
      stableMutate(opportunityId, "view", metadata);
    }
  }, [stableMutate]);

  const trackSave = useCallback((opportunityId: string, metadata?: Json) => {
    if (userRef.current) {
      stableMutate(opportunityId, "save", metadata);
    }
  }, [stableMutate]);

  const trackApply = useCallback((opportunityId: string, metadata?: Json) => {
    if (userRef.current) {
      stableMutate(opportunityId, "apply", metadata);
    }
  }, [stableMutate]);

  const trackClick = useCallback((opportunityId: string, metadata?: Json) => {
    if (userRef.current) {
      stableMutate(opportunityId, "click", metadata);
    }
  }, [stableMutate]);

  const trackIgnore = useCallback((opportunityId: string, metadata?: Json) => {
    if (userRef.current) {
      stableMutate(opportunityId, "ignore", metadata);
    }
  }, [stableMutate]);

  return {
    trackView,
    trackSave,
    trackApply,
    trackClick,
    trackIgnore,
    isPending: trackBehavior.isPending,
  };
}
