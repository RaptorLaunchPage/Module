# 🤖 RaptorBot Setup Guide

This guide will help you create the Discord bot that integrates with the Raptor Esports Hub CRM system.

## 📋 Prerequisites

- Node.js 18+ installed
- Discord Developer Account
- Access to this CRM system
- Git installed

## 🎯 Step 1: Create Discord Application

1. **Go to Discord Developer Portal**
   - Visit: https://discord.com/developers/applications
   - Click "New Application"
   - Name: "RaptorBot"
   - Click "Create"

2. **Configure Bot Settings**
   - Go to "Bot" section
   - Click "Add Bot"
   - Configure bot settings:
     - Username: `RaptorBot`
     - Avatar: Upload your Raptor Esports logo
     - Public Bot: ❌ (Keep private)
     - Require OAuth2 Code Grant: ❌
     - Bot Permissions: Administrator (for initial setup)

3. **Get Bot Token**
   - In "Bot" section, click "Reset Token"
   - Copy the token (you'll need this for `DISCORD_BOT_TOKEN`)
   - ⚠️ **Keep this token secure and never share it**

4. **Configure OAuth2**
   - Go to "OAuth2 > URL Generator"
   - Scopes: `bot`, `applications.commands`
   - Bot Permissions: `Administrator` (or specific permissions)
   - Copy the generated URL for server invites

## 🏗️ Step 2: Create Bot Project Structure

```bash
# Create new directory for the bot
mkdir raptorbot-discord
cd raptorbot-discord

# Initialize project
npm init -y

# Install dependencies
npm install discord.js @discordjs/builders @discordjs/rest axios dotenv
npm install -D typescript @types/node ts-node nodemon

# Create TypeScript config
npx tsc --init
```

## 📁 Step 3: Project Structure

Create the following file structure:

```
raptorbot-discord/
├── src/
│   ├── bot.ts              # Main bot entry point
│   ├── config/
│   │   └── config.ts       # Configuration management
│   ├── commands/
│   │   ├── index.ts        # Command registry
│   │   ├── digest.ts       # Digest commands
│   │   ├── performance.ts  # Performance commands
│   │   ├── attendance.ts   # Attendance commands
│   │   └── admin.ts        # Admin commands
│   ├── events/
│   │   ├── ready.ts        # Bot ready event
│   │   ├── interaction.ts  # Interaction handling
│   │   └── message.ts      # Message handling
│   ├── services/
│   │   ├── crm-api.ts      # CRM API integration
│   │   ├── database.ts     # Database operations
│   │   └── ai-analysis.ts  # AI analysis functions
│   └── utils/
│       ├── logger.ts       # Logging utility
│       └── helpers.ts      # Helper functions
├── .env                    # Environment variables
├── package.json
├── tsconfig.json
└── README.md
```

## ⚙️ Step 4: Environment Configuration

Create `.env` file:

```env
# Discord Bot Configuration
DISCORD_BOT_TOKEN=your_discord_bot_token_here
DISCORD_CLIENT_ID=your_discord_client_id_here

# CRM API Configuration
CRM_API_URL=https://your-crm-domain.com/api
RAPTOR_BOT_API_KEY=your_raptor_bot_api_key_here

# Database Configuration (if using direct DB access)
DATABASE_URL=your_supabase_database_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Environment
NODE_ENV=development
LOG_LEVEL=debug
```

## 🔧 Step 5: Core Bot Implementation

### Main Bot File (`src/bot.ts`):

```typescript
import { Client, GatewayIntentBits, Collection } from 'discord.js';
import { config } from './config/config';
import { loadCommands } from './commands';
import { loadEvents } from './events';
import { logger } from './utils/logger';

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent
  ]
});

// Load commands and events
loadCommands(client);
loadEvents(client);

// Start the bot
client.login(config.discord.token)
  .then(() => logger.info('RaptorBot started successfully'))
  .catch(error => logger.error('Failed to start bot:', error));

export { client };
```

### Configuration (`src/config/config.ts`):

```typescript
import dotenv from 'dotenv';
dotenv.config();

export const config = {
  discord: {
    token: process.env.DISCORD_BOT_TOKEN!,
    clientId: process.env.DISCORD_CLIENT_ID!
  },
  crm: {
    apiUrl: process.env.CRM_API_URL!,
    apiKey: process.env.RAPTOR_BOT_API_KEY!
  },
  database: {
    url: process.env.DATABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY
  },
  environment: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info'
};

// Validate required environment variables
const requiredVars = [
  'DISCORD_BOT_TOKEN',
  'DISCORD_CLIENT_ID', 
  'CRM_API_URL',
  'RAPTOR_BOT_API_KEY'
];

for (const varName of requiredVars) {
  if (!process.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
}
```

### CRM API Service (`src/services/crm-api.ts`):

```typescript
import axios from 'axios';
import { config } from '../config/config';
import { logger } from '../utils/logger';

class CRMApiService {
  private baseURL: string;
  private apiKey: string;

  constructor() {
    this.baseURL = config.crm.apiUrl;
    this.apiKey = config.crm.apiKey;
  }

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    };
  }

  // Upload performance data
  async uploadPerformance(guildId: string, data: any) {
    try {
      const response = await axios.post(
        `${this.baseURL}/discord/performance/upload`,
        { guild_id: guildId, ...data },
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      logger.error('Failed to upload performance data:', error);
      throw error;
    }
  }

  // Mark attendance
  async markAttendance(guildId: string, userId: string, sessionType: string) {
    try {
      const response = await axios.post(
        `${this.baseURL}/discord/attendance/mark`,
        { guild_id: guildId, user_id: userId, session_type: sessionType },
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      logger.error('Failed to mark attendance:', error);
      throw error;
    }
  }

  // Get team performance data
  async getTeamPerformance(guildId: string, period: string = '30d') {
    try {
      const response = await axios.get(
        `${this.baseURL}/discord/team-performance?guild_id=${guildId}&period=${period}`,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      logger.error('Failed to get team performance:', error);
      throw error;
    }
  }

  // Generate digest
  async generateDigest(guildId: string, type: 'daily' | 'weekly') {
    try {
      const response = await axios.post(
        `${this.baseURL}/discord/digest`,
        { guild_id: guildId, type },
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      logger.error('Failed to generate digest:', error);
      throw error;
    }
  }

  // Test digest
  async testDigest(guildId: string) {
    try {
      const response = await axios.post(
        `${this.baseURL}/discord/digest/test`,
        { guild_id: guildId },
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      logger.error('Failed to test digest:', error);
      throw error;
    }
  }

  // Sync bot data with CRM
  async syncBot(guildId: string) {
    try {
      const response = await axios.post(
        `${this.baseURL}/discord/sync-bot`,
        { guild_id: guildId },
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      logger.error('Failed to sync bot:', error);
      throw error;
    }
  }
}

export const crmApi = new CRMApiService();
```

## 🎮 Step 6: Essential Commands

### Digest Command (`src/commands/digest.ts`):

```typescript
import { SlashCommandBuilder, CommandInteraction } from 'discord.js';
import { crmApi } from '../services/crm-api';
import { logger } from '../utils/logger';

export const data = new SlashCommandBuilder()
  .setName('digest')
  .setDescription('Generate team performance digest')
  .addStringOption(option =>
    option.setName('type')
      .setDescription('Digest type')
      .setRequired(true)
      .addChoices(
        { name: 'Daily', value: 'daily' },
        { name: 'Weekly', value: 'weekly' }
      )
  );

export async function execute(interaction: CommandInteraction) {
  const guildId = interaction.guildId!;
  const type = interaction.options.get('type')?.value as 'daily' | 'weekly';

  await interaction.deferReply();

  try {
    const digest = await crmApi.generateDigest(guildId, type);
    
    await interaction.editReply({
      embeds: [{
        title: `📊 ${type.charAt(0).toUpperCase() + type.slice(1)} Team Digest`,
        description: digest.summary,
        fields: [
          {
            name: '🎯 Performance',
            value: `Avg Score: ${digest.performance.average_score}\nMatches: ${digest.performance.total_matches}`,
            inline: true
          },
          {
            name: '📈 Attendance',
            value: `Rate: ${digest.attendance.rate}%\nSessions: ${digest.attendance.total_sessions}`,
            inline: true
          },
          {
            name: '💰 Earnings',
            value: `Total: $${digest.financials.total_winnings}\nROI: ${digest.financials.roi}%`,
            inline: true
          }
        ],
        color: 0x00ff00,
        timestamp: new Date().toISOString()
      }]
    });

  } catch (error) {
    logger.error('Digest command failed:', error);
    await interaction.editReply('❌ Failed to generate digest. Please try again later.');
  }
}
```

### Performance Command (`src/commands/performance.ts`):

```typescript
import { SlashCommandBuilder, CommandInteraction, AttachmentBuilder } from 'discord.js';
import { crmApi } from '../services/crm-api';
import { logger } from '../utils/logger';

export const data = new SlashCommandBuilder()
  .setName('performance')
  .setDescription('Upload or view team performance data')
  .addSubcommand(subcommand =>
    subcommand
      .setName('upload')
      .setDescription('Upload performance screenshot')
      .addAttachmentOption(option =>
        option.setName('screenshot')
          .setDescription('Performance screenshot')
          .setRequired(true)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('view')
      .setDescription('View recent performance data')
      .addStringOption(option =>
        option.setName('period')
          .setDescription('Time period')
          .addChoices(
            { name: 'Last 7 days', value: '7d' },
            { name: 'Last 30 days', value: '30d' },
            { name: 'Last 90 days', value: '90d' }
          )
      )
  );

export async function execute(interaction: CommandInteraction) {
  const guildId = interaction.guildId!;
  const subcommand = interaction.options.data[0].name;

  await interaction.deferReply();

  try {
    if (subcommand === 'upload') {
      const attachment = interaction.options.get('screenshot')?.attachment;
      
      if (!attachment) {
        await interaction.editReply('❌ Please provide a screenshot.');
        return;
      }

      // Upload to CRM for OCR processing
      const result = await crmApi.uploadPerformance(guildId, {
        image_url: attachment.url,
        uploaded_by: interaction.user.id,
        uploaded_at: new Date().toISOString()
      });

      await interaction.editReply('✅ Performance data uploaded successfully! Processing with OCR...');

    } else if (subcommand === 'view') {
      const period = interaction.options.get('period')?.value as string || '30d';
      const performance = await crmApi.getTeamPerformance(guildId, period);

      await interaction.editReply({
        embeds: [{
          title: '📊 Team Performance Overview',
          fields: [
            {
              name: '🎯 Overall Statistics',
              value: `Matches Played: ${performance.total_matches}\nWin Rate: ${performance.win_rate}%\nAverage Score: ${performance.average_score}`,
              inline: false
            },
            {
              name: '⭐ Top Performers',
              value: performance.top_players.map((p: any) => 
                `${p.player_name}: ${p.average_score} avg`
              ).join('\n'),
              inline: true
            },
            {
              name: '📈 Recent Trend',
              value: performance.trend === 'up' ? '📈 Improving' : 
                     performance.trend === 'down' ? '📉 Declining' : '➡️ Stable',
              inline: true
            }
          ],
          color: 0x0099ff,
          timestamp: new Date().toISOString()
        }]
      });
    }

  } catch (error) {
    logger.error('Performance command failed:', error);
    await interaction.editReply('❌ Failed to process performance data. Please try again later.');
  }
}
```

## 🔄 Step 7: Event Handlers

### Ready Event (`src/events/ready.ts`):

```typescript
import { Client, Events } from 'discord.js';
import { logger } from '../utils/logger';

export const name = Events.ClientReady;
export const once = true;

export function execute(client: Client) {
  logger.info(`🤖 RaptorBot is online! Logged in as ${client.user?.tag}`);
  
  // Set bot status
  client.user?.setActivity('Raptor Esports Hub', { type: 'WATCHING' });
  
  // Register slash commands globally
  registerCommands(client);
}

async function registerCommands(client: Client) {
  // Implementation to register slash commands
  logger.info('🔧 Registering slash commands...');
  // Add command registration logic here
}
```

## 📋 Step 8: Package.json Scripts

Update your `package.json`:

```json
{
  "name": "raptorbot-discord",
  "version": "1.0.0",
  "description": "Discord bot for Raptor Esports Hub CRM integration",
  "main": "dist/bot.js",
  "scripts": {
    "dev": "nodemon --exec ts-node src/bot.ts",
    "build": "tsc",
    "start": "node dist/bot.js",
    "test": "echo \"No tests specified\"",
    "deploy-commands": "ts-node src/deploy-commands.ts"
  },
  "dependencies": {
    "discord.js": "^14.14.1",
    "@discordjs/builders": "^1.7.0",
    "@discordjs/rest": "^2.2.0",
    "axios": "^1.6.0",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "@types/node": "^20.10.0",
    "ts-node": "^10.9.0",
    "nodemon": "^3.0.0"
  }
}
```

## 🚀 Step 9: Deployment

### Local Development:
```bash
npm run dev
```

### Production Deployment:
1. **Docker Setup** (recommended):
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
CMD ["npm", "start"]
```

2. **Environment Variables**:
   - Set all required environment variables
   - Ensure `RAPTOR_BOT_API_KEY` matches CRM configuration

3. **Process Management**:
   - Use PM2 or similar for production
   - Set up monitoring and logging

## 🔗 Step 10: Connect to CRM

1. **Update CRM Environment**:
   ```env
   RAPTOR_BOT_API_KEY=your_secure_api_key_here
   ```

2. **Invite Bot to Servers**:
   - Use OAuth2 URL from Discord Developer Portal
   - Grant necessary permissions
   - Test commands in Discord

3. **Configure CRM Bot Management**:
   - Access `/dashboard/bot-management` in CRM
   - Configure server settings
   - Set up webhooks
   - Enable desired modules

## ✅ Step 11: Testing Integration

1. **Test Commands**:
   - `/digest daily` - Should generate daily report
   - `/performance view` - Should show performance data
   - Upload screenshot via `/performance upload`

2. **Test CRM Integration**:
   - Check bot management dashboard
   - Verify data sync
   - Test webhook delivery

3. **Monitor Logs**:
   - Bot console logs
   - CRM API request logs
   - Database updates

## 🎯 **Summary**

This setup will create a Discord bot that:
- ✅ Integrates with your existing CRM bot management UI
- ✅ Uses the API endpoints you've already built
- ✅ Manages tournaments, performance tracking, attendance
- ✅ Generates AI-powered insights and reports
- ✅ Provides slash commands for team interaction
- ✅ Syncs data with Supabase database

The bot will be the missing piece that connects Discord users with your comprehensive CRM system!