export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      community_posts: {
        Row: {
          content: string
          created_at: string | null
          id: string
          likes_count: number | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          likes_count?: number | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          likes_count?: number | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      generated_documents: {
        Row: {
          id: string
          user_id: string
          document_type: string
          target_role: string
          company_name: string | null
          job_title: string | null
          opportunity_id: string | null
          cv_content: string | null
          cover_letter_content: string | null
          request_snapshot: Json
          ai_provider: string
          ai_model: string | null
          tokens_used: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          document_type: string
          target_role: string
          company_name?: string | null
          job_title?: string | null
          opportunity_id?: string | null
          cv_content?: string | null
          cover_letter_content?: string | null
          request_snapshot?: Json
          ai_provider?: string
          ai_model?: string | null
          tokens_used?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          document_type?: string
          target_role?: string
          company_name?: string | null
          job_title?: string | null
          opportunity_id?: string | null
          cv_content?: string | null
          cover_letter_content?: string | null
          request_snapshot?: Json
          ai_provider?: string
          ai_model?: string | null
          tokens_used?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_documents_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          email_government: boolean
          email_grants: boolean
          email_scholarships: boolean
          email_social_tech: boolean
          id: string
          phone_number: string | null
          sms_government: boolean
          sms_grants: boolean
          sms_scholarships: boolean
          sms_social_tech: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_government?: boolean
          email_grants?: boolean
          email_scholarships?: boolean
          email_social_tech?: boolean
          id?: string
          phone_number?: string | null
          sms_government?: boolean
          sms_grants?: boolean
          sms_scholarships?: boolean
          sms_social_tech?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_government?: boolean
          email_grants?: boolean
          email_scholarships?: boolean
          email_social_tech?: boolean
          id?: string
          phone_number?: string | null
          sms_government?: boolean
          sms_grants?: boolean
          sms_scholarships?: boolean
          sms_social_tech?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      opportunities: {
        Row: {
          category: Database["public"]["Enums"]["opportunity_type"]
          created_at: string | null
          deadline: string | null
          description: string | null
          event_date: string | null
          id: string
          is_remote: boolean | null
          is_verified: boolean | null
          level: string | null
          link: string
          provider: string
          state: string
          title: string
          updated_at: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["opportunity_type"]
          created_at?: string | null
          deadline?: string | null
          description?: string | null
          event_date?: string | null
          id?: string
          is_remote?: boolean | null
          is_verified?: boolean | null
          level?: string | null
          link: string
          provider: string
          state?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["opportunity_type"]
          created_at?: string | null
          deadline?: string | null
          description?: string | null
          event_date?: string | null
          id?: string
          is_remote?: boolean | null
          is_verified?: boolean | null
          level?: string | null
          link?: string
          provider?: string
          state?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      opportunity_metadata: {
        Row: {
          id: string
          opportunity_id: string
          eligibility_requirements: string | null
          age_requirement: string | null
          education_requirement: string | null
          language_requirement: string | null
          keywords: string[] | null
          tags: string[] | null
          location_requirement: string | null
          industry: string | null
          salary_range: string | null
          benefits: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          opportunity_id: string
          eligibility_requirements?: string | null
          age_requirement?: string | null
          education_requirement?: string | null
          language_requirement?: string | null
          keywords?: string[] | null
          tags?: string[] | null
          location_requirement?: string | null
          industry?: string | null
          salary_range?: string | null
          benefits?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          opportunity_id?: string
          eligibility_requirements?: string | null
          age_requirement?: string | null
          education_requirement?: string | null
          language_requirement?: string | null
          keywords?: string[] | null
          tags?: string[] | null
          location_requirement?: string | null
          industry?: string | null
          salary_range?: string | null
          benefits?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_metadata_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: true
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          }
        ]
      }
      post_likes: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          paystack_customer_code: string | null
          paystack_subscription_code: string | null
          plan_type: string | null
          subscription_ends_at: string | null
          subscription_started_at: string | null
          subscription_status: string
          trial_ends_at: string | null
          updated_at: string | null
          phone_number: string | null
          applications_this_month: number
          quota_reset_at: string | null
          gender: string | null
          age: number | null
          date_of_birth: string | null
          country: string | null
          state: string | null
          lga: string | null
          highest_qualification: string | null
          field_of_study: string | null
          institution: string | null
          is_current_student: boolean | null
          graduation_year: number | null
          career_statuses: string[] | null
          skills: string[] | null
          interests: string[] | null
          preferred_location: string | null
          preferred_industries: string[] | null
          opportunity_level: string | null
          notification_frequency: string | null
          onboarding_completed: boolean | null
          role: string | null
          referral_code: string | null
          referred_by: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          paystack_customer_code?: string | null
          paystack_subscription_code?: string | null
          plan_type?: string | null
          subscription_ends_at?: string | null
          subscription_started_at?: string | null
          subscription_status?: string
          trial_ends_at?: string | null
          updated_at?: string | null
          phone_number?: string | null
          applications_this_month?: number
          quota_reset_at?: string | null
          gender?: string | null
          age?: number | null
          date_of_birth?: string | null
          country?: string | null
          state?: string | null
          lga?: string | null
          highest_qualification?: string | null
          field_of_study?: string | null
          institution?: string | null
          is_current_student?: boolean | null
          graduation_year?: number | null
          career_statuses?: string[] | null
          skills?: string[] | null
          interests?: string[] | null
          preferred_location?: string | null
          preferred_industries?: string[] | null
          opportunity_level?: string | null
          notification_frequency?: string | null
          onboarding_completed?: boolean | null
          role?: string | null
          referral_code?: string | null
          referred_by?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          paystack_customer_code?: string | null
          paystack_subscription_code?: string | null
          plan_type?: string | null
          subscription_ends_at?: string | null
          subscription_started_at?: string | null
          subscription_status?: string
          trial_ends_at?: string | null
          updated_at?: string | null
          phone_number?: string | null
          applications_this_month?: number
          quota_reset_at?: string | null
          gender?: string | null
          age?: number | null
          date_of_birth?: string | null
          country?: string | null
          state?: string | null
          lga?: string | null
          highest_qualification?: string | null
          field_of_study?: string | null
          institution?: string | null
          is_current_student?: boolean | null
          graduation_year?: number | null
          career_statuses?: string[] | null
          skills?: string[] | null
          interests?: string[] | null
          preferred_location?: string | null
          preferred_industries?: string[] | null
          opportunity_level?: string | null
          notification_frequency?: string | null
          onboarding_completed?: boolean | null
          role?: string | null
          referral_code?: string | null
          referred_by?: string | null
        }
        Relationships: []
      }
      recommendations: {
        Row: {
          id: string
          user_id: string
          opportunity_id: string
          match_score: number
          match_reasons: string[] | null
          is_top_match: boolean | null
          is_trending: boolean | null
          is_hidden_gem: boolean | null
          expires_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          opportunity_id: string
          match_score: number
          match_reasons?: string[] | null
          is_top_match?: boolean | null
          is_trending?: boolean | null
          is_hidden_gem?: boolean | null
          expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          opportunity_id?: string
          match_score?: number
          match_reasons?: string[] | null
          is_top_match?: boolean | null
          is_trending?: boolean | null
          is_hidden_gem?: boolean | null
          expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          }
        ]
      }
      recommendation_analytics: {
        Row: {
          id: string
          opportunity_id: string
          total_recommendations: number | null
          total_clicks: number | null
          total_saves: number | null
          total_applications: number | null
          date_recorded: string
        }
        Insert: {
          id?: string
          opportunity_id: string
          total_recommendations?: number | null
          total_clicks?: number | null
          total_saves?: number | null
          total_applications?: number | null
          date_recorded?: string
        }
        Update: {
          id?: string
          opportunity_id?: string
          total_recommendations?: number | null
          total_clicks?: number | null
          total_saves?: number | null
          total_applications?: number | null
          date_recorded?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_analytics_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          }
        ]
      }
      site_alerts: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          message: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          message?: string
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          message?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          billing_cycle: string
          category: Database["public"]["Enums"]["subscription_category"]
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          price_naira: number
          started_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_cycle?: string
          category: Database["public"]["Enums"]["subscription_category"]
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          price_naira?: number
          started_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_cycle?: string
          category?: Database["public"]["Enums"]["subscription_category"]
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          price_naira?: number
          started_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_applications: {
        Row: {
          applied_at: string | null
          id: string
          notes: string | null
          opportunity_id: string
          status: Database["public"]["Enums"]["application_status"] | null
          user_id: string
        }
        Insert: {
          applied_at?: string | null
          id?: string
          notes?: string | null
          opportunity_id: string
          status?: Database["public"]["Enums"]["application_status"] | null
          user_id: string
        }
        Update: {
          applied_at?: string | null
          id?: string
          notes?: string | null
          opportunity_id?: string
          status?: Database["public"]["Enums"]["application_status"] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_applications_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          }
        ]
      }
      user_behavior: {
        Row: {
          id: string
          user_id: string
          opportunity_id: string
          action_type: string
          action_timestamp: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          opportunity_id: string
          action_type: string
          action_timestamp?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          opportunity_id?: string
          action_type?: string
          action_timestamp?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_behavior_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_behavior_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          }
        ]
      }
      user_notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          body: string
          type: string
          related_opportunity_id: string | null
          is_read: boolean | null
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          body: string
          type: string
          related_opportunity_id?: string | null
          is_read?: boolean | null
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          body?: string
          type?: string
          related_opportunity_id?: string | null
          is_read?: boolean | null
          read_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_notifications_related_opportunity_id_fkey"
            columns: ["related_opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          }
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_match_score: {
        Args: {
          p_user_id: string
          p_opportunity_id: string
        }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_premium_user: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      application_status: "saved" | "applied" | "shortlisted" | "rejected"
      opportunity_type:
        | "government"
        | "recruitment"
        | "internship"
        | "competition"
        | "ngo"
        | "grant"
        | "job"
        | "tech"
        | "career"
        | "scholarship"
        | "social"
      subscription_category:
        | "scholarship"
        | "government"
        | "grant"
        | "social_tech"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      application_status: ["saved", "applied", "shortlisted", "rejected"],
      opportunity_type: [
        "government",
        "recruitment",
        "internship",
        "competition",
        "ngo",
        "grant",
        "job",
        "tech",
        "career",
        "scholarship",
        "social",
      ],
      subscription_category: [
        "scholarship",
        "government",
        "grant",
        "social_tech",
      ],
    },
  },
} as const
