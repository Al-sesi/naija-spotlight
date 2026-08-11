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
  subscription_status: string | null;
  subscription_ends_at: string | null;
  referral_code: string | null;
  referred_by: string | null;
}

// Helper to generate a human-readable referral code
// IMPORTANT: Always returns ALL UPPERCASE so it matches the DB format
// (handle_new_user trigger normalizes referred_by to UPPER before lookup)
function generateReferralCode(fullName?: string | null, email?: string | null): string {
  let base = "";
  if (fullName) {
    base = fullName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase();
  }
  if (!base && email) {
    const emailName = email.split("@")[0] || "";
    base = emailName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase();
  }
  if (!base) base = "NLUSER";
  if (base.length > 8) base = base.slice(0, 8);

  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 4; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const prefix = base.startsWith("NL") ? "" : "NL";
  return `${prefix}${base}${suffix}`;
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
      if (!email) throw new Error("Email is required");
      if (!role) throw new Error("Role is required");
      const normalizedEmail = email.trim().toLowerCase();

      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", normalizedEmail)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profiles) throw new Error("No user found with that email. Make sure they have registered first.");

      if (role === "ambassador") {
        const { data: existing, error: existingError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", profiles.id)
          .maybeSingle();

        if (existingError) throw existingError;
        if (existing?.role === "ambassador") {
          throw new Error("This user is already an ambassador");
        }

        const { error } = await supabase
          .from("profiles")
          .update({ role: "ambassador", updated_at: new Date().toISOString() })
          .eq("id", profiles.id);
        if (error) throw error;
      } else {
        const typedRole = role as UserRoleRow["role"];
        const { data: existing, error: existingError } = await supabase
          .from("user_roles")
          .select("id")
          .eq("user_id", profiles.id)
          .eq("role", typedRole)
          .maybeSingle();

        if (existingError) throw existingError;
        if (existing) {
          throw new Error(`This user is already a ${role}`);
        }

        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: profiles.id, role: typedRole });
        if (error) throw error;
      }
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["team-members"] }),
        queryClient.invalidateQueries({ queryKey: ["registered-users"] }),
      ]);
    },
  });
}

export function useRemoveTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, role, userId }: { id: string; role: string; userId: string }) => {
      if (!userId) throw new Error("Missing userId for team member");

      if (role === "ambassador") {
        const { error } = await supabase
          .from("profiles")
          .update({ role: "user", updated_at: new Date().toISOString() })
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
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["team-members"] }),
        queryClient.invalidateQueries({ queryKey: ["registered-users"] }),
      ]);
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
        .select(`
          id, full_name, email, created_at, subscription_status, subscription_ends_at,
          referral_code, referred_by
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as RegisteredUser[];
    },
  });
}

function isRlsOrPermissionError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err ?? "")).toLowerCase();
  return (
    msg.includes("42501") ||
    msg.includes("permission") ||
    msg.includes("policy") ||
    msg.includes("only admins") ||
    msg.includes("row level security") ||
    msg.includes("rls") ||
    msg.includes("update or delete on table") ||
    msg.includes("violates")
  );
}

export function useGenerateReferralCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      if (!userId) throw new Error("User ID is required to generate referral code");

      const { data: user, error: fetchError } = await supabase
        .from("profiles")
        .select("full_name, email, referral_code")
        .eq("id", userId)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!user) throw new Error("User not found");

      if (user.referral_code) {
        return { referral_code: user.referral_code, regenerated: false };
      }

      let code = "";
      for (let attempt = 0; attempt < 5; attempt++) {
        code = generateReferralCode(user.full_name, user.email);
        const { data: existing } = await supabase
          .from("profiles")
          .select("id")
          .eq("referral_code", code)
          .maybeSingle();

        if (!existing) break;
        code = "";
      }
      if (!code) {
        code = "NL" + Math.random().toString(36).slice(2, 8).toUpperCase();
      }

      const { data: written, error: updateError } = await supabase
        .from("profiles")
        .update({
          referral_code: code,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId)
        .select("referral_code")
        .maybeSingle();

      if (updateError) {
        if (isRlsOrPermissionError(updateError)) {
          throw new Error(
            "Permission denied. Run migration `20260810020000_fix_admin_referral_rls_and_roles.sql` in Supabase SQL Editor to fix admin RLS policies, then sign out and back in."
          );
        }
        throw updateError;
      }

      if (!written?.referral_code) {
        const { data: verify } = await supabase
          .from("profiles")
          .select("referral_code")
          .eq("id", userId)
          .maybeSingle();

        if (verify?.referral_code !== code) {
          throw new Error(
            "Referral code was not saved. This usually means RLS policies blocked the update. " +
              "Run migration `20260810020000_fix_admin_referral_rls_and_roles.sql` in the Supabase SQL Editor."
          );
        }
      }

      return { referral_code: code, regenerated: false };
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["registered-users"] }),
        queryClient.invalidateQueries({ queryKey: ["referral-stats"] }),
        queryClient.invalidateQueries({ queryKey: ["my-referral-stats"] }),
      ]);
    },
  });
}
