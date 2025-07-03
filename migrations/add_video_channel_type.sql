-- AddVideoChannelType Migration
-- This adds support for VIDEO channel type in addition to TEXT, VOICE, and ANNOUNCEMENT

-- First, add the new enum value
ALTER TYPE "ChannelType" ADD VALUE 'VIDEO';

-- Update any existing voice channels that should be video channels (optional)
-- You can manually update specific channels if needed:
-- UPDATE "channels" SET type = 'VIDEO' WHERE type = 'VOICE' AND name LIKE '%video%';

-- Add any additional indexes or constraints if needed
-- CREATE INDEX IF NOT EXISTS "channels_type_idx" ON "channels"("type");

-- Verify the change
-- SELECT DISTINCT type FROM "channels" ORDER BY type;
