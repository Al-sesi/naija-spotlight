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

export interface AppInstall {
  id: string;
  user_id: string | null;
  user_agent: string | null;
  outcome: string | null;
  created_at: string;
  profile?: {
    full_name: string | null;
    email: string | null;
  } | null;
}

export interface TeamMember {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  profile?: {
    full_name: string | null;
    email: string | null;
  } | null;
}

export function useTeamMembers() {
  return useQuery({
    queryKey: ["team-members"],
    queryFn: async () => {
      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch profiles
      const userIds = [...new Set(roles?.map(r => r.user_id).filter(Boolean) || [])];
      
      let profiles: any[] = [];
      if (userIds.length > 0) {
        const { data } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds);
        profiles = data || [];
      }

      const profileMap = new Map(profiles.map(p => [p.id, p]));

      return roles?.map(role => ({
        ...role,
        profile: profileMap.get(role.user_id) || null,
      })) as TeamMember[];
    },
  });
}

export function useAddTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ email, role }: { email: string; role: string }) => {
      // First find the user by email
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email)
        .single();
      
      if (profileError || !profiles) throw new Error("User not found with this email");

      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: profiles.id, role });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
    },
  });
}

export function useRemoveTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("id", roleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
    },
  });
}

export function useAppInstalls() {
  return useQuery({
    queryKey: ["app-installs"],
    queryFn: async () => {
      const { data: installs, error } = await supabase
        .from("app_installs" as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch profiles for authenticated users
      const userIds = [...new Set(installs?.filter((i: any) => i.user_id).map((i: any) => i.user_id) || [])];
      
      let profileMap = new Map();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds);
          
        profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      }

      return installs?.map((install: any) => ({
        ...install,
        profile: install.user_id ? profileMap.get(install.user_id) || null : null,
      })) as AppInstall[];
    },
  });
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
      const userIds = [...new Set(posts?.map(p => p.user_id).filter(Boolean) || [])];
      
      let profiles: any[] = [];
      if (userIds.length > 0) {
        const { data } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds);
        profiles = data || [];
      }

      const profileMap = new Map(profiles.map(p => [p.id, p]));

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

export function useRegisteredUsers(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["registered-users"],
    enabled: options?.enabled,
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
