# User Profile Sync Fix Guide

## 🚨 **CRITICAL ISSUE IDENTIFIED**

Your system has **6 missing user profiles** (visible=1, expected=7) because the admin service cannot access `auth.users` due to using the **anon key instead of service role key**.

## 🔧 **IMMEDIATE FIX REQUIRED**

### Step 1: Get Your Service Role Key

1. **Go to Supabase Dashboard**: https://app.supabase.com/project/ydjrngnnuxxswmhxwxzf
2. **Navigate to**: Settings → API
3. **Copy the `service_role` key** (NOT the anon key)
4. **⚠️ CRITICAL**: This key bypasses RLS and gives admin access

### Step 2: Set Environment Variable

**For Local Development:**
```bash
# Add to your .env.local file
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**For Vercel Deployment:**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add: `SUPABASE_SERVICE_ROLE_KEY` = `your-service-role-key`
3. **Redeploy** your application

### Step 3: Verify the Fix

1. **Restart your application** (service role key is loaded at startup)
2. **Go to User Management page**
3. **Click "Sync Missing Profiles"** button
4. **Check diagnostics** - you should now see all 7 users

## 🔍 **What Was Fixed**

### Before (BROKEN):
```typescript
// Using anon key - LIMITED PERMISSIONS
const supabaseAdmin = createClient(url, ANON_KEY)
// ❌ Cannot access auth.users
// ❌ Cannot bypass RLS
// ❌ Cannot perform admin operations
```

### After (FIXED):
```typescript
// Using service role key - FULL ADMIN PERMISSIONS  
const supabaseAdmin = createClient(url, SERVICE_ROLE_KEY)
// ✅ Can access auth.users
// ✅ Can bypass RLS
// ✅ Can perform admin operations
```

## 📋 **New Features Added**

### 1. **Enhanced Profile Sync**
- `SupabaseAdminService.getAllAuthUsers()` - Access auth.users table
- `SupabaseAdminService.createMissingProfiles()` - Auto-create missing profiles
- Assigns `pending` role to new users automatically

### 2. **Better Error Handling**
- Clear error messages for permission issues
- Detailed logging for debugging
- Fallback mechanisms

### 3. **Improved Security**
- Proper service role configuration
- Admin verification for sensitive operations
- Secure profile creation process

## 🧪 **Testing the Fix**

### Expected Results After Setup:

**Diagnostics Should Show:**
```json
{
  "adminPermissions": {
    "canReadUsers": true,
    "canUpdateUsers": true,
    "canDeleteUsers": true,
    "userCount": 7
  },
  "userCounts": {
    "visible": 7,
    "expected": 7
  },
  "authUsers": {
    "accessible": true,
    "count": 7
  }
}
```

**Sync Button Should:**
- ✅ Access auth.users successfully
- ✅ Create missing profiles with `pending` role
- ✅ Show "Created X missing profiles" message
- ✅ Display all 7 users in the list

## 🔐 **Security Notes**

### Service Role Key Powers:
- **Bypasses ALL RLS policies**
- **Full database access**
- **Can read auth.users**
- **Can perform admin operations**

### Best Practices:
- ✅ Only use in admin functions
- ✅ Never expose to frontend
- ✅ Store as environment variable
- ✅ Use different keys for dev/prod

## 🚀 **Quick Test Commands**

```bash
# 1. Check environment variables
echo $SUPABASE_SERVICE_ROLE_KEY

# 2. Restart development server
npm run dev

# 3. Test the sync functionality
# Go to /dashboard/user-management and click "Sync Missing Profiles"
```

## 📞 **If Still Having Issues**

### Common Problems:

1. **"Cannot access auth.users"**
   - ❌ Service role key not set correctly
   - ✅ Double-check the key in Supabase dashboard

2. **"Permission denied"**
   - ❌ Still using anon key
   - ✅ Restart application after setting env var

3. **"Users not syncing"**
   - ❌ RLS policies blocking access
   - ✅ Service role key bypasses RLS

### Debug Steps:
1. Check if `SUPABASE_SERVICE_ROLE_KEY` is set
2. Verify the key starts with `eyJ...` and is different from anon key
3. Restart the application
4. Check console logs during sync operation

## ✅ **Success Criteria**

You'll know it's working when:
- [ ] Sync button works without permission errors
- [ ] All 7 users appear in the user list
- [ ] New users get `pending` role automatically
- [ ] Admin permissions show all as `true`
- [ ] Diagnostics show `userCounts.visible = 7`

---

**This fix resolves the core issue preventing proper user management in your Raptor Esports CRM!** 🎯