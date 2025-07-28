# 🔗 RaptorBot ↔ CRM Integration Guide

## 🎯 **Integration Overview**

You have **TWO COMPLETE SYSTEMS** that need to be connected:

### ✅ **Python Discord Bot** (Repository: RaptorLaunchPage/Test)
- **Status**: Fully built and functional
- **Features**: Performance AI, Attendance tracking, Tryouts, Digest reporting
- **Integration**: Has CRM API client built-in

### ✅ **Next.js CRM System** (Current workspace)
- **Status**: Complete with all bot management UI
- **Features**: 7 bot management pages, all API endpoints, database schema
- **Integration**: Ready to receive bot API calls

## 🚀 **Quick Integration Steps**

### **Step 1: Configure Bot for CRM Connection**

1. **Update Bot Configuration**:
   ```bash
   cd discord-bot/src
   # Edit the config.py file I created with your actual values
   ```

2. **Set Your Actual Values in `config.py`**:
   ```python
   # Replace these with your actual values:
   DISCORD_TOKEN = "YOUR_ACTUAL_BOT_TOKEN"
   BOT_OWNER_ID = your_actual_discord_id
   CRM_API_BASE_URL = "https://your-actual-crm-domain.com"
   RAPTOR_BOT_API_KEY = "your_actual_secure_api_key"
   ```

### **Step 2: Set Up CRM Environment**

1. **Update CRM Environment Variables**:
   ```bash
   # In your CRM .env.local file, add:
   RAPTOR_BOT_API_KEY=your_actual_secure_api_key
   NEXT_PUBLIC_RAPTOR_BOT_API_KEY=your_actual_secure_api_key
   ```

2. **Ensure API Key Matches**: The same key must be in both systems

### **Step 3: Deploy and Test**

1. **Start the Bot**:
   ```bash
   cd discord-bot
   pip install -r requirements.txt
   python src/bot.py
   ```

2. **Test CRM Connection**:
   - Access `/dashboard/bot-management` in your CRM
   - Invite bot to Discord server
   - Try `/addperformance` command in Discord
   - Check if data appears in CRM

## 📋 **Detailed Integration Checklist**

### **Phase 1: Environment Setup** ⚙️

- [ ] **Bot Configuration**
  - [ ] Copy `config.py` I created to `discord-bot/src/config.py`
  - [ ] Set `DISCORD_TOKEN` (from Discord Developer Portal)
  - [ ] Set `BOT_OWNER_ID` (your Discord user ID)
  - [ ] Set `CRM_API_BASE_URL` (your CRM domain)
  - [ ] Set `RAPTOR_BOT_API_KEY` (secure random string)

- [ ] **CRM Configuration**
  - [ ] Add `RAPTOR_BOT_API_KEY` to CRM environment
  - [ ] Verify all API endpoints are working
  - [ ] Test build with `pnpm build`

- [ ] **Database Setup**
  - [ ] Bot database configured (for bot internal data)
  - [ ] CRM database configured (for web UI data)
  - [ ] Both systems can operate independently

### **Phase 2: Discord Bot Setup** 🤖

- [ ] **Discord Application**
  - [ ] Bot created in Discord Developer Portal
  - [ ] Bot token copied to bot config
  - [ ] Bot invited to test server with admin permissions

- [ ] **Bot Dependencies**
  - [ ] Python 3.11+ installed
  - [ ] `pip install -r requirements.txt` completed
  - [ ] Google Cloud Vision credentials (for OCR)
  - [ ] OpenAI API key (optional, for AI summaries)

- [ ] **Bot Testing**
  - [ ] Bot starts without errors
  - [ ] Bot appears online in Discord
  - [ ] Slash commands register properly

### **Phase 3: CRM Integration Testing** 🔗

- [ ] **API Connectivity**
  - [ ] Bot can reach CRM API endpoints
  - [ ] Authentication with API key works
  - [ ] Error handling for failed requests

- [ ] **Command Testing**
  - [ ] `/addperformance` uploads data to CRM
  - [ ] `/present` marks attendance in CRM
  - [ ] `/reviewteam` fetches data from CRM
  - [ ] `/digest daily` generates reports

- [ ] **CRM Dashboard Testing**
  - [ ] Bot appears in `/dashboard/bot-management`
  - [ ] Performance data shows in dashboard
  - [ ] Attendance data synchronizes
  - [ ] All 7 management pages work

### **Phase 4: Advanced Features** 🚀

- [ ] **Performance AI**
  - [ ] OCR processing for match screenshots
  - [ ] Performance data extraction
  - [ ] AI-powered performance summaries

- [ ] **Attendance System**
  - [ ] Discord attendance commands
  - [ ] Attendance tracking in CRM
  - [ ] AI attendance insights

- [ ] **Tryout Management**
  - [ ] Tryout creation in Discord
  - [ ] Candidate management in CRM
  - [ ] Evaluation workflows

- [ ] **Digest Reporting**
  - [ ] Automated daily/weekly reports
  - [ ] Webhook delivery to Discord
  - [ ] Custom digest scheduling

## 🔧 **Configuration Details**

### **Required Environment Variables**

#### **Bot Side** (`discord-bot/src/config.py`):
```python
DISCORD_TOKEN = "MTIzNDU2Nzg5MDEyMzQ1Njc4OQ.GExample.Token_Here"
BOT_OWNER_ID = 123456789012345678
CRM_API_BASE_URL = "https://crm.yourdomain.com"
RAPTOR_BOT_API_KEY = "secure_random_api_key_here"
```

#### **CRM Side** (`.env.local`):
```env
RAPTOR_BOT_API_KEY=secure_random_api_key_here
NEXT_PUBLIC_RAPTOR_BOT_API_KEY=secure_random_api_key_here
```

### **API Endpoint Mapping**

Your bot expects these endpoints (all already built in your CRM):

| Bot Function | CRM Endpoint | Status |
|-------------|-------------|---------|
| Performance Upload | `/api/discord/performance/upload` | ✅ Built |
| Team Performance | `/api/discord/team-performance` | ✅ Built |
| Attendance Mark | `/api/discord/attendance/mark` | ✅ Built |
| Attendance Summary | `/api/discord/attendance-summary` | ✅ Built |
| Digest Data | `/api/discord/digest` | ✅ Built |
| Tryout Management | `/api/discord/tryout/*` | ✅ Built |
| Bot Sync | `/api/discord/sync-bot` | ✅ Built |

## 🎮 **Testing Workflow**

### **1. Basic Connectivity Test**
```bash
# In Discord:
/addperformance [upload screenshot]

# Expected Result:
# - Bot processes screenshot with OCR
# - Data uploads to CRM via API
# - Performance appears in CRM dashboard
```

### **2. Attendance Test**
```bash
# In Discord:
/present

# Expected Result:
# - Attendance marked in bot
# - Data syncs to CRM
# - Visible in CRM attendance page
```

### **3. Team Performance Test**
```bash
# In Discord:
/reviewteam

# Expected Result:
# - Bot fetches data from CRM
# - AI-generated team summary
# - Performance insights displayed
```

### **4. Digest Test**
```bash
# In Discord:
/digest daily

# Expected Result:
# - CRM generates digest data
# - Bot formats as Discord embed
# - Report delivered to channel
```

### **5. CRM Dashboard Test**
```bash
# In CRM:
# 1. Visit /dashboard/bot-management
# 2. See bot listed as connected
# 3. Access server-specific controls
# 4. Verify all 7 management pages work
```

## 🚨 **Common Issues & Solutions**

### **Bot Won't Connect to CRM**
- ✅ **Check**: API key matches in both systems
- ✅ **Check**: CRM URL is correct and accessible
- ✅ **Check**: CRM API endpoints return proper responses

### **Commands Not Working**
- ✅ **Check**: Bot has proper Discord permissions
- ✅ **Check**: Slash commands registered successfully
- ✅ **Check**: Bot owner ID is correct in config

### **Data Not Syncing**
- ✅ **Check**: Database connections on both sides
- ✅ **Check**: API authentication headers
- ✅ **Check**: Error logs in both bot and CRM

### **OCR Not Working**
- ✅ **Check**: Google Cloud Vision credentials
- ✅ **Check**: Image file formats supported
- ✅ **Check**: GCP API quotas and billing

## 🎯 **Expected End Result**

After successful integration, you'll have:

### **Discord Bot Features** 🤖
- ✅ `/addperformance` - Upload match screenshots with OCR
- ✅ `/present`, `/absent`, `/late` - Mark attendance
- ✅ `/reviewteam` - AI-powered team analysis
- ✅ `/digest daily/weekly` - Automated reports
- ✅ `/tryout_announce` - Create player/team tryouts
- ✅ All performance data syncs to CRM

### **CRM Management Features** 💻
- ✅ Complete bot management dashboard
- ✅ Real-time performance tracking
- ✅ Attendance monitoring and insights
- ✅ Tournament and tryout management
- ✅ AI-powered analytics and reporting
- ✅ Webhook configuration and testing
- ✅ User and role synchronization

### **Automated Workflows** 🔄
- ✅ Performance screenshots → OCR → CRM storage → Dashboard display
- ✅ Discord attendance → CRM tracking → AI insights
- ✅ Team performance → AI analysis → Automated reports
- ✅ Tryout applications → CRM management → Discord notifications

## 📞 **Support & Next Steps**

### **If Everything Works** ✅
1. **Production Deployment**: Deploy both systems to production
2. **Team Onboarding**: Invite team members and configure permissions
3. **Feature Enablement**: Enable advanced features like digest reporting
4. **Monitoring Setup**: Set up logging and monitoring for both systems

### **If You Need Help** 🆘
1. **Check logs**: Both bot console and CRM API logs
2. **Test individually**: Verify each system works independently
3. **Verify configuration**: Double-check all environment variables
4. **Network testing**: Ensure bot can reach CRM endpoints

---

## 🎉 **Final Notes**

This integration connects your **existing sophisticated Python bot** with your **comprehensive Next.js CRM** to create a complete esports management platform. Both systems are already built - they just need to be connected with proper configuration!

**Estimated Setup Time**: 1-2 hours for configuration and testing
**Maintenance**: Minimal - both systems are production-ready