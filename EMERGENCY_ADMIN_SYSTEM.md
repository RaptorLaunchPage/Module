# Emergency Admin Bypass System

## Overview

The Emergency Admin Bypass System is a temporary solution to resolve RLS (Row Level Security) policy issues that prevent admin users from accessing and managing other users in the system. This system bypasses RLS policies entirely using `SECURITY DEFINER` functions.

## Problem Statement

Your current system has the following issues:
- Admin users can only see 1 user out of 7 expected users
- Update/Insert/Delete permissions are false even for admin users
- RLS policies create circular dependencies where admin checks require querying users table, which is blocked by RLS

## Solution Components

### 1. Database Functions (`database/emergency-admin-bypass.sql`)

**Emergency Functions:**
- `emergency_create_super_admin(user_id, user_email, user_name)` - Creates admin user bypassing RLS
- `emergency_update_user_role(target_user_id, new_role, admin_user_id)` - Updates user roles bypassing RLS
- `emergency_get_all_users()` - Retrieves all users bypassing RLS
- `emergency_fix_admin_policies()` - Fixes RLS policies for better admin access
- `cleanup_emergency_functions()` - Removes all emergency functions when done

**Key Features:**
- All functions use `SECURITY DEFINER` to run with elevated privileges
- Completely bypass RLS policies
- Include comprehensive error handling
- Return JSON results for easy parsing

### 2. TypeScript Service (`lib/emergency-admin-service.ts`)

**EmergencyAdminService Class:**
- `createSuperAdmin()` - Creates super admin user
- `updateUserRole()` - Updates any user's role
- `getAllUsers()` - Gets all users (bypasses RLS)
- `fixAdminPolicies()` - Fixes RLS policies
- `cleanupEmergencyFunctions()` - Cleanup when done
- `setupAdminAccess()` - Complete setup process

### 3. User Interface (`app/dashboard/user-management/page.tsx`)

**Emergency Admin Panel:**
- Accessible via "🚨 Emergency Admin Bypass" button in debug tools
- Four main operations:
  - Setup Emergency Admin
  - Get All Users (Bypass)
  - Fix Admin Policies
  - Cleanup Emergency Functions
- Detailed result display with step-by-step feedback

## Usage Instructions

### Step 1: Deploy Database Functions

1. Go to your Supabase SQL Editor
2. Run the `database/emergency-admin-bypass.sql` script
3. Verify functions are created successfully

### Step 2: Use Emergency Admin System

1. Navigate to `/dashboard/user-management`
2. Click "🚨 Emergency Admin Bypass" in the debug tools section
3. Click "Setup Emergency Admin" to:
   - Create super admin for your user
   - Fix RLS policies
   - Verify admin access

### Step 3: Test Admin Access

1. Use "Get All Users (Bypass)" to see all users
2. Try normal admin operations (should now work)
3. Verify you can see all 7 users instead of just 1

### Step 4: Cleanup (Important!)

1. Once normal admin access is restored
2. Click "Cleanup Emergency Functions" to remove bypass functions
3. This removes security risks from the emergency system

## Security Considerations

⚠️ **CRITICAL SECURITY WARNING** ⚠️

- Emergency functions bypass ALL security policies
- Any authenticated user can run these functions
- Must be removed after admin access is restored
- Only use when normal admin access is broken

## Technical Details

### RLS Policy Fixes

The system creates improved RLS policies that avoid circular dependencies:

```sql
-- Better admin policy structure
CREATE POLICY "Admins can read all users" ON users
FOR SELECT USING (
  (auth.uid() = id) OR  -- Users can read their own profile
  (
    auth.uid() IN (
      SELECT id FROM users WHERE role = 'admin'
    )
  )
);
```

### Function Security

Functions use `SECURITY DEFINER` with `SET search_path = public` for security:

```sql
CREATE OR REPLACE FUNCTION emergency_create_super_admin(...)
RETURNS JSON
SECURITY DEFINER
SET search_path = public
AS $$
```

## Troubleshooting

### Common Issues

1. **Functions not found**: Ensure SQL script ran successfully
2. **Permission denied**: Check service role key is configured
3. **Still can't see users**: Try "Fix Admin Policies" button
4. **Cleanup fails**: Manually drop functions in SQL editor

### Manual Cleanup

If automatic cleanup fails, run in SQL editor:

```sql
DROP FUNCTION IF EXISTS emergency_create_super_admin(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS emergency_update_user_role(UUID, TEXT, UUID);
DROP FUNCTION IF EXISTS emergency_get_all_users();
DROP FUNCTION IF EXISTS emergency_fix_admin_policies();
DROP FUNCTION IF EXISTS cleanup_emergency_functions();
```

## Expected Results

After running the emergency admin setup:

1. **User Count**: Should see all 7 users instead of 1
2. **Permissions**: Admin should have full CRUD access
3. **RLS Policies**: Should work correctly for admin users
4. **Normal Operations**: Standard admin functions should work

## Next Steps

1. Run the emergency admin setup
2. Test that you can see all users
3. Verify normal admin operations work
4. Clean up emergency functions
5. Monitor system for any remaining issues

## Files Modified

- `database/emergency-admin-bypass.sql` - Database functions
- `lib/emergency-admin-service.ts` - TypeScript service
- `app/dashboard/user-management/page.tsx` - UI integration

## Support

If you encounter issues:
1. Check browser console for error messages
2. Verify database functions exist in Supabase
3. Ensure service role key is properly configured
4. Try each emergency function individually

Remember: This is a temporary bypass system. Remove it once normal admin access is restored.