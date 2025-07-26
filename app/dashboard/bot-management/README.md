# 🤖 Bot Management Module

The Bot Management module provides a unified control center for managing RaptorBot features across all connected Discord servers. This module replaces the old Quotient dashboard and integrates directly with the CRM system.

## 📁 Module Structure

```
app/dashboard/bot-management/
├── layout.tsx                 # Shared layout with navigation
├── page.tsx                   # Bot overview and server list
├── [guild_id]/                # Guild-specific management
│   ├── page.tsx               # Bot controls for this server
│   ├── scrims.tsx             # Scrim manager
│   ├── tournaments.tsx        # Tournament controls (TODO)
│   ├── tryouts.tsx            # Tryout controls (TODO)
│   ├── webhooks.tsx           # Webhook configuration
│   ├── performance.tsx        # Performance upload & AI settings
│   ├── attendance.tsx         # Attendance system settings
│   └── features.tsx           # Feature toggles (admin-only)
└── README.md                  # This documentation
```

## 🔐 Access Control

The module uses role-based permissions from `lib/dashboard-permissions.ts`:

- **Admin**: Full access to all features and admin controls
- **Manager**: Access to servers they manage, can modify settings
- **Coach**: View-only access to assigned team servers
- **Analyst**: View-only access to performance and analytics data
- **Player**: No access to bot management

## 📊 Key Features

### 1. Bot Overview (`/dashboard/bot-management`)

**Purpose**: Central dashboard showing all connected Discord servers

**Features**:
- Server list with status indicators
- Statistics overview (total servers, active modules, AI usage)
- Quick access to server management
- Search and filtering capabilities

**Data Sources**:
- `discord_servers` table
- Module usage statistics
- Team connections

### 2. Server Management (`/dashboard/bot-management/[guild_id]`)

**Purpose**: Main bot controls for a specific Discord server

**Features**:
- Bot nickname configuration
- Module enable/disable toggles
- Server sync controls
- Bot removal (admin only)

**Modules Available**:
- Performance Tracking (Free)
- Attendance System (Free)
- Tryout Management (Free)
- Daily Digest (Free)
- Scrim Manager (Premium)
- Tournament System (Premium)

### 3. Scrim Management (`[guild_id]/scrims`)

**Purpose**: Create and manage scrim tournaments

**Features**:
- Create new scrims with scheduling
- Team registration management
- Status tracking (draft → open → in progress → completed)
- Limit enforcement (3 active scrims for free users)
- Prize pool configuration

**Database Integration**:
- `scrims` table for scrim data
- `assigned_slots` for team registrations
- Team limits based on subscription tier

### 4. Webhook Configuration (`[guild_id]/webhooks`)

**Purpose**: Manage Discord webhooks for bot notifications

**Features**:
- Add/edit/delete webhooks
- Webhook testing functionality
- Delivery log monitoring
- Channel type categorization (team/admin/global)

**Database Integration**:
- `discord_webhooks` table
- `communication_logs` for delivery tracking

### 5. Performance System (`[guild_id]/performance`)

**Purpose**: Control OCR uploads and AI analysis features

**Features**:
- Enable/disable OCR uploads
- AI analysis settings
- Performance data overview
- Manual analysis triggering
- Data export functionality

**Database Integration**:
- `performance_records` table
- Settings stored in `discord_servers.settings`
- AI analysis metadata

### 6. Attendance Control (`[guild_id]/attendance`)

**Purpose**: Manage practice attendance tracking

**Features**:
- Auto-tracking configuration
- AI summary generation settings
- Attendance statistics overview
- Data export and reporting
- Integration with team reports

**Database Integration**:
- `attendances` table
- `sessions` table
- Bot attendance tracking

### 7. Feature Toggles (`[guild_id]/features`) - Admin Only

**Purpose**: Advanced feature management and premium controls

**Features**:
- Grant premium access to servers
- Mark servers as org-owned
- Custom limit configuration
- Feature override controls
- Enterprise feature management

**Access**: Restricted to system administrators only

## 🛠️ Technical Implementation

### Database Schema

The module primarily uses these Supabase tables:

- `discord_servers` - Server information and settings
- `discord_webhooks` - Webhook configurations
- `communication_logs` - Message delivery logs
- `performance_records` - Performance data
- `attendances` - Attendance records
- `sessions` - Practice sessions
- `scrims` - Scrim tournaments
- `assigned_slots` - Tournament registrations

### API Integration

Key API endpoints used:

- `GET/POST /api/discord/webhooks` - Webhook management
- `POST /api/discord/sync-bot` - Bot synchronization
- `POST /api/discord/performance/analyze` - AI analysis
- Supabase RPC calls for complex queries

### State Management

- React Context for auth state (`useAuth` hook)
- Local component state for form data
- Supabase real-time subscriptions for live updates

### UI Components

Built with Shadcn/UI components:
- Cards for content organization
- Badges for status indicators
- Switches for feature toggles
- Dialogs for forms and confirmations
- Tables for data display

## 🚀 Usage Examples

### Adding a New Feature Module

1. Create the component file in `[guild_id]/`
2. Add navigation item to `layout.tsx`
3. Implement role-based access control
4. Add database queries for data fetching
5. Include save/export functionality

### Implementing Premium Features

1. Check user permissions in component
2. Query server premium status
3. Show upgrade prompts for restricted features
4. Use feature toggles for admin overrides

### Adding New Bot Settings

1. Update `discord_servers.settings` schema
2. Add UI controls in relevant component
3. Implement save functionality
4. Add validation and error handling

## 🔒 Security Considerations

- All database queries respect RLS policies
- Role-based access control enforced at component level
- Sensitive operations require admin privileges
- API keys and tokens properly secured
- Input validation on all forms

## 📈 Performance Optimizations

- Lazy loading for guild-specific pages
- Efficient database queries with proper indexing
- Caching for frequently accessed data
- Pagination for large datasets
- Optimistic updates for better UX

## 🧪 Testing

Key areas to test:

- Role-based access control
- Database operations (CRUD)
- API endpoint functionality
- Premium feature restrictions
- Error handling and edge cases

## 🔮 Future Enhancements

Planned features:

- Tournament bracket management
- Advanced tryout workflows
- Real-time notifications
- Mobile-responsive improvements
- Bulk server operations
- Advanced analytics dashboard

## 📚 Related Documentation

- [Database Schema](../../../DATABASE.md)
- [API Documentation](../../../API_DOCUMENTATION.md)
- [Dashboard Permissions](../../../lib/dashboard-permissions.ts)
- [Authentication Flow](../../../lib/auth-flow-v2.ts)

---

**Last Updated**: January 2025
**Version**: 1.0.0
**Status**: Production Ready ✅