-- Discord Portal Database Schema
-- Tables for Discord webhook integration and message logging

-- Table: discord_webhooks
-- Stores Discord webhook URLs for teams and system-wide notifications
CREATE TABLE public.discord_webhooks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  team_id uuid, -- NULL for admin/global webhooks
  hook_url text NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['team'::text, 'admin'::text, 'global'::text])),
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid NOT NULL,
  CONSTRAINT discord_webhooks_pkey PRIMARY KEY (id),
  CONSTRAINT discord_webhooks_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE,
  CONSTRAINT discord_webhooks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);

-- Table: communication_logs (keeping original name for database compatibility)
-- Logs all Discord message attempts for debugging and audit purposes
CREATE TABLE public.communication_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  team_id uuid, -- NULL for global/admin messages
  webhook_id uuid,
  message_type text NOT NULL, -- 'slot_create', 'roster_update', 'performance_summary', etc.
  status text NOT NULL CHECK (status = ANY (ARRAY['success'::text, 'failed'::text, 'pending'::text, 'retry'::text])),
  payload jsonb NOT NULL, -- The complete embed payload sent to Discord
  response_code integer, -- HTTP response code from Discord
  response_body text, -- Discord API response
  error_message text, -- Error details if failed
  triggered_by uuid, -- User who triggered the message (NULL for auto)
  retry_count integer DEFAULT 0,
  timestamp timestamp with time zone DEFAULT now(),
  CONSTRAINT communication_logs_pkey PRIMARY KEY (id),
  CONSTRAINT communication_logs_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL,
  CONSTRAINT communication_logs_webhook_id_fkey FOREIGN KEY (webhook_id) REFERENCES public.discord_webhooks(id) ON DELETE SET NULL,
  CONSTRAINT communication_logs_triggered_by_fkey FOREIGN KEY (triggered_by) REFERENCES public.users(id) ON DELETE SET NULL
);

-- Table: communication_settings (keeping original name for database compatibility)
-- Discord automation toggle settings per team and global
CREATE TABLE public.communication_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  team_id uuid, -- NULL for global settings
  setting_key text NOT NULL, -- 'auto_slot_create', 'auto_roster_update', etc.
  setting_value boolean NOT NULL DEFAULT false,
  updated_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT communication_settings_pkey PRIMARY KEY (id),
  CONSTRAINT communication_settings_team_setting_key_unique UNIQUE (team_id, setting_key),
  CONSTRAINT communication_settings_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE,
  CONSTRAINT communication_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id)
);

-- Indexes for performance
CREATE INDEX idx_discord_webhooks_team_id ON public.discord_webhooks(team_id);
CREATE INDEX idx_discord_webhooks_type ON public.discord_webhooks(type);
CREATE INDEX idx_discord_webhooks_active ON public.discord_webhooks(active);

CREATE INDEX idx_communication_logs_team_id ON public.communication_logs(team_id);
CREATE INDEX idx_communication_logs_message_type ON public.communication_logs(message_type);
CREATE INDEX idx_communication_logs_status ON public.communication_logs(status);
CREATE INDEX idx_communication_logs_timestamp ON public.communication_logs(timestamp);

CREATE INDEX idx_communication_settings_team_id ON public.communication_settings(team_id);
CREATE INDEX idx_communication_settings_key ON public.communication_settings(setting_key);

-- Insert default automation settings for existing teams
INSERT INTO public.communication_settings (team_id, setting_key, setting_value, updated_by)
SELECT 
  t.id as team_id,
  setting_key,
  false as setting_value,
  (SELECT id FROM public.users WHERE role = 'admin' LIMIT 1) as updated_by
FROM public.teams t
CROSS JOIN (
  VALUES 
    ('auto_slot_create'),
    ('auto_roster_update'),
    ('auto_daily_summary'),
    ('auto_weekly_digest'),
    ('auto_performance_alerts'),
    ('auto_attendance_alerts')
) AS settings(setting_key)
WHERE EXISTS (SELECT 1 FROM public.users WHERE role = 'admin');

-- Insert global default settings
INSERT INTO public.communication_settings (team_id, setting_key, setting_value, updated_by)
SELECT 
  NULL as team_id,
  setting_key,
  false as setting_value,
  (SELECT id FROM public.users WHERE role = 'admin' LIMIT 1) as updated_by
FROM (
  VALUES 
    ('auto_data_cleanup'),
    ('auto_system_alerts'),
    ('auto_admin_notifications')
) AS global_settings(setting_key)
WHERE EXISTS (SELECT 1 FROM public.users WHERE role = 'admin');