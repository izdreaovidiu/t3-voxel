-- Migration to add ServerInvite table
-- Run this with: npx prisma db push or npx prisma migrate dev

-- First, let's check if the table exists
-- CREATE TABLE IF NOT EXISTS \"server_invites\" (
CREATE TABLE \"server_invites\" (
    \"id\" TEXT NOT NULL,
    \"code\" TEXT NOT NULL,
    \"serverId\" TEXT NOT NULL,
    \"createdBy\" TEXT NOT NULL,
    \"maxUses\" INTEGER,
    \"uses\" INTEGER NOT NULL DEFAULT 0,
    \"expiresAt\" TIMESTAMP(3),
    \"createdAt\" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT \"server_invites_pkey\" PRIMARY KEY (\"id\")
);

-- Create unique index on code
CREATE UNIQUE INDEX \"server_invites_code_key\" ON \"server_invites\"(\"code\");

-- Add foreign key constraints
ALTER TABLE \"server_invites\" ADD CONSTRAINT \"server_invites_serverId_fkey\" 
FOREIGN KEY (\"serverId\") REFERENCES \"servers\"(\"id\") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE \"server_invites\" ADD CONSTRAINT \"server_invites_createdBy_fkey\" 
FOREIGN KEY (\"createdBy\") REFERENCES \"users\"(\"id\") ON DELETE CASCADE ON UPDATE CASCADE;
