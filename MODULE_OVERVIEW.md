# Connected Module Branch Overview

## Project Structure: Raptor Esports CRM

This is a Next.js 14 TypeScript application with Supabase backend integration for esports team management.

## Current Git Branch Structure

**Active Branch:** `cursor/overview-of-connected-module-branch-92bc`

**Available Branches:**
- `main` - Main production branch
- `remotes/origin/Fixes` - Bug fixes branch
- `remotes/origin/RaptorLaunchPage-patch-1` - Launch page updates
- `remotes/origin/cursor/analyze-modular-web-app-and-fix-issues-e1fb` - Analysis branch

## Core Module Architecture

### 1. Application Layer (`/app`)
**Next.js App Router Structure:**

- **Root Layout** (`layout.tsx`) - Global application wrapper
  - Integrates AuthProvider from custom hooks
  - Global toast notifications
  - Theme configuration

- **Authentication Module** (`/app/auth/`)
  - `/login/` - User login interface
  - `/signup/` - User registration
  - `/confirm/` - Email confirmation flow

- **Dashboard Module** (`/app/dashboard/`)
  - Main dashboard page with comprehensive CRM features
  - **Sub-modules:**
    - `/performance/` - Player performance tracking
    - `/profile/` - User profile management
    - `/team-management/` - Team administration
    - `/user-management/` - User administration

- **Onboarding Module** (`/app/onboarding/`)
  - Single-page onboarding flow for new users

### 2. Business Logic Layer (`/lib`)
**Core Services and Utilities:**

- **Database Integration:**
  - `supabase.ts` - Main Supabase client with comprehensive type definitions
  - `supabase-admin.ts` - Administrative operations
  - Database schema includes: users, teams, performances, rosters, slots, prize_pools, winnings

- **Authentication & Security:**
  - `auth-profile-sync.ts` - Profile synchronization service
  - `session-manager.ts` - Session management utilities
  - `secure-profile-creation.ts` - Secure user creation process

- **Role Management:**
  - `role-system.ts` - Comprehensive role-based access control
  - Supports roles: admin, manager, coach, player, analyst, pending
  - Role levels for hierarchical permissions

- **User Management:**
  - `user-management.ts` - User CRUD operations
  - `profile-fixer.ts` - Profile data consistency utilities

- **Performance Analytics:**
  - `ocr-service.ts` - Basic OCR functionality
  - `advanced-ocr-service.ts` - Enhanced OCR with Tesseract.js integration

### 3. UI Component Layer (`/components`)
**Modular Component Architecture:**

- **Application Components:**
  - `app-sidebar.tsx` - Main navigation sidebar
  - `theme-provider.tsx` - Theme management

- **UI Component Library** (`/components/ui/`)
  - 50+ Radix UI-based components
  - Comprehensive design system including:
    - Form controls (input, select, checkbox, etc.)
    - Navigation (breadcrumb, pagination, navigation-menu)
    - Feedback (alert, toast, progress)
    - Layout (card, separator, sidebar)
    - Data display (table, chart, calendar)

- **Performance Components** (`/components/performance/`)
  - Specialized components for performance tracking

### 4. State Management Layer (`/hooks`)
**Custom React Hooks:**

- `use-auth.tsx` - Authentication state management (205 lines)
- `use-mobile.tsx` - Mobile responsiveness detection
- `use-toast.ts` - Toast notification system

### 5. Utility Layer (`/utils`)
**Helper Functions:**
- `supabaseClient.ts` - Simplified Supabase client setup

### 6. Database Layer (`/database`)
**Database Management:**
- `fix-role-constraints.sql` - SQL scripts for role constraint fixes

## Module Dependencies and Connections

### Key Technology Stack:
- **Frontend:** Next.js 14, React 18, TypeScript
- **UI Framework:** Tailwind CSS + Radix UI components
- **Backend:** Supabase (PostgreSQL)
- **State Management:** React hooks with Context API
- **Forms:** React Hook Form + Zod validation
- **Charts:** Recharts
- **OCR:** Tesseract.js
- **Styling:** Tailwind CSS with custom animations

### Database Schema Connections:
```
users ← (foreign key) → teams
users ← (foreign key) → rosters → teams
teams ← (foreign key) → performances
teams ← (foreign key) → slots
slots ← (foreign key) → prize_pools
slots ← (foreign key) → winnings
slots ← (foreign key) → slot_expenses
```

### Component Hierarchy:
```
RootLayout (AuthProvider)
├── Dashboard
│   ├── Performance Module
│   ├── Profile Module
│   ├── Team Management
│   └── User Management
├── Authentication Module
└── Onboarding Module
```

### Service Layer Integration:
```
UI Components → Custom Hooks → Business Logic (lib/) → Supabase Client → Database
```

## Security & Authentication Flow:
1. **AuthProvider** wraps the entire application
2. **Session Manager** handles authentication state
3. **Role System** manages permissions
4. **Secure Profile Creation** ensures data integrity
5. **Auth-Profile Sync** maintains consistency

## Performance & Analytics:
- OCR services for automated data extraction
- Performance tracking for esports metrics
- Recharts integration for data visualization
- Mobile-responsive design patterns

This modular architecture ensures scalability, maintainability, and clear separation of concerns across the entire esports CRM application.

## Recent Build Fixes Applied

### Vercel Deployment Issues Resolved

The `Fixes` branch was experiencing build failures due to missing methods in the `SupabaseAdminService`. The following fixes were applied:

1. **Added Missing `deleteUser` Method**: Enhanced the `SupabaseAdminService` class with a secure admin-only user deletion function
2. **Fixed TypeScript Type Mismatches**: Resolved toast message references to non-existent properties
3. **Enhanced Security**: Added admin verification and self-deletion protection

### Build Status: ✅ PASSING

Both the main branch and the `Fixes` branch now build successfully without TypeScript errors.