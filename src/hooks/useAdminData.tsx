import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PendingPost {
  id: string;
  user_id: string;
  content: string;
  status: string;
  created_at: string;
  profile?: {
    full_name: string | null;
    email: string | null;
  } | null;
}

export interface RegisteredUser {
  id: string;
  full_name: string | null;
  email: string | null;
  created_at: string | null;
}

export function usePendingPosts() {
  return useQuery({
    queryKey: ["pending-posts"],
    queryFn: async () => {
      const { data: posts, error } = await supabase
        .from("community_posts")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch profiles separately
      const userIds = [...new Set(posts?.map(p => p.user_id) || [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return posts?.map(post => ({
        ...post,
        profile: profileMap.get(post.user_id) || null,
      })) as PendingPost[];
    },
  });
}

export function useApprovePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase
        .from("community_posts")
        .update({ status: "approved" })
        .eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-posts"] });
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
    },
  });
}

export function useRejectPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase
        .from("community_posts")
        .delete()
        .eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-posts"] });
    },
  });
}

export function useRegisteredUsers() {
  return useQuery({
    queryKey: ["registered-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as RegisteredUser[];
    },
  });
}
