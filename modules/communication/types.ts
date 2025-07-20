import type { Database } from '@/lib/supabase'

// Base types from database
export type DiscordWebhook = Database['public']['Tables']['discord_webhooks']['Row']
export type CommunicationLog = Database['public']['Tables']['communication_logs']['Row']
export type CommunicationSetting = Database['public']['Tables']['communication_settings']['Row']

// Insert types
export type DiscordWebhookInsert = Database['public']['Tables']['discord_webhooks']['Insert']
export type CommunicationLogInsert = Database['public']['Tables']['communication_logs']['Insert']
export type CommunicationSettingInsert = Database['public']['Tables']['communication_settings']['Insert']

// Discord webhook types
export type WebhookType = 'team' | 'admin' | 'global'

// Message types for different events
export type MessageType = 
  | 'slot_create'
  | 'slot_update'
  | 'roster_update'
  | 'performance_summary'
  | 'attendance_summary'
  | 'expense_summary'
  | 'winnings_summary'
  | 'daily_summary'
  | 'weekly_digest'
  | 'analytics_trend'
  | 'system_alert'
  | 'data_cleanup'

// Communication status
export type CommunicationStatus = 'success' | 'failed' | 'pending' | 'retry'

// Automation setting keys
export type AutomationKey = 
  | 'auto_slot_create'
  | 'auto_roster_update'
  | 'auto_daily_summary'
  | 'auto_weekly_digest'
  | 'auto_performance_alerts'
  | 'auto_attendance_alerts'
  | 'auto_data_cleanup'
  | 'auto_system_alerts'
  | 'auto_admin_notifications'

// Discord embed structure (follows Discord API)
export interface DiscordEmbed {
  title?: string
  description?: string
  color?: number
  fields?: DiscordEmbedField[]
  footer?: {
    text: string
    icon_url?: string
  }
  timestamp?: string
  thumbnail?: {
    url: string
  }
  author?: {
    name: string
    icon_url?: string
  }
}

export interface DiscordEmbedField {
  name: string
  value: string
  inline?: boolean
}

// Discord webhook payload
export interface DiscordWebhookPayload {
  content?: string
  embeds?: DiscordEmbed[]
  username?: string
  avatar_url?: string
}

// Data structures for different message types
export interface SlotCreateData {
  slot_id: string
  team_name: string
  organizer: string
  date: string
  time_range: string
  match_count: number
  slot_rate?: number
  created_by_name: string
}

export interface RosterUpdateData {
  team_name: string
  player_name: string
  action: 'added' | 'removed' | 'role_changed'
  in_game_role?: string
  updated_by_name: string
}

export interface PerformanceSummaryData {
  team_name: string
  date_range: string
  total_matches: number
  avg_placement: number
  top_performer: {
    name: string
    kills: number
    damage: number
  }
  summary_stats: {
    total_kills: number
    total_damage: number
    best_placement: number
  }
}

export interface AttendanceSummaryData {
  team_name: string
  date_range: string
  total_sessions: number
  present_count: number
  absent_count: number
  attendance_rate: number
  top_attendees: Array<{
    name: string
    percentage: number
  }>
}

export interface ExpenseSummaryData {
  team_name: string
  date_range: string
  total_slots: number
  total_expense: number
  avg_slot_rate: number
  highest_expense_day: {
    date: string
    amount: number
  }
}

// API response types
export interface SendMessageResponse {
  success: boolean
  log_id?: string
  error?: string
  response_code?: number
}

export interface WebhookValidationResponse {
  valid: boolean
  error?: string
  webhook_info?: {
    guild_name?: string
    channel_name?: string
  }
}

// Role permissions for communication features
export interface CommunicationPermissions {
  canTriggerManual: boolean
  canViewLogs: boolean
  canManageWebhooks: boolean
  canViewAllTeams: boolean
  allowedMessageTypes: MessageType[]
}

// Automation settings by team
export interface TeamAutomationSettings {
  [key: string]: boolean
}