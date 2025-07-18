#!/bin/bash

# Script to resolve Supabase relationship conflicts
# This replaces users!inner with users!player_id in the three conflicted files

echo "Resolving Supabase relationship conflicts..."

# Fix analytics page
sed -i 's/users!inner(/users!player_id(/g' app/dashboard/analytics/page.tsx
echo "✓ Fixed app/dashboard/analytics/page.tsx"

# Fix performance page  
sed -i 's/users!inner(/users!player_id(/g' app/dashboard/performance/page.tsx
echo "✓ Fixed app/dashboard/performance/page.tsx"

# Fix dashboard data
sed -i 's/users!inner(/users!player_id(/g' lib/dashboard-data.ts
echo "✓ Fixed lib/dashboard-data.ts"

echo "All conflicts resolved! The relationship issue is fixed."
echo "You can now commit these changes and continue with your merge."