-- Add missing fields to teams table
ALTER TABLE teams ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'Bronze';

-- Add missing fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Benched', 'On Leave', 'Discontinued'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS gyroscope_enabled BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS instagram_handle TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS discord_id TEXT;