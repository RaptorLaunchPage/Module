-- Emergency Role Constraint Fix
-- This script fixes the role constraint mismatch causing profile creation failures

-- 1. Drop existing role constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- 2. Add updated role constraint that includes pending_player and awaiting_approval
ALTER TABLE users ADD CONSTRAINT users_role_check 
CHECK (role IN ('admin', 'manager', 'coach', 'player', 'analyst', 'pending_player', 'awaiting_approval'));

-- 3. Update default role to pending_player
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'pending_player';

-- 4. Convert any existing 'pending' roles to 'pending_player' for consistency
UPDATE users SET role = 'pending_player' WHERE role = 'pending';

-- 5. Update role_level for any pending_player users
UPDATE users SET role_level = 10 WHERE role = 'pending_player';
UPDATE users SET role_level = 10 WHERE role = 'awaiting_approval';

-- 6. Update the trigger function to handle new roles
CREATE OR REPLACE FUNCTION set_role_level()
RETURNS TRIGGER AS $$
BEGIN
  NEW.role_level := CASE 
    WHEN NEW.role = 'admin' THEN 100
    WHEN NEW.role = 'manager' THEN 80
    WHEN NEW.role = 'coach' THEN 70
    WHEN NEW.role = 'analyst' THEN 60
    WHEN NEW.role = 'player' THEN 50
    WHEN NEW.role = 'pending_player' THEN 10
    WHEN NEW.role = 'awaiting_approval' THEN 10
    ELSE 10
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Ensure the trigger is attached
DROP TRIGGER IF EXISTS trigger_set_role_level ON users;
CREATE TRIGGER trigger_set_role_level
  BEFORE INSERT OR UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION set_role_level();

-- Verification queries (comment out in production)
-- SELECT constraint_name, check_clause FROM information_schema.check_constraints WHERE table_name = 'users';
-- SELECT DISTINCT role FROM users;
-- SELECT column_default FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role';