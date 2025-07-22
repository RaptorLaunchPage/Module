# 🔌 API Documentation

Complete API reference for the Raptors Esports CRM system.

## 🔐 **Authentication**

All API endpoints require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

### **Getting a Token**
Use the Supabase client to get the current user's token:
```javascript
const token = await supabase.auth.getSession().then(({ data }) => data.session?.access_token)
```

---

## 👥 **Users API**

### **GET /api/users**
Fetch users with role-based filtering.

**Permissions**: Admin, Manager, Coach, Analyst

**Query Parameters**: None

**Response**:
```json
[
  {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "player",
    "team_id": "uuid",
    "status": "Active",
    "created_at": "2025-01-15T10:00:00Z"
  }
]
```

### **PUT /api/users**
Update user role and team assignment.

**Permissions**: Admin only

**Request Body**:
```json
{
  "userId": "uuid",
  "role": "player",
  "team_id": "uuid"
}
```

**Response**:
```json
{
  "success": true,
  "user": { /* updated user object */ }
}
```

---

## 🏆 **Teams API**

### **GET /api/teams**
Fetch teams based on user role.

**Permissions**: Admin, Manager, Coach, Analyst

**Response**:
```json
[
  {
    "id": "uuid",
    "name": "Raptors Main",
    "tier": "T1",
    "status": "active",
    "coach_id": "uuid"
  }
]
```

---

## 🎯 **Performances API**

### **GET /api/performances**
Fetch performance data with role-based filtering.

**Permissions**: All authenticated users

**Query Parameters**:
- `team_id`: Filter by team (optional)
- `player_id`: Filter by player (optional)
- `date_from`: Start date filter (optional)
- `date_to`: End date filter (optional)

**Response**:
```json
[
  {
    "id": "uuid",
    "team_id": "uuid",
    "player_id": "uuid",
    "match_number": 1,
    "map": "Erangle",
    "placement": 5,
    "kills": 8,
    "assists": 3,
    "damage": 1250.5,
    "survival_time": 1800.0,
    "slot": "Tournament Slot A",
    "created_at": "2025-01-15T10:00:00Z"
  }
]
```

### **POST /api/performances**
Submit new performance data.

**Permissions**: All authenticated users (players can only submit own data)

**Request Body**:
```json
{
  "player_id": "uuid",
  "team_id": "uuid",
  "match_number": 1,
  "map": "Erangle",
  "placement": 5,
  "kills": 8,
  "assists": 3,
  "damage": 1250.5,
  "survival_time": 1800.0,
  "slot": "Tournament Slot A"
}
```

**Response**:
```json
{
  "success": true,
  "performance": { /* created performance object */ },
  "message": "Performance submitted successfully"
}
```

---

## 📅 **Sessions API**

### **GET /api/sessions**
Fetch sessions with optional filtering.

**Permissions**: All authenticated users

**Query Parameters**:
- `date`: Filter by specific date (YYYY-MM-DD)
- `team_id`: Filter by team
- `session_type`: Filter by type (practice, tournament, meeting)

**Response**:
```json
[
  {
    "id": "uuid",
    "team_id": "uuid",
    "session_type": "practice",
    "session_subtype": "Morning",
    "date": "2025-01-15",
    "start_time": "09:00:00",
    "end_time": "12:00:00",
    "cutoff_time": "12:00:00",
    "title": "Morning Practice",
    "is_mandatory": true,
    "created_by": "uuid"
  }
]
```

### **POST /api/sessions**
Create a new session.

**Permissions**: Admin, Manager

**Request Body**:
```json
{
  "team_id": "uuid",
  "session_type": "practice",
  "session_subtype": "Morning",
  "date": "2025-01-15",
  "start_time": "09:00:00",
  "end_time": "12:00:00",
  "cutoff_time": "12:00:00",
  "title": "Morning Practice",
  "description": "Regular morning practice session",
  "is_mandatory": true
}
```

### **PUT /api/sessions**
Update an existing session.

**Permissions**: Admin, Manager

**Request Body**:
```json
{
  "id": "uuid",
  "title": "Updated Practice Session",
  "start_time": "10:00:00"
}
```

### **DELETE /api/sessions**
Delete a session.

**Permissions**: Admin, Manager

**Query Parameters**:
- `id`: Session ID to delete

---

## ✅ **Attendance API**

### **POST /api/sessions/mark-attendance**
Mark attendance for a session.

**Permissions**: All authenticated users

**Request Body**:
```json
{
  "session_id": "uuid",
  "status": "present",
  "player_id": "uuid" // Optional, for coaches marking others
}
```

**Response**:
```json
{
  "success": true,
  "attendance": { /* attendance record */ },
  "message": "Attendance marked as present"
}
```

---

## 🎮 **Tryouts API**

### **GET /api/tryouts**
Fetch tryouts with application counts.

**Permissions**: Admin, Manager, Coach

**Response**:
```json
{
  "tryouts": [
    {
      "id": "uuid",
      "name": "Raptors Main - July 2025",
      "purpose": "existing_team",
      "target_roles": ["Entry", "IGL"],
      "type": "scrim",
      "status": "active",
      "application_deadline": "2025-01-31T23:59:59Z",
      "evaluation_method": "mixed",
      "open_to_public": true,
      "_count": {
        "applications": 15
      },
      "created_at": "2025-01-15T10:00:00Z"
    }
  ]
}
```

### **POST /api/tryouts**
Create a new tryout campaign.

**Permissions**: Admin, Manager, Coach

**Request Body**:
```json
{
  "name": "Raptors Main - July 2025",
  "description": "Looking for skilled players",
  "purpose": "existing_team",
  "target_roles": ["Entry", "IGL"],
  "type": "scrim",
  "open_to_public": true,
  "application_deadline": "2025-01-31T23:59:59Z",
  "evaluation_method": "mixed",
  "requirements": "Must have PUBG Mobile experience"
}
```

---

## 💬 **Discord Portal API**

### **GET /api/discord-portal/webhooks**
Fetch Discord webhooks.

**Permissions**: Admin, Manager

**Query Parameters**:
- `teamId`: Filter by team (optional)

**Response**:
```json
{
  "webhooks": [
    {
      "id": "uuid",
      "team_id": "uuid",
      "hook_url": "https://discord.com/api/webhooks/...",
      "type": "team",
      "active": true,
      "channel_name": "general",
      "created_at": "2025-01-15T10:00:00Z"
    }
  ]
}
```

### **POST /api/discord-portal/webhooks**
Create a new webhook.

**Permissions**: Admin, Manager

**Request Body**:
```json
{
  "team_id": "uuid",
  "hook_url": "https://discord.com/api/webhooks/...",
  "type": "team",
  "channel_name": "general"
}
```

### **PUT /api/discord-portal/webhooks**
Update a webhook.

**Permissions**: Admin, Manager

**Request Body**:
```json
{
  "id": "uuid",
  "active": false,
  "channel_name": "announcements"
}
```

### **DELETE /api/discord-portal/webhooks**
Delete a webhook.

**Permissions**: Admin, Manager

**Query Parameters**:
- `id`: Webhook ID to delete

### **POST /api/discord-portal/send**
Send a message via Discord webhook.

**Permissions**: Admin, Manager, Coach

**Request Body**:
```json
{
  "webhook_id": "uuid",
  "message": "Hello team!",
  "embed": {
    "title": "Performance Update",
    "description": "Great job in today's matches!",
    "color": 0x00ff00
  }
}
```

### **GET /api/discord-portal/logs**
Fetch communication logs.

**Permissions**: Admin, Manager

**Query Parameters**:
- `limit`: Number of logs to return (default: 50)
- `startDate`: Filter from date
- `endDate`: Filter to date
- `status`: Filter by status (success, failed, pending, retry)

**Response**:
```json
{
  "logs": [
    {
      "id": "uuid",
      "message_type": "performance_update",
      "status": "success",
      "response_code": 200,
      "timestamp": "2025-01-15T10:00:00Z",
      "webhook": {
        "channel_name": "general"
      }
    }
  ]
}
```

---

## 🔍 **Error Handling**

### **Standard Error Response**
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": { /* additional error details */ }
}
```

### **Common HTTP Status Codes**
- `200`: Success
- `201`: Created
- `400`: Bad Request (validation error)
- `401`: Unauthorized (invalid token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `500`: Internal Server Error

### **Authentication Errors**
```json
{
  "error": "Authorization header required",
  "code": "MISSING_AUTH_HEADER"
}
```

```json
{
  "error": "Invalid token",
  "code": "INVALID_TOKEN"
}
```

### **Permission Errors**
```json
{
  "error": "Insufficient permissions to view users",
  "code": "INSUFFICIENT_PERMISSIONS"
}
```

### **Validation Errors**
```json
{
  "error": "Missing required fields: name, email",
  "code": "VALIDATION_ERROR",
  "fields": ["name", "email"]
}
```

---

## 📊 **Rate Limiting**

### **Limits**
- **General API**: 100 requests per minute per user
- **Discord API**: 10 requests per minute per webhook
- **Performance Submission**: 50 requests per hour per player

### **Headers**
Rate limit information is included in response headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642694400
```

---

## 🔧 **Development**

### **Testing API Endpoints**
Use the built-in debug page at `/dashboard/debug` to test API connectivity.

### **Environment Variables**
Required environment variables:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### **Database Connection**
All API routes use the Supabase client with automatic connection handling and graceful fallbacks for missing credentials.

---

**API Version**: v1.0 - Production Ready ✅
