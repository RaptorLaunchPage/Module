# 🤖 RaptorBot API Documentation

## 📋 **OVERVIEW**

The Raptors Esports CRM provides a comprehensive REST API for Discord bot integration, enabling real-time data synchronization between Discord and the CRM system.

### **Base URL**
```
https://your-domain.com/api/discord/
```

### **Authentication**
All API endpoints require authentication via Bearer token:
```
Authorization: Bearer YOUR_BOT_API_KEY
```

---

## 🎮 **PERFORMANCE TRACKING**

### **POST** `/performance/upload`
Upload performance data from Discord bot (OCR + AI processed).

**Request Body:**
```json
{
  "discord_id": "123456789",
  "guild_id": "987654321",
  "kills": 12,
  "damage": 2500,
  "placement": 3,
  "survival_time": 1800,
  "assists": 5,
  "map_name": "Erangel",
  "game_mode": "Squad",
  "match_id": "match_001",
  "metadata": {
    "weapon_used": "AKM",
    "headshot_rate": 0.45
  }
}
```

**Response:**
```json
{
  "success": true,
  "record_id": "uuid-here",
  "message": "Performance data saved successfully"
}
```

### **GET** `/team-performance?guild_id=X&days=30&limit=10`
Get team performance statistics and rankings.

**Response:**
```json
{
  "success": true,
  "team_info": {
    "guild_id": "987654321",
    "team_name": "Raptors Alpha",
    "team_id": "team-uuid"
  },
  "statistics": {
    "total_matches": 45,
    "total_kills": 540,
    "avg_kills_per_match": "12.0",
    "avg_placement": "5.2"
  },
  "top_players": [
    {
      "discord_id": "123456789",
      "username": "PlayerOne",
      "avg_kills": "15.3",
      "best_placement": 1
    }
  ]
}
```

---

## 📅 **ATTENDANCE TRACKING**

### **POST** `/attendance/mark`
Mark user attendance (voice channel join/leave or manual).

**Request Body:**
```json
{
  "discord_id": "123456789",
  "guild_id": "987654321",
  "session_id": "session-uuid",
  "attendance_type": "voice_join",
  "status": "present",
  "duration": 3600,
  "metadata": {
    "channel_name": "Practice Voice"
  }
}
```

### **GET** `/sessions?guild_id=X&type=current`
Get current/upcoming sessions for attendance tracking.

**Query Parameters:**
- `type`: `current`, `next`, `today`, `week`

**Response:**
```json
{
  "success": true,
  "sessions": [
    {
      "id": "session-uuid",
      "session_type": "practice",
      "title": "Evening Practice",
      "is_current": true,
      "time_until": 30,
      "formatted_time": "19:00 - 21:00"
    }
  ]
}
```

### **GET** `/attendance-summary?discord_id=X&guild_id=Y&days=30`
Get personal attendance summary for a user.

### **GET** `/team-attendance-summary?guild_id=X&days=30`
Get team-wide attendance statistics and rankings.

---

## 📊 **DIGEST & REPORTING**

### **GET** `/digest?guild_id=X&type=daily`
Generate daily or weekly team digest with all metrics.

**Query Parameters:**
- `type`: `daily` or `weekly`

**Response:**
```json
{
  "success": true,
  "digest_type": "daily",
  "summary": {
    "performance": {
      "total_matches": 12,
      "top_performer": {
        "username": "PlayerOne",
        "kills": 45
      }
    },
    "attendance": {
      "attendance_rate": "85.5%",
      "total_records": 20
    },
    "highlights": [
      "🎮 **12** matches played",
      "🏆 Top performer: **PlayerOne** (45 kills)"
    ]
  }
}
```

### **GET** `/webhooks?guild_id=X&digest=true`
Get Discord webhook URLs for posting digests.

---

## 🎯 **TRYOUT SYSTEM**

### **POST** `/tryout/announce`
Create and announce a new tryout campaign.

**Request Body:**
```json
{
  "guild_id": "987654321",
  "discord_channel_id": "channel-id",
  "name": "T2 Team Tryouts",
  "purpose": "new_team",
  "mode": "player",
  "type": "scrim",
  "target_roles": ["IGL", "Fragger"],
  "description": "Looking for skilled players",
  "application_deadline": "2024-02-15T23:59:59Z",
  "created_by_discord_id": "123456789"
}
```

**Response:**
```json
{
  "success": true,
  "tryout": {
    "id": "tryout-uuid",
    "name": "T2 Team Tryouts",
    "status": "active"
  },
  "application_url": "https://your-domain.com/tryout/tryout-uuid/apply",
  "embed_data": {
    "title": "🎯 T2 Team Tryouts",
    "fields": [...]
  }
}
```

### **POST** `/tryout/apply`
Submit a tryout application from Discord.

**Request Body:**
```json
{
  "tryout_id": "tryout-uuid",
  "discord_id": "123456789",
  "guild_id": "987654321",
  "full_name": "John Doe",
  "ign": "JohnD_Gaming",
  "role_applied_for": "IGL",
  "availability": ["weekends", "evenings"],
  "highlights_links": ["https://youtube.com/watch?v=xyz"]
}
```

### **POST** `/tryout/invite`
Mark a candidate as invited to next phase.

### **POST** `/tryout/evaluate`
Submit evaluation scores and feedback.

**Request Body:**
```json
{
  "tryout_id": "tryout-uuid",
  "evaluator_discord_id": "evaluator-id",
  "guild_id": "987654321",
  "kills": 15,
  "damage": 2800,
  "placement": 2,
  "game_sense_score": 8,
  "utility_score": 7,
  "recommendation": "select",
  "strengths": "Excellent game sense and communication",
  "is_final": true
}
```

### **GET** `/tryout/status?discord_id=X&guild_id=Y`
Get user's tryout application status and progress.

### **GET** `/tryout/list?guild_id=X&status=active`
List all tryouts for a guild with statistics.

---

## 🔐 **SECURITY & RATE LIMITS**

### **Authentication**
- All endpoints require `Authorization: Bearer YOUR_BOT_API_KEY`
- API key must be set in `RAPTOR_BOT_API_KEY` environment variable

### **Rate Limits**
- **Performance**: 60 requests/minute
- **Attendance**: 30 requests/minute  
- **Queries**: 100 requests/minute
- **Tryouts**: 10 requests/minute

### **Error Codes**
- `401` - Invalid API key
- `400` - Missing required parameters
- `404` - Resource not found
- `429` - Rate limit exceeded
- `500` - Server error

---

## 📝 **COMMON WORKFLOWS**

### **Performance Upload Flow**
1. Bot processes OCR from screenshot
2. AI extracts game statistics
3. POST to `/performance/upload`
4. Data saved to both `performance_records` and `performances` tables

### **Attendance Tracking Flow**
1. User joins voice channel
2. Bot detects join event
3. GET `/sessions` to find current session
4. POST `/attendance/mark` with voice join data
5. Sync to main attendance table

### **Daily Digest Flow**
1. GET `/digest?type=daily` for team stats
2. GET `/webhooks?digest=true` for webhook URL
3. Format and post digest to Discord channel

### **Tryout Management Flow**
1. Staff creates tryout: POST `/tryout/announce`
2. Users apply: POST `/tryout/apply`
3. Staff reviews and invites: POST `/tryout/invite`
4. Evaluation sessions: POST `/tryout/evaluate`
5. Users check status: GET `/tryout/status`

---

## 🧪 **TESTING**

### **cURL Examples**

**Upload Performance:**
```bash
curl -X POST https://your-domain.com/api/discord/performance/upload \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "discord_id": "123456789",
    "guild_id": "987654321",
    "kills": 10,
    "damage": 2000,
    "placement": 5
  }'
```

**Get Team Performance:**
```bash
curl "https://your-domain.com/api/discord/team-performance?guild_id=987654321" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Mark Attendance:**
```bash
curl -X POST https://your-domain.com/api/discord/attendance/mark \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "discord_id": "123456789",
    "guild_id": "987654321",
    "attendance_type": "voice_join",
    "status": "present"
  }'
```

---

## 🛠️ **SETUP INSTRUCTIONS**

1. **Environment Configuration:**
   ```bash
   # Add to .env
   RAPTOR_BOT_API_KEY=your_secure_random_key_here
   ```

2. **Database Setup:**
   ```bash
   # Run the updated schema
   psql -f scripts/00-complete-schema-setup.sql
   ```

3. **Discord Server Linking:**
   - Link Discord servers to teams in `discord_servers` table
   - Link Discord users to CRM users in `discord_users` table

4. **Bot Configuration:**
   - Configure bot to use base URL: `https://your-domain.com/api/discord/`
   - Set API key in bot environment

---

## 📈 **MONITORING & ANALYTICS**

### **Request Logging**
All requests are logged with:
- Timestamp
- Endpoint
- Success/failure
- Response time
- Client IP
- User agent

### **Performance Metrics**
Track:
- API response times
- Error rates by endpoint
- Request volume patterns
- Data sync success rates

### **Health Checks**
- Database connectivity
- API key validation
- Rate limit monitoring
- Discord webhook delivery

---

## 🔧 **TROUBLESHOOTING**

### **Common Issues**

**401 Unauthorized:**
- Check `RAPTOR_BOT_API_KEY` environment variable
- Verify Authorization header format: `Bearer YOUR_KEY`

**404 Not Found:**
- Verify guild_id exists in `discord_servers` table
- Check if Discord user is linked in `discord_users` table

**500 Server Error:**
- Check database connectivity
- Verify all required tables exist
- Check server logs for detailed error messages

**Data Not Syncing:**
- Verify foreign key relationships
- Check RLS policies for permissions
- Ensure user is properly linked between Discord and CRM

---

## 📞 **SUPPORT**

For technical support or feature requests related to the Discord bot API integration, please:

1. Check this documentation first
2. Review server logs for detailed error messages
3. Verify database schema is up to date
4. Test with cURL to isolate issues
5. Contact development team with specific error details

**API Version:** 1.0  
**Last Updated:** January 2024  
**Compatibility:** RaptorBot v2.0+