/**
 * Supabase database types, mirroring supabase/migrations.
 * Regenerate with: npx supabase gen types typescript --project-id <id> > src/types/database.ts
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Timestamps = { created_at: string; updated_at: string };
type OptionalTimestamps = { created_at?: string; updated_at?: string };

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          date_of_birth: string | null;
          average_cycle_length: number;
          average_period_length: number;
        } & Timestamps;
        Insert: {
          id: string;
          display_name?: string | null;
          date_of_birth?: string | null;
          average_cycle_length?: number;
          average_period_length?: number;
        } & OptionalTimestamps;
        Update: {
          display_name?: string | null;
          date_of_birth?: string | null;
          average_cycle_length?: number;
          average_period_length?: number;
        } & OptionalTimestamps;
        Relationships: [];
      };
      periods: {
        Row: { id: string; user_id: string; start_date: string; end_date: string | null } & Timestamps;
        Insert: { id?: string; user_id: string; start_date: string; end_date?: string | null } & OptionalTimestamps;
        Update: { start_date?: string; end_date?: string | null } & OptionalTimestamps;
        Relationships: [];
      };
      intercourse_records: {
        Row: {
          id: string;
          user_id: string;
          occurred_at: string;
          protection_method: string;
          ejaculation: string;
          emergency_contraception: boolean;
          notes: string | null;
        } & Timestamps;
        Insert: {
          id?: string;
          user_id: string;
          occurred_at: string;
          protection_method?: string;
          ejaculation?: string;
          emergency_contraception?: boolean;
          notes?: string | null;
        } & OptionalTimestamps;
        Update: {
          occurred_at?: string;
          protection_method?: string;
          ejaculation?: string;
          emergency_contraception?: boolean;
          notes?: string | null;
        } & OptionalTimestamps;
        Relationships: [];
      };
      symptoms: {
        Row: {
          id: string;
          user_id: string;
          symptom_date: string;
          symptoms: Json;
          mood: string | null;
          notes: string | null;
        } & Timestamps;
        Insert: {
          id?: string;
          user_id: string;
          symptom_date: string;
          symptoms?: Json;
          mood?: string | null;
          notes?: string | null;
        } & OptionalTimestamps;
        Update: {
          symptom_date?: string;
          symptoms?: Json;
          mood?: string | null;
          notes?: string | null;
        } & OptionalTimestamps;
        Relationships: [];
      };
      partner_shares: {
        Row: {
          id: string;
          owner_id: string;
          partner_email: string;
          partner_id: string | null;
          status: string;
          share_symptoms: boolean;
          share_intimacy: boolean;
          share_notes: boolean;
          last_emailed_at: string | null;
          accepted_at: string | null;
          ended_at: string | null;
        } & Timestamps;
        // Writes happen only through the partner-sharing functions.
        Insert: never;
        Update: never;
        Relationships: [];
      };
      cycle_settings: {
        Row: {
          id: string;
          user_id: string;
          average_cycle_length: number;
          average_period_length: number;
        } & Timestamps;
        Insert: {
          id?: string;
          user_id: string;
          average_cycle_length?: number;
          average_period_length?: number;
        } & OptionalTimestamps;
        Update: { average_cycle_length?: number; average_period_length?: number } & OptionalTimestamps;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      delete_own_account: { Args: Record<PropertyKey, never>; Returns: undefined };
      create_partner_invite: {
        Args: {
          p_partner_email: string;
          p_share_symptoms: boolean;
          p_share_intimacy: boolean;
          p_share_notes: boolean;
        };
        Returns: string;
      };
      update_partner_share: {
        Args: { p_share_id: string; p_share_symptoms: boolean; p_share_intimacy: boolean; p_share_notes: boolean };
        Returns: undefined;
      };
      revoke_partner_share: { Args: { p_share_id: string }; Returns: undefined };
      record_partner_invite_email: {
        Args: { p_share_id: string };
        Returns: { partner_email: string; inviter_name: string }[];
      };
      get_partner_invitations: {
        Args: Record<PropertyKey, never>;
        Returns: {
          share_id: string;
          owner_name: string;
          status: string;
          share_symptoms: boolean;
          share_intimacy: boolean;
          share_notes: boolean;
          invited_at: string;
          accepted_at: string | null;
        }[];
      };
      accept_partner_invite: { Args: { p_share_id: string }; Returns: undefined };
      leave_partner_share: { Args: { p_share_id: string }; Returns: undefined };
      get_partner_shared_data: { Args: { p_share_id: string }; Returns: Json };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

export type TableRow<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
