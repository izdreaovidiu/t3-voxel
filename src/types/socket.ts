import type { Server as NetServer } from "http";
import type { NextApiResponse } from "next";
import type { Server as SocketIOServer } from "socket.io";

export type NextApiResponseServerIo = NextApiResponse & {
  socket: {
    server: NetServer & {
      io: SocketIOServer;
    };
  };
};

export interface Message {
  id: string;
  content: string;
  channelId: string;
  createdAt: Date;
  user: {
    id: string;
    username: string;
    avatar: string | null;
  };
}

export interface VoiceParticipant {
  userId: string;
  username: string;
  avatar?: string;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  joinedAt: Date;
}

export interface ServerToClientEvents {
  // Messages
  "message:new": (message: Message) => void;
  "user_typing": (data: { userId: string; channelId: string }) => void;
  "user_stop_typing": (data: { userId: string; channelId: string }) => void;
  
  // Authentication
  "authenticated": (data: { success: boolean }) => void;
  "auth_error": (data: { error: string }) => void;
  
  // Server members
  "server:members_updated": (data: { 
    serverId: string; 
    members: any[]; 
    onlineCount: number; 
    totalCount: number; 
  }) => void;
  
  // Voice channels
  "voice:participants_updated": (data: {
    channelId: string;
    participants: VoiceParticipant[];
    totalCount: number;
  }) => void;
  
  // WebRTC signaling
  "webrtc:offer": (data: { offer: any; from: string }) => void;
  "webrtc:answer": (data: { answer: any; from: string }) => void;
  "webrtc:ice-candidate": (data: { candidate: any; from: string }) => void;
}

export interface ClientToServerEvents {
  // Authentication
  "authenticate": (data: { 
    userId: string; 
    username?: string; 
    avatar?: string; 
    email?: string;
    firstName?: string;
    lastName?: string;
  }) => void;
  
  // Server/Channel joining
  "user:join": (data: { 
    userId: string; 
    serverId?: string; 
    username?: string; 
    avatar?: string;
    firstName?: string;
    lastName?: string;
  }) => void;
  "channel:join": (data: { channelId: string; serverId?: string }) => void;
  
  // Messages
  "message:send": (data: { 
    content: string; 
    channelId: string; 
    userId: string 
  }) => void;
  
  // Typing indicators
  "typing_start": (data: { channelId: string }) => void;
  "typing_stop": (data: { channelId: string }) => void;
  
  // Voice channels
  "voice:join": (data: { 
    channelId: string; 
    userId: string; 
    username: string; 
    avatar?: string;
    callType: 'voice' | 'video' | 'screen';
  }) => void;
  "voice:leave": (data: { channelId: string; userId: string }) => void;
  "voice:status_update": (data: {
    channelId: string;
    userId: string;
    isAudioEnabled?: boolean;
    isVideoEnabled?: boolean;
    isScreenSharing?: boolean;
  }) => void;
  
  // WebRTC signaling
  "webrtc:offer": (data: { offer: any; to: string }) => void;
  "webrtc:answer": (data: { answer: any; to: string }) => void;
  "webrtc:ice-candidate": (data: { candidate: any; to: string }) => void;
  
  // Notifications
  "notifications:clear": (data: { serverId: string; userId: string }) => void;
}
