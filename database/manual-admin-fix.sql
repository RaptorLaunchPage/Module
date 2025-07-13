-- IMMEDIATE MANUAL FIX for Admin Access
-- Run this in Supabase SQL Editor to fix the recursion issue immediately

-- Step 1: Add role_level column if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'role_level') THEN
        ALTER TABLE users ADD COLUMN role_level INTEGER DEFAULT 10;
    END IF;
END $$;

-- Step 2: Disable RLS temporarily to break recursion
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Step 3: Create/update your admin user manually
INSERT INTO users (id, email, name, role, role_level, created_at) 
VALUES ('b26b7eff-fa27-4a66-89c3-cd3858083c2a', 'rathod.swaraj@gmail.com', 'Swaraj Rathod', 'admin', 100, NOW())
ON CONFLICT (id) DO UPDATE SET 
  role = 'admin', 
  role_level = 100,
  name = COALESCE(EXCLUDED.name, users.name),
  email = COALESCE(EXCLUDED.email, users.email);

-- Step 4: Update all existing users with role levels
UPDATE users SET role_level = 
  CASE 
    WHEN role = 'admin' THEN 100
    WHEN role = 'manager' THEN 80
    WHEN role = 'coach' THEN 70
    WHEN role = 'analyst' THEN 60
    WHEN role = 'player' THEN 50
    ELSE 10
  END
WHERE role_level IS NULL;

-- Step 5: Drop all existing policies
DROP POLICY IF EXISTS "Users can read their own profile" ON users;
DROP POLICY IF EXISTS "Admins can read all users" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Admins can insert users" ON users;
DROP POLICY IF EXISTS "Allow profile creation during signup" ON users;
DROP POLICY IF EXISTS "Public can insert users during signup" ON users;
DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "users_insert_own" ON users;
DROP POLICY IF EXISTS "admin_full_access" ON users;

-- Step 6: Re-enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Step 7: Create simple, non-recursive policies
CREATE POLICY "allow_own_select" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "allow_own_update" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "allow_own_insert" ON users FOR INSERT WITH CHECK (auth.uid() = id);

-- Step 8: Create admin policy that works
CREATE POLICY "admin_access" ON users FOR ALL USING (
  auth.uid() = 'b26b7eff-fa27-4a66-89c3-cd3858083c2a'::uuid
);

-- Verify the fix
SELECT id, email, name, role, role_level FROM users ORDER BY created_at;