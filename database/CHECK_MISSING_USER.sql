-- Check if user exists in auth.users but missing from public.users
-- This will diagnose why the user update is failing

-- 1. Check if user exists in auth.users
SELECT 
    id,
    email,
    created_at,
    email_confirmed_at,
    role as auth_role
FROM auth.users 
WHERE id = 'b26b7eff-fa27-4a66-89c3-cd3858083c2a';

-- 2. Check if user exists in public.users  
SELECT 
    id,
    email,
    name,
    role,
    created_at
FROM public.users 
WHERE id = 'b26b7eff-fa27-4a66-89c3-cd3858083c2a';

-- 3. Show all users in public.users for comparison
SELECT 
    id,
    email,
    name,
    role
FROM public.users 
ORDER BY created_at;

-- 4. If user is missing from public.users, create them
-- UNCOMMENT THESE LINES TO FIX:
-- INSERT INTO public.users (
--     id,
--     email,
--     name,
--     role,
--     status,
--     created_at,
--     updated_at
-- ) VALUES (
--     'b26b7eff-fa27-4a66-89c3-cd3858083c2a',
--     'rathod.swaraj@gmail.com',
--     'Admin User',
--     'admin',
--     'Active',
--     NOW(),
--     NOW()
-- );
-- COMMIT;