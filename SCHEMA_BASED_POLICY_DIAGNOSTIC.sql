-- SCHEMA-BASED POLICY DIAGNOSTIC
-- Based on the actual schema provided

-- 1. Check ALL policies on users table
SELECT 
    '=== CURRENT POLICIES ON USERS TABLE ===' as section,
    policyname,
    cmd as operation,
    permissive,
    roles,
    qual as condition
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'users'
ORDER BY policyname;

-- 2. Check for RECURSIVE policies (these cause the infinite recursion)
-- These are policies that reference the users table in their conditions
SELECT 
    '=== RECURSIVE POLICIES (CAUSING ISSUES) ===' as section,
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

-- 3. Check RLS status on users table
SELECT 
    '=== RLS STATUS ===' as section,
    relname as table_name,
    relrowsecurity as rls_enabled
FROM pg_class 
WHERE relname = 'users' 
AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 4. Check if users exist in the table
SELECT 
    '=== USER COUNT ===' as section,
    COUNT(*) as total_users
FROM public.users;

-- 5. Check if there are users in auth.users but not in public.users
SELECT 
    '=== MISSING PROFILES ===' as section,
    COUNT(*) as auth_users_count,
    (SELECT COUNT(*) FROM public.users) as public_users_count,
    COUNT(*) - (SELECT COUNT(*) FROM public.users) as missing_profiles
FROM auth.users;

-- 6. Check policies on profiles table too (in case there are conflicts)
SELECT 
    '=== POLICIES ON PROFILES TABLE ===' as section,
    policyname,
    cmd as operation,
    qual as condition
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'profiles'
ORDER BY policyname;

-- 7. Show the EXACT policy definitions causing recursion
SELECT 
    '=== DETAILED RECURSIVE POLICY ANALYSIS ===' as section,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
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

-- 8. Check for any admin-related policies that might be problematic
SELECT 
    '=== ADMIN-RELATED POLICIES ===' as section,
    policyname,
    cmd as operation,
    qual as condition
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'users'
AND (
    qual LIKE '%admin%' OR 
    qual LIKE '%role%' OR
    policyname LIKE '%admin%'
)
ORDER BY policyname;