# Fix for Player Submission Button Database Error

## Issue
When players submit performance data, the system returns this error:
```
Error: null value in column "date" of relation "attendances" violates not-null constraint
```

## Root Cause
The error occurs because:

1. When a player submits performance data, it triggers an auto-attendance function
2. The function tries to create an attendance record automatically
3. In some cases, the slot referenced in the performance doesn't have a valid date
4. The function was trying to insert NULL into the required `date` column
5. Additionally, the function was using invalid status values that don't match the current database constraints

## Solution
A new fixed function has been created in `/workspace/scripts/16-fix-auto-attendance-null-date.sql` that:

1. Always ensures a non-null date (uses slot date if available, falls back to CURRENT_DATE)
2. Uses correct status values ('present' instead of 'auto')
3. Properly handles the 'source' column to track auto-generated attendance
4. Prevents duplicate entries with proper conflict handling

## How to Apply the Fix

### Option 1: Through Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `/workspace/scripts/16-fix-auto-attendance-null-date.sql`
4. Run the script

### Option 2: Using Command Line (if you have psql access)
```bash
psql $DATABASE_URL -f scripts/16-fix-auto-attendance-null-date.sql
```

### Option 3: Using Supabase CLI
```bash
supabase db reset --linked
# Or apply specific migration
supabase db push
```

## Verification
After applying the fix:

1. Try submitting a performance entry through the player submission form
2. The error should no longer occur
3. Check the `attendances` table to verify automatic attendance records are being created correctly

## Technical Details
The new function `create_auto_attendance_fixed()`:
- Safely handles null slot dates by falling back to CURRENT_DATE
- Uses 'present' status (valid according to new constraints)
- Sets source to 'auto' to track automatic creation
- Prevents conflicts with `ON CONFLICT DO NOTHING`
- Properly validates all required fields before insertion

## Files Modified
- `/workspace/scripts/16-fix-auto-attendance-null-date.sql` (new fix script)
- This fix replaces the previous functions and triggers