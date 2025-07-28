# RaptorBot Configuration for CRM Integration
# Production configuration for connecting to Raptor Esports Hub CRM

# Database Configuration (Tortoise ORM)
TORTOISE = {
    "connections": {
        "default": {
            "engine": "tortoise.backends.asyncpg",
            "credentials": {
                "host": "localhost",
                "port": "5432", 
                "user": "raptorbot",
                "password": "your_db_password",
                "database": "raptorbot",
            }
        }
    },
    "apps": {
        "models": {
            "models": ["models"],
            "default_connection": "default",
        }
    }
}

# PostgreSQL direct connection (if needed)
POSTGRESQL = {
    "host": "localhost",
    "port": 5432,
    "user": "raptorbot", 
    "password": "your_db_password",
    "database": "raptorbot"
}

# Bot Extensions
EXTENSIONS = (
    "cogs.esports",
    "cogs.performance_ai", 
    "cogs.attendance_ai",
    "cogs.tryouts_ai",
    "cogs.mod",
    "cogs.utility",
    "cogs.reminder",
    "cogs.quomisc",
    "cogs.events"
)

# Discord Bot Configuration
DISCORD_TOKEN = "YOUR_DISCORD_BOT_TOKEN_HERE"  # Get from Discord Developer Portal

# Bot Appearance
COLOR = 0x00FFB3
FOOTER = "RaptorBot - Powered by Raptor Esports Hub"
PREFIX = "r"

# Links and Information
SERVER_LINK = "https://discord.gg/your-server"
BOT_INVITE = "https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=8&scope=bot%20applications.commands"
WEBSITE = "https://your-crm-domain.com"
REPOSITORY = "https://github.com/RaptorLaunchPage/Test"

# Bot Owner Configuration
BOT_OWNER_ID = 123456789012345678  # Replace with your Discord user ID
DEVS = (123456789012345678,)  # Add additional developer IDs

# OWNER-BASED ACCESS CONTROL
FREE_FEATURES = [
    "scrim_help", "register_team", "create_tournament", "basic_stats", 
    "view_tournaments", "join_scrim", "basic_commands"
]

ADVANCED_FEATURES = [
    "auto_attendance", "performance_summary", "analytics_export", 
    "discord_sync", "dashboard_stats", "unlimited_scrims", 
    "unlimited_tournaments", "custom_reactions", "advanced_verification",
    "custom_colors", "custom_footers", "unlimited_eztag", "unlimited_tagcheck",
    "unlimited_autopurge", "performance_ai_ocr", "attendance_ai", "tryout_management"
]

# Logging Configuration
SHARD_LOG = ""
ERROR_LOG = ""
PUBLIC_LOG = ""

# ===== CRM INTEGRATION CONFIGURATION =====
# 🔗 Connect to your Next.js CRM system

# CRM API Configuration
CRM_API_BASE_URL = "https://your-crm-domain.com"  # Replace with your actual CRM domain
RAPTOR_BOT_API_KEY = "your_secure_api_key_here"   # Must match CRM's RAPTOR_BOT_API_KEY

# CRM API Endpoints (matching your Next.js CRM)
CRM_ENDPOINTS = {
    "performance_upload": "/api/discord/performance/upload",
    "team_performance": "/api/discord/team-performance", 
    "digest_data": "/api/discord/digest",
    "attendance_mark": "/api/discord/attendance/mark",
    "attendance_summary": "/api/discord/attendance-summary",
    "team_attendance": "/api/discord/team-attendance-summary",
    "tryout_announce": "/api/discord/tryout/announce",
    "tryout_apply": "/api/discord/tryout/apply",
    "tryout_status": "/api/discord/tryout/status",
    "tryout_list": "/api/discord/tryout/list",
    "tryout_evaluate": "/api/discord/tryout/evaluate",
    "bot_sync": "/api/discord/sync-bot",
    "webhooks": "/api/discord-portal/webhooks"
}

# PERFORMANCE AI & OCR Configuration
GOOGLE_APPLICATION_CREDENTIALS = "/app/secrets/raptorbot-ocr-key.json"  # Path to GCP service account JSON
OPENAI_API_KEY = "your_openai_api_key_here"  # Optional for GPT performance summaries

# DIGEST REPORTING Configuration
DIGEST_ENABLED = True  # Enable automated daily/weekly digest reports
DIGEST_WEBHOOK_ENABLED = True  # Use CRM webhook system
DIGEST_TIMEZONE = "Asia/Kolkata"  # Default timezone
DIGEST_DAILY_TIME = "10:00"  # Daily digest time
DIGEST_WEEKLY_TIME = "10:30"  # Weekly digest time  
DIGEST_WEEKLY_DAY = "monday"  # Weekly digest day

# Performance Tracking
PERFORMANCE_AI_ENABLED = True
ATTENDANCE_AI_ENABLED = True
TRYOUT_MANAGEMENT_ENABLED = True

# Feature Flags
FEATURES = {
    "performance_tracking": True,
    "attendance_system": True, 
    "tryout_management": True,
    "digest_reporting": True,
    "tournament_system": True,
    "crm_integration": True,
    "ocr_processing": True,
    "ai_summaries": True
}