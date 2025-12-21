import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface CommunityPost {
  id: string;
  user_id: string;
  content: string;
  likes_count: number;
  created_at: string;
  profile?: {
    full_name: string | null;
    email: string | null;
  } | null;
  user_liked?: boolean;
}

export function useCommunityPosts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["community-posts"],
    queryFn: async () => {
      const { data: posts, error } = await supabase
        .from("community_posts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch profiles separately
      const userIds = [...new Set(posts?.map(p => p.user_id) || [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Check if current user has liked each post
      let likedPostIds = new Set<string>();
      if (user) {
        const { data: likes } = await supabase
          .from("post_likes")
          .select("post_id")
          .eq("user_id", user.id);
        likedPostIds = new Set(likes?.map(l => l.post_id) || []);
      }

      return posts?.map(post => ({
        ...post,
        profile: profileMap.get(post.user_id) || null,
        user_liked: likedPostIds.has(post.id),
      })) as CommunityPost[];
    },
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (content: string) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("community_posts")
        .insert({ user_id: user.id, content })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
    },
  });
}

export function useToggleLike() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ postId, isLiked }: { postId: string; isLiked: boolean }) => {
      if (!user) throw new Error("Not authenticated");

      if (isLiked) {
        await supabase.from("post_likes").delete().eq("user_id", user.id).eq("post_id", postId);
      } else {
        await supabase.from("post_likes").insert({ user_id: user.id, post_id: postId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
    },
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("community_posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
    },
  });
}
