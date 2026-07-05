export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      chores: {
        Row: {
          color: string
          created_at: string
          household_id: string
          icon: string
          id: string
          name: string
          points: number
          recurrence: string
        }
        Insert: {
          color?: string
          created_at?: string
          household_id: string
          icon: string
          id?: string
          name: string
          points?: number
          recurrence?: string
        }
        Update: {
          color?: string
          created_at?: string
          household_id?: string
          icon?: string
          id?: string
          name?: string
          points?: number
          recurrence?: string
        }
        Relationships: [
          {
            foreignKeyName: "chores_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      household_invites: {
        Row: {
          code: string
          created_at: string
          created_by: string
          expires_at: string
          household_id: string
          id: string
          role: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          expires_at?: string
          household_id: string
          id?: string
          role?: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          expires_at?: string
          household_id?: string
          id?: string
          role?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "household_invites_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      household_members: {
        Row: {
          created_at: string
          household_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          household_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          household_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          billing_model: string
          created_at: string
          currency: string
          current_period_end: string | null
          email_cancelled_sent_at: string | null
          email_payment_confirmed_at: string | null
          email_tip_day3_sent_at: string | null
          email_tip_day7_sent_at: string | null
          email_tip_month1_sent_at: string | null
          email_trial_ending_sent_at: string | null
          email_trial_welcome_sent_at: string | null
          id: string
          name: string
          onboarded: boolean
          reward_target: number
          shared_pool: number
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          billing_model?: string
          created_at?: string
          currency?: string
          current_period_end?: string | null
          email_cancelled_sent_at?: string | null
          email_payment_confirmed_at?: string | null
          email_tip_day3_sent_at?: string | null
          email_tip_day7_sent_at?: string | null
          email_tip_month1_sent_at?: string | null
          email_trial_ending_sent_at?: string | null
          email_trial_welcome_sent_at?: string | null
          id?: string
          name?: string
          onboarded?: boolean
          reward_target?: number
          shared_pool?: number
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          billing_model?: string
          created_at?: string
          currency?: string
          current_period_end?: string | null
          email_cancelled_sent_at?: string | null
          email_payment_confirmed_at?: string | null
          email_tip_day3_sent_at?: string | null
          email_tip_day7_sent_at?: string | null
          email_tip_month1_sent_at?: string | null
          email_trial_ending_sent_at?: string | null
          email_trial_welcome_sent_at?: string | null
          id?: string
          name?: string
          onboarded?: boolean
          reward_target?: number
          shared_pool?: number
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      icon_generations: {
        Row: {
          created_at: string
          household_id: string
          id: string
          prompt: string | null
          storage_path: string | null
        }
        Insert: {
          created_at?: string
          household_id: string
          id?: string
          prompt?: string | null
          storage_path?: string | null
        }
        Update: {
          created_at?: string
          household_id?: string
          id?: string
          prompt?: string | null
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "icon_generations_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      kid_shares: {
        Row: {
          created_at: string
          household_id: string
          kid_id: string
        }
        Insert: {
          created_at?: string
          household_id: string
          kid_id: string
        }
        Update: {
          created_at?: string
          household_id?: string
          kid_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kid_shares_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kid_shares_kid_id_fkey"
            columns: ["kid_id"]
            isOneToOne: false
            referencedRelation: "kids"
            referencedColumns: ["id"]
          },
        ]
      }
      kids: {
        Row: {
          avatar_key: string | null
          color: string
          created_at: string
          household_id: string
          id: string
          name: string
          points: number
        }
        Insert: {
          avatar_key?: string | null
          color?: string
          created_at?: string
          household_id: string
          id?: string
          name: string
          points?: number
        }
        Update: {
          avatar_key?: string | null
          color?: string
          created_at?: string
          household_id?: string
          id?: string
          name?: string
          points?: number
        }
        Relationships: [
          {
            foreignKeyName: "kids_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      memories: {
        Row: {
          caption: string | null
          created_at: string
          household_id: string
          id: string
          kid_ids: string[]
          storage_path: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          household_id: string
          id?: string
          kid_ids?: string[]
          storage_path: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          household_id?: string
          id?: string
          kid_ids?: string[]
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "memories_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      memory_post_kids: {
        Row: {
          kid_id: string
          post_id: string
        }
        Insert: {
          kid_id: string
          post_id: string
        }
        Update: {
          kid_id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memory_post_kids_kid_id_fkey"
            columns: ["kid_id"]
            isOneToOne: false
            referencedRelation: "kids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memory_post_kids_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "memory_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      memory_posts: {
        Row: {
          caption: string | null
          created_at: string
          created_by: string | null
          household_id: string
          id: string
          storage_path: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          created_by?: string | null
          household_id: string
          id?: string
          storage_path: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          created_by?: string | null
          household_id?: string
          id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "memory_posts_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      point_events: {
        Row: {
          batch_id: string | null
          created_at: string
          household_id: string
          id: string
          item_icon: string
          item_name: string
          kid_id: string
          points: number
        }
        Insert: {
          batch_id?: string | null
          created_at?: string
          household_id: string
          id?: string
          item_icon: string
          item_name: string
          kid_id: string
          points: number
        }
        Update: {
          batch_id?: string | null
          created_at?: string
          household_id?: string
          id?: string
          item_icon?: string
          item_name?: string
          kid_id?: string
          points?: number
        }
        Relationships: [
          {
            foreignKeyName: "point_events_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "point_events_kid_id_fkey"
            columns: ["kid_id"]
            isOneToOne: false
            referencedRelation: "kids"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_proposals: {
        Row: {
          created_at: string
          household_id: string
          id: string
          name: string
          proposed_by: string | null
        }
        Insert: {
          created_at?: string
          household_id: string
          id?: string
          name: string
          proposed_by?: string | null
        }
        Update: {
          created_at?: string
          household_id?: string
          id?: string
          name?: string
          proposed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reward_proposals_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_proposals_proposed_by_fkey"
            columns: ["proposed_by"]
            isOneToOne: false
            referencedRelation: "kids"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_votes: {
        Row: {
          kid_id: string
          proposal_id: string
        }
        Insert: {
          kid_id: string
          proposal_id: string
        }
        Update: {
          kid_id?: string
          proposal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_votes_kid_id_fkey"
            columns: ["kid_id"]
            isOneToOne: false
            referencedRelation: "kids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_votes_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "reward_proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      skills: {
        Row: {
          color: string
          created_at: string
          household_id: string
          icon: string
          id: string
          is_positive: boolean
          name: string
          points: number
        }
        Insert: {
          color?: string
          created_at?: string
          household_id: string
          icon: string
          id?: string
          is_positive?: boolean
          name: string
          points?: number
        }
        Update: {
          color?: string
          created_at?: string
          household_id?: string
          icon?: string
          id?: string
          is_positive?: boolean
          name?: string
          points?: number
        }
        Relationships: [
          {
            foreignKeyName: "skills_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invite: { Args: { invite_code: string }; Returns: Json }
      can_see_kid: { Args: { kid_id: string }; Returns: boolean }
      generate_invite_code: { Args: never; Returns: string }
      has_min_role: {
        Args: { hid: string; min_role: string }
        Returns: boolean
      }
      is_member: { Args: { hid: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
