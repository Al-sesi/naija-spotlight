import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

type ProfileSummary = Pick<Tables<"profiles">, "id" | "full_name" | "email" | "created_at">;
type UserRoleRow = Tables<"user_roles">;
type AppInstallRow = {
  id: string;
  user_id: string | null;
  user_agent: string | null;
  outcome: string | null;
  created_at: string;
};

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
      // 1. Fetch from user_roles (Admin/Moderator)
      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("*");

      if (error) throw error;

      // 2. Fetch from profiles (Ambassadors)
      const { data: ambassadors, error: ambError } = await supabase
        .from("profiles")
        .select("id, full_name, email, role, created_at")
        .eq("role", "ambassador");

      if (ambError) throw ambError;

      // Collect all user IDs to fetch profiles for roles
      const roleUserIds = roles?.map((role) => role.user_id) || [];
      
      let profiles: ProfileSummary[] = [];
      if (roleUserIds.length > 0) {
        const { data } = await supabase
          .from("profiles")
          .select("id, full_name, email, created_at")
          .in("id", roleUserIds);
        profiles = (data as ProfileSummary[] | null) || [];
      }

      const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
      
      const teamMembers: TeamMember[] = [];

      // Add roles (Admin/Moderator)
      roles?.forEach((role: UserRoleRow) => {
        const profile = profileMap.get(role.user_id);
        teamMembers.push({
          id: role.id,
          user_id: role.user_id,
          role: role.role,
          created_at: profile?.created_at || new Date().toISOString(), // Use profile creation as fallback
          profile: profile ? { full_name: profile.full_name, email: profile.email } : null,
        });
      });

      // Add ambassadors (if not already in list - usually mutually exclusive but good to check)
      ambassadors?.forEach((ambassador) => {
        // Check if this user is already added (e.g. an admin who is also marked as ambassador)
        // Note: user_roles usually takes precedence for access control, but we want to show all roles.
        // If we want to show them as separate entries (one for admin, one for ambassador), we can just push.
        // But usually one user row is better. However, TeamMember interface assumes one role per entry.
        // Let's just add them.
        const existing = teamMembers.find((member) => member.user_id === ambassador.id && member.role === "ambassador");
        if (!existing) {
           teamMembers.push({
             id: ambassador.id,
             user_id: ambassador.id,
             role: "ambassador",
             created_at: ambassador.created_at,
             profile: { full_name: ambassador.full_name, email: ambassador.email }
           });
        }
      });

      // Sort by role importance then name
      return teamMembers.sort((a, b) => {
        const roleOrder: Record<string, number> = { admin: 0, moderator: 1, ambassador: 2 };
        const orderA = roleOrder[a.role] ?? 99;
        const orderB = roleOrder[b.role] ?? 99;
        if (orderA !== orderB) return orderA - orderB;
        return (a.profile?.full_name || "").localeCompare(b.profile?.full_name || "");
      });
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

      if (role === "ambassador") {
        const { data: existingAmbassador, error: existingAmbassadorError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", profiles.id)
          .maybeSingle();

        if (existingAmbassadorError) throw existingAmbassadorError;
        if (existingAmbassador?.role === "ambassador") {
          throw new Error("This user is already an ambassador");
        }

        const { error } = await supabase
          .from("profiles")
          .update({ role: "ambassador" })
          .eq("id", profiles.id);
        if (error) throw error;
      } else {
        const { data: existingRole, error: existingRoleError } = await supabase
          .from("user_roles")
          .select("id")
          .eq("user_id", profiles.id)
          .eq("role", role as UserRoleRow["role"])
          .maybeSingle();

        if (existingRoleError) throw existingRoleError;
        if (existingRole) {
          throw new Error(`This user is already a ${role}`);
        }

        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: profiles.id, role: role as UserRoleRow["role"] });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
    },
  });
}

export function useRemoveTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, role, userId }: { id: string; role: string; userId: string }) => {
      if (role === "ambassador") {
        const { error } = await supabase
          .from("profiles")
          .update({ role: "user" })
          .eq("id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("id", id);
        if (error) throw error;
      }
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
        .from("app_installs")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const typedInstalls = (installs as AppInstallRow[] | null) || [];
      const userIds = [...new Set(typedInstalls.map((install) => install.user_id).filter((userId): userId is string => Boolean(userId)))];
      
      let profileMap = new Map<string, ProfileSummary>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds);
          
        profileMap = new Map(((profiles as ProfileSummary[] | null) || []).map((profile) => [profile.id, profile]));
      }

      return typedInstalls.map((install) => ({
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
      
      let profiles: ProfileSummary[] = [];
      if (userIds.length > 0) {
        const { data } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds);
        profiles = (data as ProfileSummary[] | null) || [];
      }

      const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));

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
    enabled: options?.enabled ?? true,
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
