// src/server/socket/socket-server.ts - FULL FEATURED VERSION
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
  tempId?: string; // For optimistic updates
}

export type NextApiResponseServerIO = NextApiResponse & {
  socket: {
    server: HTTPServer & {
      io: SocketIOServer;
    };
  };
};

// Simple user tracking - only online users
const prisma = new PrismaClient();

// Simple user tracking - only online users
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
}>();

const socketToUser = new Map<string, string>(); // socketId -> userId
const serverMembers = new Map<string, Set<string>>(); // serverId -> Set of userIds
const userServers = new Map<string, Set<string>>(); // userId -> Set of serverIds

// Voice channel management
const voiceChannels = new Map<string, {
  participants: Map<string, {
    userId: string;
    username: string;
    avatar?: string;
    isAudioEnabled: boolean;
    isVideoEnabled: boolean;
    isScreenSharing: boolean;
    joinedAt: Date;
  }>;
}>();

export const initializeSocket = (req: NextApiRequest, res: NextApiResponseServerIO) => {
  if (!res.socket.server.io) {
    console.log('🚀 Initializing Socket.IO server...');
    
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
    });

    // Middleware for authentication
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

        // If user was already online with a different socket, disconnect the old one.
        const existingOnlineUser = onlineUsers.get(user.id);
        if (existingOnlineUser && existingOnlineUser.socketId !== socket.id) {
          const oldSocket = io.sockets.sockets.get(existingOnlineUser.socketId);
          if (oldSocket) {
            oldSocket.disconnect(true);
          }
        }

        // Attach full user profile to the socket
        socket.data.user = user;

        // Add user to online list
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
      // At this point, the user is authenticated via middleware.
      const user = socket.data.user;
      console.log(`🔌 User connected: ${user.username} (${socket.id})`);

      // When a user connects, update all servers they are a member of.
      const userServersList = userServers.get(user.userId);
      if (userServersList) {
        for (const serverId of userServersList) {
          broadcastServerMembers(io, serverId);
        }
      }

      // Server join handler
      socket.on('user:join', async (data: { 
        userId: string; 
        serverId?: string; 
        username?: string; 
        avatar?: string;
        firstName?: string;
        lastName?: string;
      }) => {
        const { userId, serverId } = data;
        
        // Check if user is authenticated
        const user = onlineUsers.get(userId);
        if (!user || user.socketId !== socket.id) {
          console.warn(`❌ Unauthorized server join: ${userId}`);
          return;
        }
        
        if (serverId) {
          socket.join(`server:${serverId}`);
          
          // Add to server members
          if (!serverMembers.has(serverId)) {
            serverMembers.set(serverId, new Set());
          }
          serverMembers.get(serverId)!.add(userId);
          
          // Add to user servers
          if (!userServers.has(userId)) {
            userServers.set(userId, new Set());
          }
          userServers.get(userId)!.add(serverId);
          
          console.log(`🏠 User ${user.fullName} joined server ${serverId}`);
          
          // Broadcast updated members
          broadcastServerMembers(io, serverId);
        }
      });

      // Channel join handler
      socket.on('channel:join', async (data: { channelId: string; serverId?: string }) => {
        const userId = socketToUser.get(socket.id);
        if (!userId || !onlineUsers.has(userId)) {
          return;
        }
        
        socket.join(`channel:${data.channelId}`);
        console.log(`📱 User ${userId} joined channel ${data.channelId}`);
      });

      // Message handler with acknowledgment
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
              authorId: user.id, // Use the internal DB user ID from the authenticated socket
            },
            include: {
              author: true, // Include user data for broadcasting
            },
          });

          // Format message for broadcast
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

          // Broadcast the new message to the channel
          io.to(`channel:${channelId}`).emit('message:new', broadcastMessage);

          // Acknowledge the message was received and saved
          callback({ success: true, message: broadcastMessage });

        } catch (error) {
          console.error('Error saving message:', error);
          callback({ success: false, error: 'Failed to save message' });
        }
      });

      // Voice channel handlers
      socket.on('voice:join', async (data: { 
        channelId: string; 
        userId: string; 
        username: string; 
        avatar?: string;
        callType: 'voice' | 'video' | 'screen';
      }) => {
        const { channelId, userId, callType } = data;
        
        const user = onlineUsers.get(userId);
        if (!user || user.socketId !== socket.id) {
          return;
        }
        
        if (!voiceChannels.has(channelId)) {
          voiceChannels.set(channelId, { participants: new Map() });
        }
        
        const channel = voiceChannels.get(channelId)!;
        
        channel.participants.set(userId, {
          userId,
          username: user.username,
          avatar: user.avatar,
          isAudioEnabled: true,
          isVideoEnabled: callType === 'video',
          isScreenSharing: callType === 'screen',
          joinedAt: new Date()
        });
        
        socket.join(`voice:${channelId}`);
        
        const participantsList = Array.from(channel.participants.values());
        io.to(`voice:${channelId}`).emit('voice:participants_updated', {
          channelId,
          participants: participantsList,
          totalCount: participantsList.length
        });
        
        console.log(`🎤 User ${user.username} joined voice channel ${channelId} (${callType})`);
      });

      socket.on('voice:leave', async (data: { channelId: string; userId: string }) => {
        const { channelId, userId } = data;
        
        const user = onlineUsers.get(userId);
        if (!user || user.socketId !== socket.id) {
          return;
        }
        
        const channel = voiceChannels.get(channelId);
        if (channel && channel.participants.has(userId)) {
          channel.participants.delete(userId);
          socket.leave(`voice:${channelId}`);
          
          if (channel.participants.size === 0) {
            voiceChannels.delete(channelId);
          }
          
          const participantsList = Array.from(channel.participants.values());
          io.to(`voice:${channelId}`).emit('voice:participants_updated', {
            channelId,
            participants: participantsList,
            totalCount: participantsList.length
          });
          
          console.log(`🎤 User left voice channel ${channelId}`);
        }
      });

      socket.on('voice:status_update', async (data: {
        channelId: string;
        userId: string;
        isAudioEnabled?: boolean;
        isVideoEnabled?: boolean;
        isScreenSharing?: boolean;
      }) => {
        const { channelId, userId, isAudioEnabled, isVideoEnabled, isScreenSharing } = data;
        
        const user = onlineUsers.get(userId);
        if (!user || user.socketId !== socket.id) {
          return;
        }
        
        const channel = voiceChannels.get(channelId);
        if (channel && channel.participants.has(userId)) {
          const participant = channel.participants.get(userId)!;
          
          if (isAudioEnabled !== undefined) participant.isAudioEnabled = isAudioEnabled;
          if (isVideoEnabled !== undefined) participant.isVideoEnabled = isVideoEnabled;
          if (isScreenSharing !== undefined) participant.isScreenSharing = isScreenSharing;
          
          const participantsList = Array.from(channel.participants.values());
          io.to(`voice:${channelId}`).emit('voice:participants_updated', {
            channelId,
            participants: participantsList,
            totalCount: participantsList.length
          });
        }
      });

      // WebRTC signaling
      socket.on('webrtc:offer', (data: { offer: any; to: string }) => {
        const fromUserId = socketToUser.get(socket.id);
        if (!fromUserId || !onlineUsers.has(fromUserId)) return;
        
        const toUser = onlineUsers.get(data.to);
        if (toUser) {
          io.to(toUser.socketId).emit('webrtc:offer', {
            offer: data.offer,
            from: fromUserId
          });
        }
      });

      socket.on('webrtc:answer', (data: { answer: any; to: string }) => {
        const fromUserId = socketToUser.get(socket.id);
        if (!fromUserId || !onlineUsers.has(fromUserId)) return;
        
        const toUser = onlineUsers.get(data.to);
        if (toUser) {
          io.to(toUser.socketId).emit('webrtc:answer', {
            answer: data.answer,
            from: fromUserId
          });
        }
      });

      socket.on('webrtc:ice-candidate', (data: { candidate: any; to: string }) => {
        const fromUserId = socketToUser.get(socket.id);
        if (!fromUserId || !onlineUsers.has(fromUserId)) return;
        
        const toUser = onlineUsers.get(data.to);
        if (toUser) {
          io.to(toUser.socketId).emit('webrtc:ice-candidate', {
            candidate: data.candidate,
            from: fromUserId
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

      // Disconnect handler
      socket.on('disconnect', async () => {
        const userId = socketToUser.get(socket.id);
        console.log(`🔌 Socket disconnected: ${socket.id}`);
        
        if (userId) {
          const user = onlineUsers.get(userId);
          if (user && user.socketId === socket.id) {
            
            console.log(`👤 User ${user.username} going offline`);
            
            // Remove from online users
            onlineUsers.delete(userId);
            socketToUser.delete(socket.id);
            
            // Remove from voice channels
            for (const [channelId, channel] of voiceChannels.entries()) {
              if (channel.participants.has(userId)) {
                channel.participants.delete(userId);
                
                if (channel.participants.size === 0) {
                  voiceChannels.delete(channelId);
                } else {
                  const participantsList = Array.from(channel.participants.values());
                  io.to(`voice:${channelId}`).emit('voice:participants_updated', {
                    channelId,
                    participants: participantsList,
                    totalCount: participantsList.length
                  });
                }
              }
            }
            
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

// Helper function to broadcast server members
function broadcastServerMembers(io: SocketIOServer, serverId: string) {
  const memberIds = serverMembers.get(serverId) || new Set();
  const members = [];
  let onlineCount = 0;
  
  for (const userId of memberIds) {
    const user = onlineUsers.get(userId);
    if (user) {
      // User is online
      members.push({
        id: userId,
        name: user.username,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        avatar: user.avatar,
        email: user.email,
        status: 'online',
        role: 'member',
        joinedAt: user.connectedAt.toISOString()
      });
      onlineCount++;
    } else {
      // User is offline (not in onlineUsers)
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
        joinedAt: new Date().toISOString()
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

export { onlineUsers, socketToUser, userServers, serverMembers, voiceChannels };
