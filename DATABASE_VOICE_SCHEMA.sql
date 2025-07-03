-- Voice Channels Database Schema Updates
-- Add these to your Prisma schema or run as SQL migrations

-- Voice Channel Settings Table
CREATE TABLE IF NOT EXISTS "VoiceChannelSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "channelId" TEXT NOT NULL UNIQUE,
    "serverId" TEXT NOT NULL,
    "maxParticipants" INTEGER NOT NULL DEFAULT 20,
    "allowVideo" BOOLEAN NOT NULL DEFAULT true,
    "allowScreenShare" BOOLEAN NOT NULL DEFAULT true,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "requirePermission" BOOLEAN NOT NULL DEFAULT false,
    "bitrateLimit" INTEGER DEFAULT NULL, -- kbps
    "region" TEXT DEFAULT NULL, -- voice region preference
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "VoiceChannelSettings_channelId_fkey" 
        FOREIGN KEY ("channelId") REFERENCES "Channel" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VoiceChannelSettings_serverId_fkey" 
        FOREIGN KEY ("serverId") REFERENCES "Server" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Voice Channel Statistics Table
CREATE TABLE IF NOT EXISTS "VoiceChannelStats" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "channelId" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "totalSessions" INTEGER NOT NULL DEFAULT 0,
    "totalDuration" INTEGER NOT NULL DEFAULT 0, -- seconds
    "peakParticipants" INTEGER NOT NULL DEFAULT 0,
    "avgParticipants" REAL NOT NULL DEFAULT 0,
    "totalParticipants" INTEGER NOT NULL DEFAULT 0,
    "videoSessions" INTEGER NOT NULL DEFAULT 0,
    "screenShareSessions" INTEGER NOT NULL DEFAULT 0,
    "avgConnectionQuality" REAL DEFAULT NULL, -- 0-100
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "VoiceChannelStats_channelId_fkey" 
        FOREIGN KEY ("channelId") REFERENCES "Channel" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VoiceChannelStats_serverId_fkey" 
        FOREIGN KEY ("serverId") REFERENCES "Server" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        
    UNIQUE("channelId", "date")
);

-- User Voice Sessions Table
CREATE TABLE IF NOT EXISTS "VoiceSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" DATETIME DEFAULT NULL,
    "duration" INTEGER DEFAULT NULL, -- seconds
    "wasVideoEnabled" BOOLEAN NOT NULL DEFAULT false,
    "wasScreenSharing" BOOLEAN NOT NULL DEFAULT false,
    "speakingTime" INTEGER NOT NULL DEFAULT 0, -- seconds
    "connectionQuality" TEXT DEFAULT NULL, -- 'excellent', 'good', 'fair', 'poor'
    "avgLatency" INTEGER DEFAULT NULL, -- ms
    "packetsLost" INTEGER DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "VoiceSession_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VoiceSession_channelId_fkey" 
        FOREIGN KEY ("channelId") REFERENCES "Channel" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VoiceSession_serverId_fkey" 
        FOREIGN KEY ("serverId") REFERENCES "Server" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- User Voice Preferences Table
CREATE TABLE IF NOT EXISTS "UserVoicePreferences" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL UNIQUE,
    "selectedMicrophone" TEXT DEFAULT NULL,
    "selectedSpeaker" TEXT DEFAULT NULL,
    "selectedCamera" TEXT DEFAULT NULL,
    "microphoneVolume" INTEGER NOT NULL DEFAULT 100,
    "speakerVolume" INTEGER NOT NULL DEFAULT 100,
    "audioQuality" TEXT NOT NULL DEFAULT 'auto', -- 'low', 'medium', 'high', 'auto'
    "videoQuality" TEXT NOT NULL DEFAULT 'auto', -- 'low', 'medium', 'high', 'auto'
    "echoCancellation" BOOLEAN NOT NULL DEFAULT true,
    "noiseSuppression" BOOLEAN NOT NULL DEFAULT true,
    "autoGainControl" BOOLEAN NOT NULL DEFAULT true,
    "speakingThreshold" INTEGER NOT NULL DEFAULT 50,
    "silenceTimeout" INTEGER NOT NULL DEFAULT 1000,
    "enableSpeakingDetection" BOOLEAN NOT NULL DEFAULT true,
    "enableConnectionMonitoring" BOOLEAN NOT NULL DEFAULT true,
    "showConnectionQuality" BOOLEAN NOT NULL DEFAULT true,
    "showSpeakingIndicators" BOOLEAN NOT NULL DEFAULT true,
    "enableNotifications" BOOLEAN NOT NULL DEFAULT true,
    "enableHoverTooltips" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "UserVoicePreferences_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Voice Channel Permissions Table
CREATE TABLE IF NOT EXISTS "VoiceChannelPermission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "channelId" TEXT NOT NULL,
    "userId" TEXT DEFAULT NULL,
    "roleId" TEXT DEFAULT NULL,
    "permission" TEXT NOT NULL, -- 'JOIN', 'SPEAK', 'VIDEO', 'SCREEN_SHARE', 'MUTE_OTHERS', 'MANAGE'
    "allowed" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "VoiceChannelPermission_channelId_fkey" 
        FOREIGN KEY ("channelId") REFERENCES "Channel" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VoiceChannelPermission_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        
    UNIQUE("channelId", "userId", "permission"),
    UNIQUE("channelId", "roleId", "permission")
);

-- Voice Connection Logs Table (for debugging and monitoring)
CREATE TABLE IF NOT EXISTS "VoiceConnectionLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL, -- 'JOIN', 'LEAVE', 'MUTE', 'UNMUTE', 'VIDEO_ON', 'VIDEO_OFF', 'SCREEN_SHARE_START', 'SCREEN_SHARE_STOP', 'SPEAKING_START', 'SPEAKING_STOP', 'CONNECTION_QUALITY_CHANGE'
    "eventData" TEXT DEFAULT NULL, -- JSON data
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userAgent" TEXT DEFAULT NULL,
    "ipAddress" TEXT DEFAULT NULL,
    
    CONSTRAINT "VoiceConnectionLog_sessionId_fkey" 
        FOREIGN KEY ("sessionId") REFERENCES "VoiceSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VoiceConnectionLog_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VoiceConnectionLog_channelId_fkey" 
        FOREIGN KEY ("channelId") REFERENCES "Channel" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS "VoiceChannelStats_channelId_date_idx" ON "VoiceChannelStats"("channelId", "date");
CREATE INDEX IF NOT EXISTS "VoiceChannelStats_serverId_date_idx" ON "VoiceChannelStats"("serverId", "date");
CREATE INDEX IF NOT EXISTS "VoiceSession_userId_joinedAt_idx" ON "VoiceSession"("userId", "joinedAt");
CREATE INDEX IF NOT EXISTS "VoiceSession_channelId_joinedAt_idx" ON "VoiceSession"("channelId", "joinedAt");
CREATE INDEX IF NOT EXISTS "VoiceSession_serverId_joinedAt_idx" ON "VoiceSession"("serverId", "joinedAt");
CREATE INDEX IF NOT EXISTS "VoiceConnectionLog_sessionId_timestamp_idx" ON "VoiceConnectionLog"("sessionId", "timestamp");
CREATE INDEX IF NOT EXISTS "VoiceConnectionLog_channelId_timestamp_idx" ON "VoiceConnectionLog"("channelId", "timestamp");

-- Update existing Channel table to support voice channel type
-- ALTER TABLE "Channel" ADD COLUMN "type" TEXT DEFAULT 'text' CHECK ("type" IN ('text', 'voice', 'video', 'stage'));
-- UPDATE "Channel" SET "type" = 'text' WHERE "type" IS NULL;

-- Views for analytics
CREATE VIEW IF NOT EXISTS "VoiceChannelAnalytics" AS
SELECT 
    c."id" as "channelId",
    c."name" as "channelName",
    c."serverId",
    s."name" as "serverName",
    COUNT(DISTINCT vs."userId") as "totalUsers",
    COUNT(vs."id") as "totalSessions",
    COALESCE(SUM(vs."duration"), 0) as "totalDuration",
    COALESCE(AVG(vs."duration"), 0) as "avgSessionDuration",
    COALESCE(MAX(vcs."peakParticipants"), 0) as "peakParticipants",
    COALESCE(AVG(vcs."avgParticipants"), 0) as "avgParticipants",
    COALESCE(AVG(vs."avgLatency"), 0) as "avgLatency",
    COALESCE(AVG(vs."packetsLost"), 0) as "avgPacketsLost",
    COUNT(CASE WHEN vs."wasVideoEnabled" = true THEN 1 END) as "videoSessions",
    COUNT(CASE WHEN vs."wasScreenSharing" = true THEN 1 END) as "screenShareSessions"
FROM "Channel" c
LEFT JOIN "Server" s ON c."serverId" = s."id"
LEFT JOIN "VoiceSession" vs ON c."id" = vs."channelId"
LEFT JOIN "VoiceChannelStats" vcs ON c."id" = vcs."channelId"
WHERE c."type" = 'voice'
GROUP BY c."id", c."name", c."serverId", s."name";

CREATE VIEW IF NOT EXISTS "UserVoiceActivity" AS
SELECT 
    u."id" as "userId",
    u."username",
    u."email",
    COUNT(vs."id") as "totalSessions",
    COALESCE(SUM(vs."duration"), 0) as "totalDuration",
    COALESCE(AVG(vs."duration"), 0) as "avgSessionDuration",
    COALESCE(SUM(vs."speakingTime"), 0) as "totalSpeakingTime",
    COALESCE(AVG(vs."avgLatency"), 0) as "avgLatency",
    COUNT(CASE WHEN vs."wasVideoEnabled" = true THEN 1 END) as "videoSessions",
    COUNT(CASE WHEN vs."wasScreenSharing" = true THEN 1 END) as "screenShareSessions",
    MAX(vs."joinedAt") as "lastActivity"
FROM "User" u
LEFT JOIN "VoiceSession" vs ON u."id" = vs."userId"
GROUP BY u."id", u."username", u."email";
