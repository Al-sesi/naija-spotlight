import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { ApplicationStatus } from "@/lib/constants";

export interface UserApplication {
  id: string;
  user_id: string;
  opportunity_id: string;
  status: ApplicationStatus;
  applied_at: string;
  notes: string | null;
  opportunity?: {
    id: string;
    title: string;
    provider: string;
    category: string;
    link: string;
    deadline: string | null;
    state: string;
  };
}

export function useUserApplications() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-applications", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("user_applications")
        .select(`
          *,
          opportunity:opportunities(id, title, provider, category, link, deadline, state)
        `)
        .eq("user_id", user.id)
        .order("applied_at", { ascending: false });

      if (error) throw error;
      return data as UserApplication[];
    },
    enabled: !!user,
  });
}

export function useSaveApplication() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ opportunityId, status = "saved" }: { opportunityId: string; status?: ApplicationStatus }) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("user_applications")
        .upsert({
          user_id: user.id,
          opportunity_id: opportunityId,
          status,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-applications"] });
    },
  });
}

export function useUpdateApplicationStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ApplicationStatus }) => {
      const { data, error } = await supabase
        .from("user_applications")
        .update({ status })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-applications"] });
    },
  });
}

export function useRemoveApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("user_applications")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-applications"] });
    },
  });
}
