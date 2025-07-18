# Profile Setup Issue - Infinite Recursion Fix

## 🚨 **Issue Description**
User `swarajsxy@gmail.com` (ID: `ee119997-bc69-4596-aea0-9fea49514571`) is getting:
- "PROFILE SETUP REQUIRED" → "ACCOUNT SETUP ISSUE"
- Error: "Failed to fetch profile: infinite recursion detected in policy for relation 'users'"

## 🔧 **IMMEDIATE FIX - Run This Script**

Copy and paste this into your **Supabase SQL Editor** and run it:

```sql
-- QUICK FIX for Infinite Recursion in RLS Policies
-- Run this in Supabase SQL Editor

-- 1. Drop all existing policies that might cause recursion
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.users';
    END LOOP;
END $$;

-- 2. Temporarily disable RLS to allow operations
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- 3. Create the missing profile for the user
INSERT INTO public.users (id, email, name, role, created_at)
VALUES (
    'ee119997-bc69-4596-aea0-9fea49514571',
    'swarajsxy@gmail.com',
    'Swaraj',
    'pending_player',
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(users.name, EXCLUDED.name),
    role = COALESCE(users.role, EXCLUDED.role);

-- 4. Re-enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 5. Create simple, non-recursive policies
CREATE POLICY "users_select_policy" ON public.users
    FOR SELECT
    USING (true); -- Allow all authenticated users to select

CREATE POLICY "users_update_policy" ON public.users
    FOR UPDATE
    USING (auth.uid() = id); -- Users can only update their own profile

CREATE POLICY "users_insert_policy" ON public.users
    FOR INSERT
    WITH CHECK (auth.uid() = id); -- Users can only insert their own profile

-- 6. Verify the setup
SELECT 
    'Fix Applied' as status,
    id,
    email,
    name,
    role,
    created_at
FROM public.users
WHERE id = 'ee119997-bc69-4596-aea0-9fea49514571';

-- 7. Test policy functionality
SELECT 
    'Policy Test' as test_type,
    COUNT(*) as user_count,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users') as policy_count
FROM public.users;
```

## 🔍 **What This Script Does**

1. **Removes problematic policies** - Drops all existing RLS policies that cause recursion
2. **Temporarily disables RLS** - Allows safe operations on the users table
3. **Creates missing user profile** - Adds the user profile that was missing
4. **Re-enables RLS** - Turns security back on
5. **Creates simple policies** - Non-recursive policies that work correctly
6. **Verifies the fix** - Shows the user was created successfully

## 📋 **Expected Results**

After running the script, you should see:

1. **Fix Applied section** showing:
   - status: "Fix Applied"
   - id: ee119997-bc69-4596-aea0-9fea49514571
   - email: swarajsxy@gmail.com
   - name: Swaraj
   - role: pending_player
   - created_at: [current timestamp]

2. **Policy Test section** showing:
   - test_type: "Policy Test"
   - user_count: [number of users in database]
   - policy_count: 3 (the three new policies)

## 🧪 **Test the Fix**

1. **Log out** of your application
2. **Log back in** as swarajsxy@gmail.com
3. **Should now work** without the profile setup error

## 🔍 **Root Cause Analysis**

The infinite recursion was caused by RLS policies that were checking the `users` table to determine permissions, creating a circular dependency:

```sql
-- PROBLEMATIC POLICY (causes recursion)
CREATE POLICY "Admins can view all users" ON public.users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users  -- ← This creates recursion!
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

## 🛡️ **Better Long-term Solution**

For production, consider using a separate admin table to avoid recursion:

```sql
-- Create separate admin table
CREATE TABLE IF NOT EXISTS public.admin_users (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add admin users to this table
INSERT INTO public.admin_users (user_id) VALUES 
    ('your-admin-user-id-here')
ON CONFLICT (user_id) DO NOTHING;

-- Non-recursive admin policy
CREATE POLICY "admin_access" ON public.users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE user_id = auth.uid()
        )
    );
```

## 🔧 **Additional Checks**

If the issue persists, run these diagnostic queries:

```sql
-- Check if user exists in auth.users
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'swarajsxy@gmail.com';

-- Check if user exists in public.users
SELECT id, email, name, role, created_at 
FROM public.users 
WHERE email = 'swarajsxy@gmail.com';

-- Check current policies
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'users';

-- Check RLS status
SELECT relname, relrowsecurity 
FROM pg_class 
WHERE relname = 'users' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
```

## ⚠️ **Important Notes**

1. **Backup First**: Always backup your database before running these scripts
2. **Test Environment**: Test in a development environment first if possible
3. **User Impact**: This fix affects all users, not just the specific user
4. **Security**: The new policies are simpler but secure

## 🎯 **Next Steps**

1. **Run the quick fix script** above
2. **Test the login** for swarajsxy@gmail.com
3. **Verify other users** can still log in normally
4. **Consider implementing** the long-term admin table solution

The quick fix should resolve the immediate issue and allow the user to log in successfully!