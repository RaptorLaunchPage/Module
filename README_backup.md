# Gaming Team Management Platform

A comprehensive team management solution built for gaming organizations, featuring performance tracking, user management, attendance monitoring, and Discord integration.

## 🚀 Features

### 🏆 Performance Management
- **Match Performance Tracking**: Record and analyze individual and team performance metrics
- **Time-Based Filtering**: View performance data by day, week, month, or custom date ranges
- **Role-Based Analytics**: Different views for coaches, managers, and players

### 👥 User Management
- **Role-Based Access Control**: Admin, Manager, Coach, Analyst, Player, and Pending Player roles
- **Team Assignment**: Automatic team-based data filtering and permissions
- **Profile Management**: Comprehensive user profiles with gaming information

### 📊 Analytics Dashboard
- **Performance Metrics**: Kill/Death ratios, damage statistics, survival times
- **Team Statistics**: Aggregate team performance and trends
- **Individual Progress**: Player development tracking

### 🎮 Discord Integration
- **Webhook Management**: Configure Discord notifications for team events
- **Communication Logs**: Track team communications and announcements
- **Portal Integration**: Seamless Discord bot integration

### 📅 Attendance Management
- **Practice Tracking**: Monitor team practice attendance
- **Schedule Management**: Organize training sessions and matches
- **Participation Analytics**: Track player engagement

### 💰 Finance Module
- **Tournament Earnings**: Track prize money and sponsorship revenue
- **Expense Management**: Monitor team operational costs
- **Financial Analytics**: Revenue and expense reporting

## 🛠 Technology Stack

- **Frontend**: Next.js 14 with App Router, React, TypeScript
- **Backend**: Supabase (PostgreSQL + Auth + Real-time)
- **Styling**: Tailwind CSS with shadcn/ui components
- **Authentication**: Supabase Auth with Row Level Security
- **Database**: PostgreSQL with advanced RLS policies

## 📋 Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm
- Supabase account and project

## ⚙️ Environment Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd gaming-team-management
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Configure environment variables**
   
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Database Setup**
   
   Run the database schema file in your Supabase SQL editor:
   ```sql
   -- Run database/discord-portal-schema.sql in Supabase SQL Editor
   ```

5. **Start the development server**
   ```bash
   pnpm dev
   ```

   The application will be available at `http://localhost:3000`

## 🔐 Authentication & Roles

### Role Hierarchy
- **Admin**: Full system access, user management, global settings
- **Manager**: Team oversight, analytics, user role management
- **Coach**: Team-specific data, player management within assigned team
- **Analyst**: Read-only access to performance data and analytics
- **Player**: Personal performance data, team information
- **Pending Player**: Limited access pending approval

### Access Control
- **Row Level Security (RLS)**: Database-level security ensuring users only access authorized data
- **API Authentication**: JWT-based authentication for all API endpoints
- **Role-Based Filtering**: Automatic data filtering based on user role and team assignment

## 📚 API Documentation

### User Management
- `GET /api/users` - Fetch users with role-based filtering
- `PUT /api/users` - Update user roles and team assignments (Admin only)

### Performance Data
- `GET /api/performances` - Retrieve performance metrics with filtering
- `POST /api/performances` - Record new performance data

### Team Management
- `GET /api/teams` - Fetch team information
- `POST /api/teams` - Create new teams (Admin/Manager only)

### Discord Integration
- `GET /api/discord-portal/webhooks` - Manage Discord webhooks
- `POST /api/discord-portal/send` - Send Discord notifications
- `GET /api/discord-portal/logs` - View communication logs

## 🚀 Deployment

### Development
```bash
pnpm dev
```

### Production Build
```bash
pnpm build
pnpm start
```

### Environment Configuration
- Ensure all environment variables are set in production
- Configure Supabase RLS policies for production security
- Set up proper Discord webhook URLs for notifications

## 🔧 Development Notes

### Database Functions
The application uses custom PostgreSQL functions for complex operations:
- `bulletproof_user_update`: Handles user role updates with conflict resolution
- `sync_user_profile_data`: Automatically syncs user data across tables

### RLS Policies
- Currently disabled for development (`ALTER TABLE users DISABLE ROW LEVEL SECURITY`)
- Should be re-enabled for production with proper policies

### Debug Features
- Debug page available at `/dashboard/debug` for troubleshooting
- API connectivity testing and error diagnosis
- User role update testing

## 📁 Project Structure

```
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Main application pages
│   └── onboarding/        # User onboarding flow
├── components/            # Reusable UI components
├── hooks/                 # Custom React hooks
├── lib/                   # Utility functions and configurations
├── database/              # Database schema and migrations
├── scripts/               # Database seeding scripts
└── public/                # Static assets
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is proprietary and confidential. All rights reserved.

## 🆘 Support

For support and questions:
- Check the debug page at `/dashboard/debug` for troubleshooting
- Review the database logs in Supabase dashboard
- Contact the development team for assistance

## 🔄 Recent Updates

- ✅ Fixed user role update system with constraint resolution
- ✅ Implemented time-based filtering across all modules
- ✅ Enhanced Discord portal integration
- ✅ Improved role-based access control
- ✅ Cleaned up debugging code and temporary files