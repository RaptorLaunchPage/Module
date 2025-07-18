-- DIAGNOSE RECURSIVE POLICIES
-- This script lists all policies on the users table so we can identify problematic ones

-- 1. First, let's see ALL current policies on the users table
SELECT 
    'CURRENT POLICIES ON USERS TABLE' as section,
    policyname,
    cmd as operation,
    permissive,
    roles,
    qual as condition
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'users'
ORDER BY policyname;

-- 2. Check for policies that reference the users table in their conditions
-- These are the ones that typically cause recursion
SELECT 
    'POTENTIALLY RECURSIVE POLICIES' as section,
    policyname,
    cmd as operation,
    qual as condition
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'users'
AND (
    qual LIKE '%users%' OR 
    qual LIKE '%public.users%' OR
    qual LIKE '%FROM users%'
)
ORDER BY policyname;

-- 3. Show RLS status
SELECT 
    'RLS STATUS' as section,
    relname as table_name,
    relrowsecurity as rls_enabled
FROM pg_class 
WHERE relname = 'users' 
AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 4. Check if there are any users in the table
SELECT 
    'USER COUNT' as section,
    COUNT(*) as total_users
FROM public.users;

-- 5. Show the exact policy definitions that are likely causing issues
SELECT 
    'DETAILED POLICY ANALYSIS' as section,
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
ORDER BY policyname;