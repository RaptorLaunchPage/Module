import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase'
import type { 
  DiscordWebhook, 
  CommunicationSetting,
  WebhookType,
  AutomationKey,
  WebhookValidationResponse,
  DiscordWebhookInsert,
  CommunicationSettingInsert
} from './types'

// Use the same Supabase client configuration as the main app
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

/**
 * Get all webhooks for a specific team
 */
export async function getTeamWebhooks(teamId: string): Promise<DiscordWebhook[]> {
  const { data, error } = await supabase
    .from('discord_webhooks')
    .select('*')
    .eq('team_id', teamId)
    .eq('active', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching team webhooks:', error)
    return []
  }

  return data || []
}

/**
 * Get admin/global webhooks
 */
export async function getAdminWebhooks(): Promise<DiscordWebhook[]> {
  const { data, error } = await supabase
    .from('discord_webhooks')
    .select('*')
    .in('type', ['admin', 'global'])
    .eq('active', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching admin webhooks:', error)
    return []
  }

  return data || []
}

/**
 * Get all webhooks (for admin users)
 */
export async function getAllWebhooks(): Promise<DiscordWebhook[]> {
  const { data, error } = await supabase
    .from('discord_webhooks')
    .select(`
      *,
      teams:team_id (
        name
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching all webhooks:', error)
    return []
  }

  return data || []
}

/**
 * Create a new webhook
 */
export async function createWebhook(webhook: DiscordWebhookInsert): Promise<{ success: boolean; webhook?: DiscordWebhook; error?: string }> {
  // Validate the webhook URL first
  const validation = await validateWebhookUrl(webhook.hook_url)
  if (!validation.valid) {
    return { success: false, error: validation.error }
  }

  const { data, error } = await supabase
    .from('discord_webhooks')
    .insert(webhook)
    .select()
    .single()

  if (error) {
    console.error('Error creating webhook:', error)
    return { success: false, error: error.message }
  }

  return { success: true, webhook: data }
}

/**
 * Update an existing webhook
 */
export async function updateWebhook(
  id: string, 
  updates: Partial<DiscordWebhookInsert>
): Promise<{ success: boolean; webhook?: DiscordWebhook; error?: string }> {
  // If updating the URL, validate it first
  if (updates.hook_url) {
    const validation = await validateWebhookUrl(updates.hook_url)
    if (!validation.valid) {
      return { success: false, error: validation.error }
    }
  }

  const { data, error } = await supabase
    .from('discord_webhooks')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating webhook:', error)
    return { success: false, error: error.message }
  }

  return { success: true, webhook: data }
}

/**
 * Delete a webhook
 */
export async function deleteWebhook(id: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('discord_webhooks')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting webhook:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Validate a Discord webhook URL
 */
export async function validateWebhookUrl(url: string): Promise<WebhookValidationResponse> {
  try {
    // Basic URL format validation
    const urlPattern = /^https:\/\/discord(?:app)?\.com\/api\/webhooks\/\d+\/[\w-]+$/
    if (!urlPattern.test(url)) {
      return {
        valid: false,
        error: 'Invalid Discord webhook URL format'
      }
    }

    // Test the webhook with a simple GET request to get webhook info
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Raptor-Esports-CRM/1.0'
      }
    })

    if (!response.ok) {
      return {
        valid: false,
        error: `Webhook validation failed: ${response.status} ${response.statusText}`
      }
    }

    const webhookInfo = await response.json()
    
    return {
      valid: true,
      webhook_info: {
        guild_name: webhookInfo.guild_id ? `Guild ID: ${webhookInfo.guild_id}` : undefined,
        channel_name: webhookInfo.channel_id ? `Channel ID: ${webhookInfo.channel_id}` : undefined
      }
    }
  } catch (error) {
    return {
      valid: false,
      error: `Webhook validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

/**
 * Get automation settings for a team
 */
export async function getTeamAutomationSettings(teamId: string): Promise<Record<string, boolean>> {
  const { data, error } = await supabase
    .from('communication_settings')
    .select('setting_key, setting_value')
    .eq('team_id', teamId)

  if (error) {
    console.error('Error fetching team automation settings:', error)
    return {}
  }

  const settings: Record<string, boolean> = {}
  data?.forEach(setting => {
    settings[setting.setting_key] = setting.setting_value
  })

  return settings
}

/**
 * Get global automation settings
 */
export async function getGlobalAutomationSettings(): Promise<Record<string, boolean>> {
  const { data, error } = await supabase
    .from('communication_settings')
    .select('setting_key, setting_value')
    .is('team_id', null)

  if (error) {
    console.error('Error fetching global automation settings:', error)
    return {}
  }

  const settings: Record<string, boolean> = {}
  data?.forEach(setting => {
    settings[setting.setting_key] = setting.setting_value
  })

  return settings
}

/**
 * Update automation setting
 */
export async function updateAutomationSetting(
  settingKey: AutomationKey,
  enabled: boolean,
  teamId: string | null,
  updatedBy: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('communication_settings')
    .upsert({
      team_id: teamId,
      setting_key: settingKey,
      setting_value: enabled,
      updated_by: updatedBy,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'team_id,setting_key'
    })

  if (error) {
    console.error('Error updating automation setting:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Check if automation is enabled for a specific event
 */
export async function isAutomationEnabled(
  settingKey: AutomationKey,
  teamId?: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('communication_settings')
    .select('setting_value')
    .eq('setting_key', settingKey)
    .eq('team_id', teamId || null)
    .single()

  if (error || !data) {
    // Default to false if setting doesn't exist
    return false
  }

  return data.setting_value
}

/**
 * Initialize automation settings for a new team
 */
export async function initializeTeamAutomationSettings(
  teamId: string,
  createdBy: string
): Promise<{ success: boolean; error?: string }> {
  const defaultSettings: AutomationKey[] = [
    'auto_slot_create',
    'auto_roster_update',
    'auto_daily_summary',
    'auto_weekly_digest',
    'auto_performance_alerts',
    'auto_attendance_alerts'
  ]

  const settingsToInsert: CommunicationSettingInsert[] = defaultSettings.map(key => ({
    team_id: teamId,
    setting_key: key,
    setting_value: false,
    updated_by: createdBy
  }))

  const { error } = await supabase
    .from('communication_settings')
    .insert(settingsToInsert)

  if (error) {
    console.error('Error initializing team automation settings:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Get webhook statistics
 */
export async function getWebhookStats(teamId?: string) {
  const query = supabase
    .from('communication_logs')
    .select('status, message_type, timestamp')

  if (teamId) {
    query.eq('team_id', teamId)
  }

  const { data, error } = await query
    .gte('timestamp', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
    .order('timestamp', { ascending: false })

  if (error) {
    console.error('Error fetching webhook stats:', error)
    return null
  }

  // Calculate statistics
  const totalMessages = data?.length || 0
  const successfulMessages = data?.filter(log => log.status === 'success').length || 0
  const failedMessages = data?.filter(log => log.status === 'failed').length || 0
  const successRate = totalMessages > 0 ? (successfulMessages / totalMessages) * 100 : 0

  // Group by message type
  const messageTypeStats = data?.reduce((acc, log) => {
    acc[log.message_type] = (acc[log.message_type] || 0) + 1
    return acc
  }, {} as Record<string, number>) || {}

  return {
    totalMessages,
    successfulMessages,
    failedMessages,
    successRate,
    messageTypeStats
  }
}