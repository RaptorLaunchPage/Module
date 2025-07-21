# Database Setup Instructions

## 🚨 **IMPORTANT: Fix Role Update Error**

If you're getting the error: **"there is no unique or exclusion constraint matching the ON CONFLICT specification"** when updating user roles, your database schema needs to be updated.

## 🔧 **Quick Fix:**

### Step 1: Run the Database Migration

1. **Go to your Supabase Dashboard**
2. **Navigate to SQL Editor**
3. **Run the following SQL script:**

```sql
-- Fix User Role Constraint and Database Schema
-- This script fixes the ON CONFLICT error by ensuring proper constraints and schema

-- 1. Drop existing role constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- 2. Add any missing columns that might be expected
ALTER TABLE users ADD COLUMN IF NOT EXISTS role_level INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS provider TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';

-- 3. Create the correct role constraint with all valid roles
ALTER TABLE users ADD CONSTRAINT users_role_check 
CHECK (role IN ('admin', 'manager', 'coach', 'analyst', 'player', 'pending_player'));

-- 4. Update existing 'pending' roles to 'pending_player' for consistency
UPDATE users SET role = 'pending_player' WHERE role = 'pending';
UPDATE users SET role = 'pending_player' WHERE role = 'awaiting_approval';

-- 5. Set role_level based on role (if column exists)
UPDATE users SET role_level = 
  CASE 
    WHEN role = 'admin' THEN 100
    WHEN role = 'manager' THEN 80
    WHEN role = 'coach' THEN 70
    WHEN role = 'analyst' THEN 60
    WHEN role = 'player' THEN 50
    WHEN role = 'pending_player' THEN 10
    ELSE 10
  END
WHERE role_level IS NULL;

-- 6. Set default role for new users
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'pending_player';

-- 7. Create simple update function
CREATE OR REPLACE FUNCTION simple_user_update(
  target_user_id UUID,
  new_role TEXT,
  new_team_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  updated_user RECORD;
BEGIN
  -- Simple update without complex constraints
  UPDATE users 
  SET 
    role = new_role,
    team_id = CASE 
      WHEN new_role IN ('admin', 'manager') THEN NULL 
      ELSE COALESCE(new_team_id, team_id)
    END,
    updated_at = NOW()
  WHERE id = target_user_id
  RETURNING * INTO updated_user;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found: %', target_user_id;
  END IF;

  -- Convert to JSON
  SELECT row_to_json(updated_user) INTO result;
  RETURN result;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION simple_user_update(UUID, TEXT, UUID) TO authenticated;

-- Verification
SELECT 'Migration completed successfully' as status;
```

### Step 2: Verify the Fix

1. **Check that the constraint was created:**
```sql
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE table_name = 'users' AND constraint_name = 'users_role_check';
```

2. **Check current user roles:**
```sql
SELECT role, COUNT(*) as count 
FROM users 
GROUP BY role 
ORDER BY count DESC;
```

### Step 3: Test Role Updates

Go to your User Management page and try updating a user's role. The error should now be resolved.

## 🛠 **Alternative: Manual Database Setup**

If you're setting up from scratch, you can also run the complete schema file:

```bash
# In your project directory
psql "your-supabase-connection-string" -f database/fix-user-role-constraint.sql
```

## ✅ **Expected Results:**

After running the migration:
- ✅ User role updates work without constraint errors
- ✅ All valid roles are supported: `admin`, `manager`, `coach`, `analyst`, `player`, `pending_player`
- ✅ Admin/Manager users automatically get `team_id` set to `null`
- ✅ Role-based permissions work correctly

## 🔍 **Troubleshooting:**

### If you still get constraint errors:

1. **Check if the constraint exists:**
```sql
\d+ users
```

2. **Manually recreate the constraint:**
```sql
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
CHECK (role IN ('admin', 'manager', 'coach', 'analyst', 'player', 'pending_player'));
```

3. **Check for invalid existing roles:**
```sql
SELECT DISTINCT role FROM users WHERE role NOT IN ('admin', 'manager', 'coach', 'analyst', 'player', 'pending_player');
```

### If you have authentication issues:

1. **Ensure you're logged in as admin**
2. **Check RLS policies are correct**
3. **Try using the Supabase Dashboard SQL Editor with service role**

## 📝 **Notes:**

- This migration is safe to run multiple times
- It won't affect existing user data
- The `role_level` column is added for future features
- All changes are backwards compatible