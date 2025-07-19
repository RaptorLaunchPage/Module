import { createClient } from "@supabase/supabase-js"

// Use environment variables - no fallback values for security
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/**
 * Fail fast if env vars are missing.
 * Doing this early avoids the "Failed to construct 'URL': Invalid URL" runtime crash.
 */
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Supabase credentials are missing.\n" +
      "Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY " +
      "in your environment variables.",
  )
}

// Validate URL format to prevent runtime crashes
let validUrl: string
try {
  new URL(supabaseUrl)
  validUrl = supabaseUrl
} catch (error) {
  console.error('Invalid Supabase URL:', supabaseUrl)
  // Use a dummy URL that won't crash the client but will fail gracefully
  validUrl = 'https://dummy.supabase.co'
}

export const supabase = createClient(validUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    storageKey: 'raptor-auth-token',
    debug: process.env.NODE_ENV === 'development'
  },
  global: {
    headers: {
      'x-application': 'raptor-esports-crm'
    }
  }
})

// REMOVED testConnection function that was causing getSession() hanging issues
// Connection testing is now handled by the auth hook's simplified approach

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string | null
          role: "admin" | "manager" | "coach" | "player" | "analyst" | "pending_player" | "awaiting_approval"
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
        }
        Insert: {
          id: string
          email: string
          name?: string | null
          role?: "admin" | "manager" | "coach" | "player" | "analyst" | "pending_player" | "awaiting_approval"
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
        }
        Update: {
          name?: string | null
          role?: "admin" | "manager" | "coach" | "player" | "analyst" | "pending_player" | "awaiting_approval"
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
        }
      }
      teams: {
        Row: {
          id: string
          name: string
          tier: string | null
          coach_id: string | null
          status: string | null
          created_at: string
        }
        Insert: {
          name: string
          tier?: string | null
          coach_id?: string | null
          status?: string | null
        }
        Update: {
          name?: string
          tier?: string | null
          coach_id?: string | null
          status?: string | null
        }
      }
      performances: {
        Row: {
          id: string
          team_id: string | null
          player_id: string
          match_number: number
          slot: string | null
          map: string
          placement: number | null
          kills: number
          assists: number
          damage: number
          survival_time: number
          added_by: string | null
          created_at: string
        }
        Insert: {
          team_id?: string | null
          player_id: string
          match_number: number
          slot?: string | null
          map: string
          placement?: number | null
          kills?: number
          assists?: number
          damage?: number
          survival_time?: number
          added_by?: string | null
        }
        Update: {
          team_id?: string | null
          player_id?: string
          match_number?: number
          slot?: string | null
          map?: string
          placement?: number | null
          kills?: number
          assists?: number
          damage?: number
          survival_time?: number
          added_by?: string | null
        }
      }
      rosters: {
        Row: {
          id: string
          team_id: string
          user_id: string
          in_game_role: string | null
          contact_number: string | null
          device_info: string | null
          created_at: string
        }
        Insert: {
          team_id: string
          user_id: string
          in_game_role?: string | null
          contact_number?: string | null
          device_info?: string | null
        }
        Update: {
          team_id?: string
          user_id?: string
          in_game_role?: string | null
          contact_number?: string | null
          device_info?: string | null
        }
      }
      slots: {
        Row: {
          id: string
          team_id: string
          organizer: string
          time_range: string
          number_of_slots: number
          slot_rate: number
          match_count: number
          notes: string | null
          date: string // DATE type in SQL, string in TS
          created_at: string
        }
        Insert: {
          team_id: string
          organizer: string
          time_range: string
          number_of_slots: number
          slot_rate: number
          match_count: number
          notes?: string | null
          date: string
        }
        Update: {
          team_id?: string
          organizer?: string
          time_range?: string
          number_of_slots?: number
          slot_rate?: number
          match_count?: number
          notes?: string | null
          date?: string
        }
      }
      slot_expenses: {
        Row: {
          id: string
          slot_id: string
          team_id: string
          rate: number
          number_of_slots: number
          total: number
          created_at: string
        }
        Insert: {
          slot_id: string
          team_id: string
          rate: number
          number_of_slots: number
          total: number
        }
        Update: {
          slot_id?: string
          team_id?: string
          rate?: number
          number_of_slots?: number
          total?: number
        }
      }
      prize_pools: {
        Row: {
          id: string
          slot_id: string
          total_amount: number
          breakdown: Json | null // JSONB type in SQL
          created_at: string
        }
        Insert: {
          slot_id: string
          total_amount: number
          breakdown?: Json | null
        }
        Update: {
          slot_id?: string
          total_amount?: number
          breakdown?: Json | null
        }
      }
      winnings: {
        Row: {
          id: string
          slot_id: string
          team_id: string
          position: number
          amount_won: number
          created_at: string
        }
        Insert: {
          slot_id: string
          team_id: string
          position: number
          amount_won: number
        }
        Update: {
          slot_id?: string
          team_id?: string
          position?: number
          amount_won?: number
        }
      }
      admin_config: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
        }
      }
      module_permissions: {
        Row: {
          id: number
          role: string
          module: string
          can_access: boolean
        }
        Insert: {
          role: string
          module: string
          can_access?: boolean
        }
        Update: {
          role?: string
          module?: string
          can_access?: boolean
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
        }
        Insert: {
          user_id: string
          username?: string | null
          avatar_url?: string | null
          website?: string | null
        }
        Update: {
          user_id?: string
          username?: string | null
          avatar_url?: string | null
          website?: string | null
          updated_at?: string
        }
      }
      tier_defaults: {
        Row: {
          id: string
          tier: string
          default_slot_rate: number
          created_at: string
          updated_at: string
        }
        Insert: {
          tier: string
          default_slot_rate: number
        }
        Update: {
          tier?: string
          default_slot_rate?: number
          updated_at?: string
        }
      }
    }
  }
}

type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export const SUPABASE_URL_DEBUG = supabaseUrl
export const SUPABASE_ANON_DEBUG = supabaseAnonKey.slice(0, 8) + "…"
