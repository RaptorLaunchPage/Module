-- SIMPLE POLICY CHECK - Find the exact recursive policies
-- Run this to identify which policies are causing infinite recursion

-- 1. Show ALL current policies on users table
SELECT 
    policyname,
    cmd as operation,
    qual as condition
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'users'
ORDER BY policyname;

-- 2. Show ONLY the recursive policies (these are the problem)
SELECT 
    'RECURSIVE POLICY FOUND' as alert,
    policyname,
    cmd as operation,
    qual as condition
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'users'
AND (
    qual LIKE '%users%' OR 
    qual LIKE '%public.users%' OR
    qual LIKE '%FROM users%' OR
    qual LIKE '%EXISTS%users%'
)
ORDER BY policyname;