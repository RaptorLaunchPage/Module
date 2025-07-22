# 🦖 Raptors Esports CRM

A comprehensive team management platform built specifically for esports organizations, featuring performance tracking, attendance management, team operations, and Discord integration.

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Next.js](https://img.shields.io/badge/Next.js-14.2-black)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)

---

## 🚀 **Features**

### 🎯 **Performance Management**
- **Match Performance Tracking**: Record kills, assists, damage, survival time, and placement
- **Team Analytics**: Aggregate performance metrics and trends
- **Role-Based Views**: Different dashboards for players, coaches, and management
- **Real-Time Statistics**: Live performance data and leaderboards

### 👥 **Team Management**
- **Multi-Team Support**: Manage multiple teams with tier classifications (God, T1-T4)
- **Role-Based Access**: Admin, Manager, Coach, Analyst, Player, Pending Player roles
- **Roster Management**: Player assignments, contact info, device tracking
- **Coach Assignment**: Link coaches to specific teams

### 📅 **Attendance System**
- **Session-Based Tracking**: Practice, tournament, and meeting attendance
- **Flexible Scheduling**: Morning, evening, night session configurations
- **Auto-Attendance**: Automatic marking for performance submissions
- **Holiday Management**: Team-specific and global holiday settings

### 💰 **Finance Module**
- **Expense Tracking**: Tournament slot costs and operational expenses
- **Winnings Management**: Prize money tracking with position-based calculations
- **P&L Reports**: Real-time profit/loss analysis
- **Team-Specific Filtering**: Financial data segregated by team

### 🎮 **Tryouts System**
- **Application Management**: Public and private tryout campaigns
- **Evaluation Workflow**: Structured assessment process
- **Invitation System**: Shortlist and invite promising candidates
- **Temporary Access**: Limited system access for tryout participants

### 💬 **Discord Integration**
- **Webhook Management**: Team-specific Discord notifications
- **Communication Logs**: Track message delivery and failures
- **Portal Interface**: Easy webhook configuration and testing
- **Error Handling**: Retry mechanisms for failed notifications

### 📊 **Analytics Dashboard**
- **Role-Specific Views**: Customized dashboards based on user role
- **Real-Time Data**: Live statistics and performance metrics
- **Mobile Responsive**: Optimized for all device sizes
- **Export Capabilities**: Download reports and data

---

## 🛠️ **Technology Stack**

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript 5.0
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **Styling**: Tailwind CSS + shadcn/ui components
- **Authentication**: JWT-based with Row Level Security
- **Database**: PostgreSQL with 25+ tables
- **Deployment**: Vercel-ready with environment configuration

---

## 📋 **Prerequisites**

- Node.js 18+ 
- npm or pnpm
- Supabase account and project
- Discord webhook URLs (optional)

---

## ⚙️ **Quick Start**

### 1. **Clone & Install**
```bash
git clone <repository-url>
cd raptors-esports-crm
npm install
```

### 2. **Environment Setup**
Create `.env.local` in the root directory:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. **Database Setup**
Run the provided schema in your Supabase SQL editor:
```sql
-- Use the complete schema provided in your Supabase dashboard
-- Tables: users, teams, performances, attendances, sessions, tryouts, etc.
```

### 4. **Development Server**
```bash
npm run dev
```

Visit `http://localhost:3000` to access the application.

### 5. **Production Build**
```bash
npm run build
npm start
```

---

## 🔐 **User Roles & Permissions**

### **Admin**
- Full system access
- User management and role assignment
- Global settings and configuration
- All team and financial data

### **Manager**
- Team oversight and analytics
- User role management within teams
- Financial reports and expense tracking
- Tryout management

### **Coach**
- Team-specific player management
- Performance data entry and analysis
- Attendance tracking for assigned team
- Session scheduling

### **Analyst**
- Read-only access to performance data
- Analytics and reporting capabilities
- Team statistics and trends
- Export functionality

### **Player**
- Personal performance data entry
- Team information and schedules
- Self-attendance marking
- Profile management

### **Pending Player**
- Limited access pending approval
- Profile completion requirements
- Onboarding workflow

---

## 📁 **Project Structure**

```
├── app/                    # Next.js App Router
│   ├── api/               # API routes (users, teams, performances, etc.)
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Main application dashboard
│   │   ├── attendance/    # Attendance management
│   │   ├── finance/       # Financial tracking
│   │   ├── performance/   # Performance analytics
│   │   ├── team-management/ # Team operations
│   │   ├── tryouts/       # Tryout system
│   │   └── discord-portal/ # Discord integration
│   └── onboarding/        # User onboarding
├── components/            # Reusable UI components
│   ├── attendance/        # Attendance-specific components
│   ├── dashboard/         # Dashboard layouts
│   ├── discord-portal/    # Discord integration components
│   ├── performance/       # Performance tracking components
│   └── ui/               # shadcn/ui components
├── database/             # Database schemas and migrations
├── hooks/                # Custom React hooks (useAuth, etc.)
├── lib/                  # Utility functions and configurations
└── scripts/              # Database seeding and setup scripts
```

---

## 🔧 **API Endpoints**

### **Authentication**
- User session management
- Role-based access control
- Profile creation and updates

### **Core Modules**
- `GET/POST /api/users` - User management
- `GET/POST /api/teams` - Team operations
- `GET/POST /api/performances` - Performance data
- `GET/POST /api/sessions` - Session management
- `GET/POST /api/tryouts` - Tryout system

### **Discord Integration**
- `GET/POST /api/discord-portal/webhooks` - Webhook management
- `POST /api/discord-portal/send` - Send notifications
- `GET /api/discord-portal/logs` - Communication logs

---

## 🚀 **Deployment**

### **Vercel Deployment**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### **Environment Variables**
Set in your deployment platform:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### **Database Configuration**
- Enable Row Level Security in production
- Configure proper RLS policies
- Set up database backups

---

## 🔒 **Security Features**

- **Row Level Security**: Database-level access control
- **JWT Authentication**: Secure token-based auth
- **Role-Based Permissions**: Granular access control
- **Input Validation**: Comprehensive form validation
- **SQL Injection Prevention**: Parameterized queries via Supabase

---

## 📱 **Mobile Support**

- Fully responsive design using Tailwind CSS
- Touch-optimized interface
- Mobile-first component architecture
- Progressive Web App capabilities

---

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📊 **System Status**

- **Build Status**: ✅ Passing (42 pages generated)
- **Type Safety**: ✅ Full TypeScript coverage
- **Database**: ✅ 25+ tables fully integrated
- **Components**: ✅ All UI components functional
- **Mobile**: ✅ Responsive design complete
- **Production Ready**: ✅ Deployment ready

---

## 📄 **License**

This project is proprietary and confidential. All rights reserved.

---

## 🆘 **Support**

For technical support:
1. Check the build logs for any errors
2. Verify environment variables are set
3. Review Supabase connection status
4. Contact the development team

---

**Built with ❤️ for the Raptors Esports community**
