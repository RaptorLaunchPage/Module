# Raptor Esports Hub

A comprehensive esports team management platform built with Next.js, TypeScript, and Supabase. Designed for professional esports organizations to manage teams, track performance, handle finances, and integrate with Discord.

## 🚀 Features

### Core Features
- **Authentication & User Management**: Secure sign-up/sign-in with email and Discord OAuth
- **Role-Based Access Control**: Admin, Manager, Coach, Analyst, Player, and Pending Player roles
- **Team Management**: Complete roster management, team assignments, and member tracking
- **Performance Tracking**: Match results, statistics, and analytics dashboard
- **Financial Management**: Expense tracking, tournament winnings, and ROI calculations
- **Attendance System**: Practice session tracking and attendance monitoring
- **Discord Integration**: Webhook management and automated notifications

### Advanced Features
- **Agreement Management**: Role-based user agreements with version control
- **Profile System**: Comprehensive user profiles with onboarding flow
- **Analytics Dashboard**: Role-specific dashboards with detailed insights
- **Session Management**: Secure token handling with auto-refresh
- **Responsive Design**: Modern glassmorphic UI with dark theme
- **Real-time Updates**: Live data synchronization across components

## 🏗️ Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **Authentication**: Supabase Auth with Discord OAuth
- **State Management**: React Context with custom hooks
- **UI Components**: Custom components with glassmorphic design
- **Icons**: Lucide React
- **Deployment**: Vercel-ready configuration

## 📋 Prerequisites

- Node.js 18+ and npm/pnpm
- Supabase account and project
- Discord application (for OAuth)

## ⚙️ Environment Setup

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# App Configuration
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Discord OAuth (Optional)
NEXT_PUBLIC_DISCORD_CLIENT_ID=your_discord_client_id
```

## 🚀 Quick Start

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd raptor-esports-hub
   npm install
   ```

2. **Database Setup**
   ```bash
   # Run the database setup script
   npx supabase db reset --local
   
   # Or run the SQL files manually in Supabase
   # - SUPABASE_TRYOUTS_SETUP_FIXED.sql
   # - AGREEMENT_ENFORCEMENT_SETUP.sql (if using agreements)
   # - EMERGENCY_AGREEMENT_FIX.sql (if needed)
   ```

3. **Development Server**
   ```bash
   npm run dev
   ```

4. **Access the Application**
   - Navigate to `http://localhost:3000`
   - Create an account or sign in
   - Complete onboarding if you're a new user

## 🗄️ Database Structure

### Core Tables
- `users` - User profiles and roles
- `teams` - Team information and management
- `user_agreements` - Agreement tracking and versions
- `sessions` - Practice sessions and events
- `attendances` - Attendance tracking
- `expenses` - Financial expense records
- `winnings` - Tournament prize tracking
- `discord_logs` - Discord integration logs

### Key Features
- Row Level Security (RLS) enabled
- Role-based access control
- Foreign key constraints
- Automated timestamps
- Data validation

## 🔐 Authentication Flow

1. **User Registration**: Email or Discord OAuth
2. **Profile Creation**: Automatic profile creation with `pending_player` role
3. **Onboarding**: New users complete profile setup
4. **Role Assignment**: Admins can assign appropriate roles
5. **Agreement Acceptance**: Role-specific agreements (if enabled)
6. **Dashboard Access**: Role-based dashboard with appropriate permissions

## 👥 Role System

- **Admin**: Full system access and user management
- **Manager**: Team and financial management
- **Coach**: Team performance and roster management
- **Analyst**: Performance analytics and reporting
- **Player**: Personal performance tracking and team view
- **Pending Player**: Limited access until onboarding completion

## 📱 Key Pages

- `/` - Landing page with authentication
- `/auth/login` - Sign in page
- `/auth/signup` - Registration page
- `/onboarding` - New user profile setup
- `/dashboard` - Role-based main dashboard
- `/dashboard/performance` - Performance tracking
- `/dashboard/team-management` - Team management tools
- `/dashboard/finance` - Financial management
- `/dashboard/analytics` - Analytics and reporting
- `/dashboard/user-management` - User administration
- `/agreement-review` - Agreement acceptance

## 🔧 Configuration

### Discord Integration
1. Create a Discord application at https://discord.com/developers/applications
2. Add redirect URI: `{SITE_URL}/auth/confirm`
3. Configure OAuth2 scopes: `identify`, `email`

### Supabase Setup
1. Create a new Supabase project
2. Run the provided SQL scripts
3. Configure authentication providers
4. Set up Row Level Security policies

## 🚀 Deployment

The application is configured for Vercel deployment:

1. **Vercel Setup**
   ```bash
   npm i -g vercel
   vercel --prod
   ```

2. **Environment Variables**
   - Configure all environment variables in Vercel dashboard
   - Update `NEXT_PUBLIC_SITE_URL` to your domain

3. **Database Migration**
   - Ensure all SQL scripts are run in production Supabase

## 🛠️ Development

### Key Scripts
```bash
npm run dev          # Development server
npm run build        # Production build
npm run start        # Production server
npm run lint         # ESLint checking
npm run type-check   # TypeScript checking
```

### Project Structure
```
├── app/                 # Next.js app directory
├── components/          # Reusable UI components
├── hooks/              # Custom React hooks
├── lib/                # Utility functions and configurations
├── modules/            # Feature-specific modules
├── public/             # Static assets
└── database/           # Database scripts and schemas
```

## 🔒 Security Features

- JWT token management with auto-refresh
- Row Level Security in database
- Role-based access control
- Session timeout handling
- CSRF protection
- Input validation and sanitization

## 📊 Performance Features

- Optimized data loading with caching
- Lazy loading of components
- Image optimization
- Bundle splitting
- Server-side rendering where appropriate

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is proprietary software for Raptor Esports organization.

## 🐛 Troubleshooting

### Common Issues
- **Authentication loops**: Clear browser storage and check environment variables
- **Database errors**: Verify Supabase configuration and SQL script execution
- **Permission denied**: Check user roles and RLS policies
- **Redirect issues**: Verify SITE_URL configuration

### Support
For issues and support, please create an issue in the repository or contact the development team.

---

Built with ❤️ for the Raptor Esports community
