export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string | null
          role: "admin" | "manager" | "coach" | "player" | "analyst" | "pending_player" | "tryout"
          role_level: number | null
          team_id: string | null
          avatar_url: string | null
          created_at: string
          provider: string | null
          contact_number: string | null
          in_game_role: string | null
          device_info: string | null
          device_model: string | null
          ram: string | null
          fps: string | null
          storage: string | null
          status: string | null
          gyroscope_enabled: boolean | null
          instagram_handle: string | null
          discord_id: string | null
          bio: string | null
          favorite_game: string | null
          gaming_experience: string | null
          display_name: string | null
          full_name: string | null
          experience: string | null
          preferred_role: string | null
          favorite_games: string | null
          onboarding_completed: boolean | null
          last_login: string | null
          updated_at: string | null
          bgmi_id: string | null
          bgmi_tier: "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond" | "Crown" | "Ace" | "Conqueror" | null
          bgmi_points: number | null
          sensitivity_settings: Json | null
          control_layout: "2-finger" | "3-finger" | "4-finger" | "5-finger" | "6-finger" | null
          hud_layout_code: string | null
          game_stats: Json | null
          achievements: Json | null
          social_links: Json | null
          emergency_contact_name: string | null
          emergency_contact_number: string | null
          date_of_birth: string | null
          address: string | null
          preferred_language: string | null
          timezone: string | null
          profile_visibility: "public" | "team" | "private" | null
          auto_sync_tryout_data: boolean | null
          last_profile_update: string | null
        }
        Insert: {
          id: string
          email: string
          name?: string | null
          role?: "admin" | "manager" | "coach" | "player" | "analyst" | "pending_player" | "tryout"
          role_level?: number | null
          team_id?: string | null
          avatar_url?: string | null
          provider?: string | null
          contact_number?: string | null
          in_game_role?: string | null
          device_info?: string | null
          device_model?: string | null
          ram?: string | null
          fps?: string | null
          storage?: string | null
          status?: string | null
          gyroscope_enabled?: boolean | null
          instagram_handle?: string | null
          discord_id?: string | null
          bio?: string | null
          favorite_game?: string | null
          gaming_experience?: string | null
          display_name?: string | null
          full_name?: string | null
          experience?: string | null
          preferred_role?: string | null
          favorite_games?: string | null
          onboarding_completed?: boolean | null
          last_login?: string | null
          updated_at?: string | null
          bgmi_id?: string | null
          bgmi_tier?: "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond" | "Crown" | "Ace" | "Conqueror" | null
          bgmi_points?: number | null
          sensitivity_settings?: Json | null
          control_layout?: "2-finger" | "3-finger" | "4-finger" | "5-finger" | "6-finger" | null
          hud_layout_code?: string | null
          game_stats?: Json | null
          achievements?: Json | null
          social_links?: Json | null
          emergency_contact_name?: string | null
          emergency_contact_number?: string | null
          date_of_birth?: string | null
          address?: string | null
          preferred_language?: string | null
          timezone?: string | null
          profile_visibility?: "public" | "team" | "private" | null
          auto_sync_tryout_data?: boolean | null
          last_profile_update?: string | null
        }
        Update: {
          name?: string | null
          role?: "admin" | "manager" | "coach" | "player" | "analyst" | "pending_player" | "tryout"
          role_level?: number | null
          team_id?: string | null
          avatar_url?: string | null
          provider?: string | null
          contact_number?: string | null
          in_game_role?: string | null
          device_info?: string | null
          device_model?: string | null
          ram?: string | null
          fps?: string | null
          storage?: string | null
          status?: string | null
          gyroscope_enabled?: boolean | null
          instagram_handle?: string | null
          discord_id?: string | null
          bio?: string | null
          favorite_game?: string | null
          gaming_experience?: string | null
          display_name?: string | null
          full_name?: string | null
          experience?: string | null
          preferred_role?: string | null
          favorite_games?: string | null
          bgmi_id?: string | null
          bgmi_tier?: "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond" | "Crown" | "Ace" | "Conqueror" | null
          bgmi_points?: number | null
          sensitivity_settings?: Json | null
          control_layout?: "2-finger" | "3-finger" | "4-finger" | "5-finger" | "6-finger" | null
          hud_layout_code?: string | null
          game_stats?: Json | null
          achievements?: Json | null
          social_links?: Json | null
          emergency_contact_name?: string | null
          emergency_contact_number?: string | null
          date_of_birth?: string | null
          address?: string | null
          preferred_language?: string | null
          timezone?: string | null
          profile_visibility?: "public" | "team" | "private" | null
          auto_sync_tryout_data?: boolean | null
          last_profile_update?: string | null
          onboarding_completed?: boolean | null
          last_login?: string | null
          updated_at?: string | null
        }
      }
      profiles: {
        Row: {
          id: number
          user_id: string
          username: string | null
          avatar_url: string | null
          website: string | null
          created_at: string
          updated_at: string
          bio: string | null
          full_name: string | null
          display_name: string | null
          contact_number: string | null
          experience: string | null
          preferred_role: string | null
          favorite_games: string | null
          role: string | null
          onboarding_completed: boolean | null
        }
        Insert: {
          user_id: string
          username?: string | null
          avatar_url?: string | null
          website?: string | null
          bio?: string | null
          full_name?: string | null
          display_name?: string | null
          contact_number?: string | null
          experience?: string | null
          preferred_role?: string | null
          favorite_games?: string | null
          role?: string | null
          onboarding_completed?: boolean | null
        }
        Update: {
          user_id?: string
          username?: string | null
          avatar_url?: string | null
          website?: string | null
          updated_at?: string
          bio?: string | null
          full_name?: string | null
          display_name?: string | null
          contact_number?: string | null
          experience?: string | null
          preferred_role?: string | null
          favorite_games?: string | null
          role?: string | null
          onboarding_completed?: boolean | null
        }
      }
    }
  }
}