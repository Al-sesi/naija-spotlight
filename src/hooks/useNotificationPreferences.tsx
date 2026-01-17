import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface NotificationPreferences {
  id: string;
  user_id: string;
  email_scholarships: boolean;
  email_government: boolean;
  email_grants: boolean;
  email_social_tech: boolean;
  sms_scholarships: boolean;
  sms_government: boolean;
  sms_grants: boolean;
  sms_social_tech: boolean;
   whatsapp_scholarships: boolean;
   whatsapp_government: boolean;
   whatsapp_grants: boolean;
   whatsapp_social_tech: boolean;
  phone_number: string | null;
  created_at: string;
  updated_at: string;
}

export function useNotificationPreferences() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["notification-preferences", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data as NotificationPreferences | null;
    },
    enabled: !!user,
  });
}

export function useUpdateNotificationPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (preferences: Partial<NotificationPreferences>) => {
      if (!user) throw new Error("Not authenticated");

      // Check if preferences exist
      const { data: existing } = await supabase
        .from("notification_preferences")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from("notification_preferences")
          .update(preferences)
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from("notification_preferences")
          .insert({ user_id: user.id, ...preferences });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
      toast.success("Notification preferences updated!");
    },
    onError: (error) => {
      console.error("Failed to update preferences:", error);
      toast.error("Failed to update preferences");
    },
  });
}

export function useUserProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-profile", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}
