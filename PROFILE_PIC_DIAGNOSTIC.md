# Profile Picture Upload Diagnostic Guide

## 🔍 **Diagnostic Steps**

### **Step 1: Check Database Schema**

Run this in **Supabase SQL Editor** to verify the users table has the avatar_url column:

```sql
-- Check if avatar_url column exists in users table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
AND column_name = 'avatar_url';
```

**Expected Result:** Should return one row showing `avatar_url` column of type `text` that is nullable.

### **Step 2: Check Storage Bucket**

Run this in **Supabase SQL Editor** to verify the avatars bucket exists:

```sql
-- Check if avatars bucket exists
SELECT id, name, public, created_at
FROM storage.buckets 
WHERE id = 'avatars';
```

**Expected Result:** Should return one row with `id='avatars'`, `name='avatars'`, `public=true`.

### **Step 3: Check Storage Policies**

Run this in **Supabase SQL Editor** to check storage policies:

```sql
-- Check storage policies for avatars bucket
SELECT policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
AND policyname LIKE '%avatar%';
```

**Expected Result:** Should return multiple policies for avatar operations.

### **Step 4: Check RLS Policies on Users Table**

Run this in **Supabase SQL Editor**:

```sql
-- Check RLS policies on users table
SELECT policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'users';
```

**Expected Result:** Should show policies allowing users to update their own profiles.

## 🔧 **Fix Scripts**

### **Script 1: Create Missing avatar_url Column**

If Step 1 shows no results, run this:

```sql
-- Add avatar_url column if missing
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
```

### **Script 2: Create Storage Bucket**

If Step 2 shows no results, run this:

```sql
-- Create avatars bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;
```

### **Script 3: Create Storage Policies**

If Step 3 shows no results, run this:

```sql
-- Create storage policies for avatars
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own avatar" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own avatar" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
```

### **Script 4: Create/Update RLS Policies for Users Table**

If Step 4 shows missing policies, run this:

```sql
-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Allow users to view their own profile
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- Allow admins to view all users
CREATE POLICY "Admins can view all users" ON public.users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Allow admins to update all users
CREATE POLICY "Admins can update all users" ON public.users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

## 🧪 **Test Profile Picture Upload**

### **Step 5: Test Upload Functionality**

Run this in **Supabase SQL Editor** to test if your user can update their profile:

```sql
-- Test profile update (replace 'your-user-id' with actual user ID)
UPDATE public.users 
SET avatar_url = 'https://test-url.com/test.jpg'
WHERE id = 'your-user-id';

-- Check if update worked
SELECT id, email, name, avatar_url 
FROM public.users 
WHERE id = 'your-user-id';
```

### **Step 6: Check Storage Permissions**

Run this to verify storage permissions:

```sql
-- Check if current user can access storage
SELECT 
  auth.uid() as current_user_id,
  (SELECT COUNT(*) FROM storage.buckets WHERE id = 'avatars') as avatars_bucket_exists,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname LIKE '%avatar%') as avatar_policies_count;
```

## 🔍 **Additional Debugging**

### **Check Browser Console**

1. Open browser developer tools (F12)
2. Go to Console tab
3. Try uploading a profile picture
4. Look for error messages

### **Check Network Tab**

1. Open browser developer tools (F12)
2. Go to Network tab
3. Try uploading a profile picture
4. Check for failed requests (red entries)
5. Click on failed requests to see error details

### **Check Application Logs**

Look for these specific error patterns:

1. **Storage Error:** `Upload failed: The resource was not found`
2. **Permission Error:** `new row violates row-level security policy`
3. **Column Error:** `column "avatar_url" does not exist`
4. **Bucket Error:** `Bucket not found`

## 📋 **Complete Setup Verification Script**

Run this comprehensive script in **Supabase SQL Editor**:

```sql
-- Comprehensive Profile Picture Setup Verification
DO $$
DECLARE
    result_text TEXT := '';
    bucket_count INTEGER;
    column_count INTEGER;
    policy_count INTEGER;
    user_policy_count INTEGER;
BEGIN
    -- Check avatars bucket
    SELECT COUNT(*) INTO bucket_count FROM storage.buckets WHERE id = 'avatars';
    result_text := result_text || 'Avatars bucket exists: ' || (bucket_count > 0) || E'\n';
    
    -- Check avatar_url column
    SELECT COUNT(*) INTO column_count 
    FROM information_schema.columns 
    WHERE table_name = 'users' AND table_schema = 'public' AND column_name = 'avatar_url';
    result_text := result_text || 'Avatar_url column exists: ' || (column_count > 0) || E'\n';
    
    -- Check storage policies
    SELECT COUNT(*) INTO policy_count 
    FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname LIKE '%avatar%';
    result_text := result_text || 'Storage policies count: ' || policy_count || E'\n';
    
    -- Check user table policies
    SELECT COUNT(*) INTO user_policy_count 
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'users';
    result_text := result_text || 'User table policies count: ' || user_policy_count || E'\n';
    
    -- Check RLS status
    result_text := result_text || 'Users table RLS enabled: ' || 
        (SELECT relrowsecurity FROM pg_class WHERE relname = 'users' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) || E'\n';
    
    RAISE NOTICE '%', result_text;
END $$;
```

## 🚀 **Complete Fix Script**

If you want to run everything at once, use this complete setup script:

```sql
-- Complete Profile Picture Setup Script
-- Run this in Supabase SQL Editor

-- 1. Ensure avatar_url column exists
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Create avatars bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 4. Create user table policies
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON public.users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update all users" ON public.users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 5. Create storage policies
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own avatar" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own avatar" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 6. Verify setup
SELECT 
  'Setup Complete' as status,
  (SELECT COUNT(*) FROM storage.buckets WHERE id = 'avatars') as bucket_exists,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'avatar_url') as column_exists,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname LIKE '%avatar%') as storage_policies,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users') as user_policies;
```

## 🔧 **Manual Testing Steps**

After running the fix script:

1. **Test in Supabase Dashboard:**
   - Go to Storage > Buckets
   - Verify 'avatars' bucket exists and is public
   - Try uploading a test image manually

2. **Test in Application:**
   - Log in to your app
   - Go to profile page
   - Try uploading a profile picture
   - Check browser console for errors

3. **Verify Database:**
   - Check if avatar_url is updated in users table
   - Verify the file appears in storage bucket

## 🆘 **Common Issues & Solutions**

### **Issue 1: "Bucket not found"**
**Solution:** Run Script 2 to create the bucket

### **Issue 2: "Column avatar_url does not exist"**
**Solution:** Run Script 1 to add the column

### **Issue 3: "Row-level security policy violation"**
**Solution:** Run Script 4 to create proper RLS policies

### **Issue 4: "Upload failed: The resource was not found"**
**Solution:** Run Script 3 to create storage policies

### **Issue 5: "Access denied"**
**Solution:** Check if user is authenticated and policies allow access

Run the diagnostic scripts first to identify the specific issue, then use the appropriate fix script!