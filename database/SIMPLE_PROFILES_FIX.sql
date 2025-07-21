-- Simple fix for the profiles table constraint issue
-- This should resolve the ON CONFLICT specification error

-- 1. Check if profiles table exists
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'profiles' AND table_schema = 'public';

-- 2. Check profiles table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Add the missing unique constraint on user_id
-- This is what's causing the ON CONFLICT specification error
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);

-- 4. Verify the constraint was added
SELECT constraint_name 
FROM information_schema.table_constraints 
WHERE table_name = 'profiles' 
AND constraint_type = 'UNIQUE' 
AND table_schema = 'public';

COMMIT;