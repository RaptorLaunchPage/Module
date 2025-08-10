# Fix for Player Submission Button Database Error

## Issue
When players submit performance data, the system returns these errors:
```
Error: null value in column "date" of relation "attendances" violates not-null constraint
Error: there is no unique or exclusion constraint matching the ON CONFLICT specification
```

## Root Cause
The error occurs because:

1. When a player submits performance data, it triggers an auto-attendance function
2. The function tries to create an attendance record automatically
3. In some cases, the slot referenced in the performance doesn't have a valid date
4. The function was trying to insert NULL into the required `date` column
5. The function was using `ON CONFLICT` specification that referenced a unique constraint that doesn't exist
6. The actual database schema has both `session_time` and `session_id` columns but no unique constraints on the attendances table

## Solution
A new function has been created in `/workspace/scripts/16-fix-auto-attendance-null-date.sql` that:

1. Always ensures a non-null date (uses slot date if available, falls back to CURRENT_DATE)
2. Works with the actual database schema using the `session_time` column with value 'Match'
3. Performs manual duplicate checking instead of relying on non-existent unique constraints
4. Uses 'auto' status (which is valid according to the actual schema constraints)
5. Properly handles the 'source' column to track auto-generated attendance

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
- Works with the actual database schema using `session_time = 'Match'`
- Performs manual duplicate checking using `NOT EXISTS` clause
- Uses 'auto' status (valid according to actual schema constraints)
- Sets source to 'auto' to track automatic creation
- Checks for existing records by `(player_id, date, session_time, team_id)` combination
- Properly validates all required fields before insertion

## Files Modified
- `/workspace/scripts/16-fix-auto-attendance-null-date.sql` (new fix script)
- This fix replaces the previous functions and triggers