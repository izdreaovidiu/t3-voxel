// src/server/socket/enhanced-socket-server.ts - ENHANCED VERSION WITH SPEAKING DETECTION
import type { Server as HTTPServer } from "http";
import type { NextApiRequest, NextApiResponse } from 'next';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { PrismaClient } from "@prisma/client";

interface MessageReaction {
  emoji: string;
  count: number;
  users: string[];
}

interface SocketMessage {
  id: string;
  content: string;
  channelId: string;
  userId: string;
  username: string;
  avatar?: string;
  role: 'member' | 'admin' | 'moderator';
  edited: boolean;
  reactions: MessageReaction[];
  createdAt: string;
  updatedAt: string;
  tempId?: string;
}

export type NextApiResponseServerIO = NextApiResponse & {
  socket: {
    server: HTTPServer & {
      io: SocketIOServer;
    };
  };
};

const prisma = new PrismaClient();

// Enhanced user tracking
const onlineUsers = new Map<string, {
  socketId: string;
  userId: string;
  username: string;
  avatar?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  connectedAt: Date;
  lastSeen: Date;
  status: 'online' | 'idle' | 'dnd' | 'invisible';
}>();

const socketToUser = new Map<string, string>();
const serverMembers = new Map<string, Set<string>>();
const userServers = new Map<string, Set<string>>();

// Enhanced voice channel management with speaking detection
const voiceChannels = new Map<string, {
  participants: Map<string, {
    userId: string;
    username: string;
    avatar?: string;
    isAudioEnabled: boolean;
    isVideoEnabled: boolean;
    isScreenSharing: boolean;
    isSpeaking: boolean;
    volume: number;
    joinedAt: Date;
    lastSpeakingUpdate: Date;
    connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
  }>;
  settings: {
    maxParticipants: number;
    allowVideo: boolean;
    allowScreenShare: boolean;
    isLocked: boolean;
  };
}>();

// Speaking detection tracking
const speakingTimeouts = new Map<string, NodeJS.Timeout>();
const SPEAKING_TIMEOUT = 3000; // 3 seconds of silence to stop speaking indicator

// Voice channel statistics
const voiceStats = new Map<string, {
  totalSpeakingTime: number;
  packetsLost: number;
  jitter: number;
  lastStatsUpdate: Date;
}>();

export const initializeEnhancedSocket = (req: NextApiRequest, res: NextApiResponseServerIO) => {
  if (!res.socket.server.io) {
    console.log('🚀 Initializing Enhanced Socket.IO server...');
    
    const io = new SocketIOServer(res.socket.server, {
      path: '/api/socket/io',
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true
      },
      addTrailingSlash: false,
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000,
      // Enhanced configuration for voice channels
      maxHttpBufferSize: 1e8, // 100MB for large files
      allowEIO3: true,
    });

    // Enhanced middleware for authentication
    io.use(async (socket: Socket, next: (err?: Error) => void) => {
      try {
        const { clerkId, username, email, avatar, firstName, lastName } = socket.handshake.auth;

        if (!clerkId) {
          return next(new Error("Authentication error: Missing clerkId"));
        }

        let user = await prisma.user.findUnique({ where: { clerkId } });

        if (!user) {
          if (!email) {
            return next(new Error("Authentication error: Missing email for new user"));
          }
          user = await prisma.user.create({
            data: {
              clerkId,
              email,
              username: username || email.split('@')[0],
              avatar,
            },
          });
          console.log(`✨ Created new user in DB: ${user.username} (${user.id})`);
        }

        // Handle multiple connections from same user
        const existingOnlineUser = onlineUsers.get(user.id);
        if (existingOnlineUser && existingOnlineUser.socketId !== socket.id) {
          const oldSocket = io.sockets.sockets.get(existingOnlineUser.socketId);
          if (oldSocket) {
            oldSocket.emit('connection:superseded', { reason: 'New connection from same user' });
            oldSocket.disconnect(true);
          }
        }

        socket.data.user = user;

        // Enhanced user tracking
        onlineUsers.set(user.id, {
          socketId: socket.id,
          userId: user.id,
          username: user.username,
          avatar: user.avatar,
          email: user.email,
          firstName: firstName,
          lastName: lastName,
          fullName: `${firstName || ''} ${lastName || ''}`.trim() || user.username,
          connectedAt: new Date(),
          lastSeen: new Date(),
          status: 'online'
        });
        socketToUser.set(socket.id, user.id);

        console.log(`🔐 User authenticated: ${user.username} (${user.id})`);
        next();
      } catch (error) {
        console.error("❌ Middleware authentication error:", error);
        next(new Error("Internal server error during authentication"));
      }
    });

    io.on('connection', (socket: Socket) => {
      const user = socket.data.user;
      console.log(`🔌 User connected: ${user.username} (${socket.id})`);

      // Update user status
      const userServersList = userServers.get(user.id);
      if (userServersList) {
        for (const serverId of userServersList) {
          broadcastServerMembers(io, serverId);
        }
      }

      // Enhanced heartbeat for connection monitoring
      socket.on('ping', (timestamp: number) => {
        const user = onlineUsers.get(socketToUser.get(socket.id) || '');
        if (user) {
          user.lastSeen = new Date();
          socket.emit('pong', timestamp);
        }
      });

      // Status update handler
      socket.on('user:status_update', (data: { status: 'online' | 'idle' | 'dnd' | 'invisible' }) => {
        const userId = socketToUser.get(socket.id);
        if (userId) {
          const user = onlineUsers.get(userId);
          if (user) {
            user.status = data.status;
            user.lastSeen = new Date();
            
            // Broadcast status change
            const userServersList = userServers.get(userId);
            if (userServersList) {
              for (const serverId of userServersList) {
                broadcastServerMembers(io, serverId);
              }
            }
          }
        }
      });

      // Server and channel handlers (same as before)
      socket.on('user:join', async (data: { 
        userId: string; 
        serverId?: string; 
        username?: string; 
        avatar?: string;
        firstName?: string;
        lastName?: string;
      }) => {
        const { userId, serverId } = data;
        
        const user = onlineUsers.get(userId);
        if (!user || user.socketId !== socket.id) {
          console.warn(`❌ Unauthorized server join: ${userId}`);
          return;
        }
        
        if (serverId) {
          socket.join(`server:${serverId}`);
          
          if (!serverMembers.has(serverId)) {
            serverMembers.set(serverId, new Set());
          }
          serverMembers.get(serverId)!.add(userId);
          
          if (!userServers.has(userId)) {
            userServers.set(userId, new Set());
          }
          userServers.get(userId)!.add(serverId);
          
          console.log(`🏠 User ${user.fullName} joined server ${serverId}`);
          broadcastServerMembers(io, serverId);
        }
      });

      socket.on('channel:join', async (data: { channelId: string; serverId?: string }) => {
        const userId = socketToUser.get(socket.id);
        if (!userId || !onlineUsers.has(userId)) {
          return;
        }
        
        socket.join(`channel:${data.channelId}`);
        console.log(`📱 User ${userId} joined channel ${data.channelId}`);
      });

      // Enhanced message handler
      socket.on('message:send', async (data, callback) => {
        try {
          const { content, channelId, tempId } = data;
          const user = socket.data.user;

          if (!user || !user.id) {
            return callback({ success: false, error: 'User not authenticated' });
          }

          const savedMessage = await prisma.message.create({
            data: {
              content,
              channelId,
              authorId: user.id,
            },
            include: {
              author: true,
            },
          });

          const broadcastMessage = {
            id: savedMessage.id,
            content: savedMessage.content,
            channelId: savedMessage.channelId,
            userId: savedMessage.authorId,
            username: savedMessage.author.username,
            avatar: savedMessage.author.avatar,
            createdAt: savedMessage.createdAt.toISOString(),
            tempId
          };

          io.to(`channel:${channelId}`).emit('message:new', broadcastMessage);
          callback({ success: true, message: broadcastMessage });

        } catch (error) {
          console.error('Error saving message:', error);
          callback({ success: false, error: 'Failed to save message' });
        }
      });

      // Enhanced voice channel handlers
      socket.on('voice:join', async (data: { 
        channelId: string; 
        userId: string; 
        username: string; 
        avatar?: string;
        callType: 'voice' | 'video' | 'screen';
        quality?: 'auto' | 'high' | 'medium' | 'low';
      }) => {
        const { channelId, userId, callType, quality = 'auto' } = data;
        
        // Enhanced authorization - check if user is authenticated on this socket
        const socketUserId = socketToUser.get(socket.id);
        if (!socketUserId || socketUserId !== userId) {
          console.warn(`❌ Unauthorized voice join: ${userId} (socket: ${socket.id}, expected: ${socketUserId})`);
          socket.emit('voice:join_failed', { 
            channelId, 
            reason: 'Authentication mismatch',
            details: 'User ID does not match socket authentication'
          });
          return;
        }
        
        const user = onlineUsers.get(userId);
        if (!user) {
          console.warn(`❌ User not found in online users: ${userId}`);
          socket.emit('voice:join_failed', { 
            channelId, 
            reason: 'User not found',
            details: 'Please refresh and try again'
          });
          return;
        }
        
        console.log(`✅ User ${user.username} (${userId}) authorized to join voice channel ${channelId}`);
        
        if (!voiceChannels.has(channelId)) {
          voiceChannels.set(channelId, { 
            participants: new Map(),
            settings: {
              maxParticipants: 20,
              allowVideo: true,
              allowScreenShare: true,
              isLocked: false,
            }
          });
        }
        
        const channel = voiceChannels.get(channelId)!;
        
        // Check if channel is full
        if (channel.participants.size >= channel.settings.maxParticipants) {
          socket.emit('voice:join_failed', { 
            channelId, 
            reason: 'Channel is full',
            maxParticipants: channel.settings.maxParticipants 
          });
          return;
        }
        
        // Add participant with enhanced data
        channel.participants.set(userId, {
          userId,
          username: user.username,
          avatar: user.avatar,
          isAudioEnabled: true,
          isVideoEnabled: callType === 'video',
          isScreenSharing: callType === 'screen',
          isSpeaking: false,
          volume: 0,
          joinedAt: new Date(),
          lastSpeakingUpdate: new Date(),
          connectionQuality: 'excellent'
        });
        
        // Initialize voice stats
        voiceStats.set(userId, {
          totalSpeakingTime: 0,
          packetsLost: 0,
          jitter: 0,
          lastStatsUpdate: new Date()
        });
        
        socket.join(`voice:${channelId}`);
        
        const participantsList = Array.from(channel.participants.values());
        io.to(`voice:${channelId}`).emit('voice:participants_updated', {
          channelId,
          participants: participantsList,
          totalCount: participantsList.length,
          settings: channel.settings
        });
        
        // Send connection quality info
        socket.emit('voice:connection_info', {
          channelId,
          quality,
          maxBitrate: quality === 'high' ? 128000 : quality === 'medium' ? 64000 : 32000,
          sampleRate: 48000
        });
        
        console.log(`🎤 User ${user.username} joined voice channel ${channelId} (${callType}, ${quality})`);
      });

      socket.on('voice:leave', async (data: { channelId: string; userId: string }) => {
        const { channelId, userId } = data;
        
        // Enhanced authorization for leave
        const socketUserId = socketToUser.get(socket.id);
        if (!socketUserId || socketUserId !== userId) {
          console.warn(`❌ Unauthorized voice leave: ${userId}`);
          return;
        }
        
        const user = onlineUsers.get(userId);
        if (!user) {
          console.warn(`❌ User not found for voice leave: ${userId}`);
          return;
        }
        
        const channel = voiceChannels.get(channelId);
        if (channel && channel.participants.has(userId)) {
          channel.participants.delete(userId);
          socket.leave(`voice:${channelId}`);
          
          // Clear speaking timeout
          const timeoutKey = `${channelId}:${userId}`;
          if (speakingTimeouts.has(timeoutKey)) {
            clearTimeout(speakingTimeouts.get(timeoutKey)!);
            speakingTimeouts.delete(timeoutKey);
          }
          
          // Clean up voice stats
          voiceStats.delete(userId);
          
          if (channel.participants.size === 0) {
            voiceChannels.delete(channelId);
          } else {
            const participantsList = Array.from(channel.participants.values());
            io.to(`voice:${channelId}`).emit('voice:participants_updated', {
              channelId,
              participants: participantsList,
              totalCount: participantsList.length,
              settings: channel.settings
            });
          }
          
          console.log(`🎤 User ${user.username} left voice channel ${channelId}`);
        }
      });

      // Enhanced speaking detection
      socket.on('voice:speaking_update', async (data: {
        channelId: string;
        userId: string;
        isSpeaking: boolean;
        volume: number;
        audioLevel?: number;
      }) => {
        const { channelId, userId, isSpeaking, volume, audioLevel } = data;
        
        // Enhanced authorization for speaking updates
        const socketUserId = socketToUser.get(socket.id);
        if (!socketUserId || socketUserId !== userId) {
          return;
        }
        
        const user = onlineUsers.get(userId);
        if (!user) {
          return;
        }
        
        const channel = voiceChannels.get(channelId);
        if (channel && channel.participants.has(userId)) {
          const participant = channel.participants.get(userId)!;
          
          // Update speaking state
          participant.isSpeaking = isSpeaking;
          participant.volume = volume;
          participant.lastSpeakingUpdate = new Date();
          
          // Update voice stats
          const stats = voiceStats.get(userId);
          if (stats && isSpeaking) {
            stats.totalSpeakingTime += 100; // 100ms intervals
            stats.lastStatsUpdate = new Date();
          }
          
          // Handle speaking timeout
          const timeoutKey = `${channelId}:${userId}`;
          if (speakingTimeouts.has(timeoutKey)) {
            clearTimeout(speakingTimeouts.get(timeoutKey)!);
            speakingTimeouts.delete(timeoutKey);
          }
          
          if (isSpeaking) {
            // Set timeout to stop speaking indicator
            const timeout = setTimeout(() => {
              const currentParticipant = channel.participants.get(userId);
              if (currentParticipant) {
                currentParticipant.isSpeaking = false;
                currentParticipant.volume = 0;
                
                // Broadcast updated participants
                const participantsList = Array.from(channel.participants.values());
                io.to(`voice:${channelId}`).emit('voice:participants_updated', {
                  channelId,
                  participants: participantsList,
                  totalCount: participantsList.length,
                  settings: channel.settings
                });
              }
              speakingTimeouts.delete(timeoutKey);
            }, SPEAKING_TIMEOUT);
            
            speakingTimeouts.set(timeoutKey, timeout);
          }
          
          // Broadcast speaking update immediately
          socket.to(`voice:${channelId}`).emit('voice:speaking_update', {
            userId,
            isSpeaking,
            volume,
            audioLevel
          });
          
          // Broadcast full participants update less frequently
          if (Math.random() < 0.1) { // 10% chance to reduce bandwidth
            const participantsList = Array.from(channel.participants.values());
            io.to(`voice:${channelId}`).emit('voice:participants_updated', {
              channelId,
              participants: participantsList,
              totalCount: participantsList.length,
              settings: channel.settings
            });
          }
        }
      });

      // Voice connection quality monitoring
      socket.on('voice:connection_stats', async (data: {
        channelId: string;
        userId: string;
        stats: {
          packetsLost: number;
          jitter: number;
          bitrate: number;
          roundTripTime: number;
        };
      }) => {
        const { channelId, userId, stats } = data;
        
        // Enhanced authorization for connection stats
        const socketUserId = socketToUser.get(socket.id);
        if (!socketUserId || socketUserId !== userId) {
          return;
        }
        
        const user = onlineUsers.get(userId);
        if (!user) {
          return;
        }
        
        const channel = voiceChannels.get(channelId);
        if (channel && channel.participants.has(userId)) {
          const participant = channel.participants.get(userId)!;
          
          // Update connection quality based on stats
          let quality: 'excellent' | 'good' | 'fair' | 'poor' = 'excellent';
          
          if (stats.packetsLost > 5 || stats.jitter > 100 || stats.roundTripTime > 200) {
            quality = 'poor';
          } else if (stats.packetsLost > 2 || stats.jitter > 50 || stats.roundTripTime > 100) {
            quality = 'fair';
          } else if (stats.packetsLost > 0 || stats.jitter > 20 || stats.roundTripTime > 50) {
            quality = 'good';
          }
          
          participant.connectionQuality = quality;
          
          // Update voice stats
          const voiceStatsEntry = voiceStats.get(userId);
          if (voiceStatsEntry) {
            voiceStatsEntry.packetsLost = stats.packetsLost;
            voiceStatsEntry.jitter = stats.jitter;
            voiceStatsEntry.lastStatsUpdate = new Date();
          }
          
          // Notify user about poor connection
          if (quality === 'poor') {
            socket.emit('voice:connection_warning', {
              channelId,
              quality,
              suggestion: 'Try moving closer to your router or switching to a wired connection'
            });
          }
        }
      });

      // Enhanced voice status update
      socket.on('voice:status_update', async (data: {
        channelId: string;
        userId: string;
        isAudioEnabled?: boolean;
        isVideoEnabled?: boolean;
        isScreenSharing?: boolean;
      }) => {
        const { channelId, userId, isAudioEnabled, isVideoEnabled, isScreenSharing } = data;
        
        // Enhanced authorization for status updates
        const socketUserId = socketToUser.get(socket.id);
        if (!socketUserId || socketUserId !== userId) {
          return;
        }
        
        const user = onlineUsers.get(userId);
        if (!user) {
          return;
        }
        
        const channel = voiceChannels.get(channelId);
        if (channel && channel.participants.has(userId)) {
          const participant = channel.participants.get(userId)!;
          
          if (isAudioEnabled !== undefined) {
            participant.isAudioEnabled = isAudioEnabled;
            // If audio disabled, also stop speaking
            if (!isAudioEnabled) {
              participant.isSpeaking = false;
              participant.volume = 0;
            }
          }
          if (isVideoEnabled !== undefined) participant.isVideoEnabled = isVideoEnabled;
          if (isScreenSharing !== undefined) participant.isScreenSharing = isScreenSharing;
          
          const participantsList = Array.from(channel.participants.values());
          io.to(`voice:${channelId}`).emit('voice:participants_updated', {
            channelId,
            participants: participantsList,
            totalCount: participantsList.length,
            settings: channel.settings
          });
        }
      });

      // Enhanced WebRTC signaling with connection monitoring
      socket.on('webrtc:offer', (data: { offer: any; to: string; channelId?: string }) => {
        const fromUserId = socketToUser.get(socket.id);
        if (!fromUserId || !onlineUsers.has(fromUserId)) return;
        
        const toUser = onlineUsers.get(data.to);
        if (toUser) {
          io.to(toUser.socketId).emit('webrtc:offer', {
            offer: data.offer,
            from: fromUserId,
            channelId: data.channelId,
            timestamp: Date.now()
          });
        }
      });

      socket.on('webrtc:answer', (data: { answer: any; to: string; channelId?: string }) => {
        const fromUserId = socketToUser.get(socket.id);
        if (!fromUserId || !onlineUsers.has(fromUserId)) return;
        
        const toUser = onlineUsers.get(data.to);
        if (toUser) {
          io.to(toUser.socketId).emit('webrtc:answer', {
            answer: data.answer,
            from: fromUserId,
            channelId: data.channelId,
            timestamp: Date.now()
          });
        }
      });

      socket.on('webrtc:ice-candidate', (data: { candidate: any; to: string; channelId?: string }) => {
        const fromUserId = socketToUser.get(socket.id);
        if (!fromUserId || !onlineUsers.has(fromUserId)) return;
        
        const toUser = onlineUsers.get(data.to);
        if (toUser) {
          io.to(toUser.socketId).emit('webrtc:ice-candidate', {
            candidate: data.candidate,
            from: fromUserId,
            channelId: data.channelId,
            timestamp: Date.now()
          });
        }
      });

      // Typing indicators
      socket.on('typing_start', (data: { channelId: string }) => {
        const userId = socketToUser.get(socket.id);
        if (!userId || !onlineUsers.has(userId)) return;
        
        socket.to(`channel:${data.channelId}`).emit('user_typing', {
          userId,
          channelId: data.channelId
        });
      });

      socket.on('typing_stop', (data: { channelId: string }) => {
        const userId = socketToUser.get(socket.id);
        if (!userId || !onlineUsers.has(userId)) return;
        
        socket.to(`channel:${data.channelId}`).emit('user_stop_typing', {
          userId,
          channelId: data.channelId
        });
      });

      // Enhanced disconnect handler
      socket.on('disconnect', async (reason) => {
        const userId = socketToUser.get(socket.id);
        console.log(`🔌 Socket disconnected: ${socket.id} (${reason})`);
        
        if (userId) {
          const user = onlineUsers.get(userId);
          if (user && user.socketId === socket.id) {
            
            console.log(`👤 User ${user.username} going offline`);
            
            // Clean up voice channels
            for (const [channelId, channel] of voiceChannels.entries()) {
              if (channel.participants.has(userId)) {
                channel.participants.delete(userId);
                
                // Clear speaking timeout
                const timeoutKey = `${channelId}:${userId}`;
                if (speakingTimeouts.has(timeoutKey)) {
                  clearTimeout(speakingTimeouts.get(timeoutKey)!);
                  speakingTimeouts.delete(timeoutKey);
                }
                
                if (channel.participants.size === 0) {
                  voiceChannels.delete(channelId);
                } else {
                  const participantsList = Array.from(channel.participants.values());
                  io.to(`voice:${channelId}`).emit('voice:participants_updated', {
                    channelId,
                    participants: participantsList,
                    totalCount: participantsList.length,
                    settings: channel.settings
                  });
                }
              }
            }
            
            // Clean up voice stats
            voiceStats.delete(userId);
            
            // Remove from online users
            onlineUsers.delete(userId);
            socketToUser.delete(socket.id);
            
            // Update servers where user was member
            const userServersList = userServers.get(userId);
            if (userServersList) {
              for (const serverId of userServersList) {
                broadcastServerMembers(io, serverId);
              }
            }
            
            // Clean up server memberships
            if (userServersList) {
              for (const serverId of userServersList) {
                const serverMembersList = serverMembers.get(serverId);
                if (serverMembersList) {
                  serverMembersList.delete(userId);
                }
              }
              userServers.delete(userId);
            }
            
            console.log(`✅ User ${user.username} offline - cleaned up`);
          }
        }
      });
    });

    res.socket.server.io = io;
  }
  
  return res.socket.server.io;
};

// Enhanced helper function to broadcast server members
function broadcastServerMembers(io: SocketIOServer, serverId: string) {
  const memberIds = serverMembers.get(serverId) || new Set();
  const members = [];
  let onlineCount = 0;
  
  for (const userId of memberIds) {
    const user = onlineUsers.get(userId);
    if (user) {
      members.push({
        id: userId,
        name: user.username,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        avatar: user.avatar,
        email: user.email,
        status: user.status,
        role: 'member',
        joinedAt: user.connectedAt.toISOString(),
        lastSeen: user.lastSeen.toISOString()
      });
      onlineCount++;
    } else {
      members.push({
        id: userId,
        name: 'Offline User',
        username: 'Offline User',
        firstName: null,
        lastName: null,
        fullName: 'Offline User',
        avatar: null,
        email: null,
        status: 'offline',
        role: 'member',
        joinedAt: new Date().toISOString(),
        lastSeen: new Date().toISOString()
      });
    }
  }
  
  io.to(`server:${serverId}`).emit('server:members_updated', {
    serverId,
    members,
    onlineCount,
    totalCount: members.length
  });
}

// Statistics functions
export const getVoiceChannelStats = (channelId: string) => {
  const channel = voiceChannels.get(channelId);
  if (!channel) return null;
  
  const participants = Array.from(channel.participants.values());
  const speakingCount = participants.filter(p => p.isSpeaking).length;
  const avgConnectionQuality = participants.reduce((sum, p) => {
    const qualityScore = {
      excellent: 4,
      good: 3,
      fair: 2,
      poor: 1
    }[p.connectionQuality] || 0;
    return sum + qualityScore;
  }, 0) / participants.length;
  
  return {
    channelId,
    participantCount: participants.length,
    speakingCount,
    avgConnectionQuality,
    settings: channel.settings
  };
};

export const getAllVoiceStats = () => {
  const stats = [];
  for (const channelId of voiceChannels.keys()) {
    const channelStats = getVoiceChannelStats(channelId);
    if (channelStats) {
      stats.push(channelStats);
    }
  }
  return stats;
};

export { onlineUsers, socketToUser, userServers, serverMembers, voiceChannels, voiceStats };
