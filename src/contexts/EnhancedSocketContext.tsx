"use client";
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useCallback,
  useState,
} from "react";
import { io, Socket } from "socket.io-client";
import { useUser } from "@clerk/nextjs";

interface VoiceParticipant {
  userId: string;
  username: string;
  avatar?: string;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  isSpeaking: boolean;
  volume: number;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
  joinedAt: Date;
  lastSpeakingUpdate: Date;
}

interface VoiceChannelSettings {
  maxParticipants: number;
  allowVideo: boolean;
  allowScreenShare: boolean;
  isLocked: boolean;
}

interface Message {
  id: string;
  content: string;
  channelId: string;
  userId: string;
  username: string;
  avatar?: string;
  createdAt: string;
  updatedAt?: string;
  reactions?: Array<{
    emoji: string;
    count: number;
    users: string[];
  }>;
}

interface EnhancedSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'failed';
  
  // Voice channel data with enhanced features
  voiceChannelData: { 
    [channelId: string]: {
      participants: VoiceParticipant[];
      settings: VoiceChannelSettings;
      totalCount: number;
      speakingCount: number;
      videoCount: number;
      screenShareCount: number;
    }
  };
  
  serverMembers: { [serverId: string]: any[] };
  userStatus: 'online' | 'idle' | 'dnd' | 'invisible';

  // Enhanced methods
  joinServer: (serverId: string) => void;
  joinChannel: (channelId: string, serverId?: string) => void;
  sendMessage: (content: string, channelId: string, tempId?: string) => Promise<{ 
    success: boolean; 
    message?: any; 
    error?: string 
  }>;
  
  // Enhanced voice channel methods
  joinVoiceChannel: (
    channelId: string,
    callType?: "voice" | "video" | "screen",
    quality?: "auto" | "high" | "medium" | "low"
  ) => void;
  leaveVoiceChannel: (channelId: string) => void;
  updateVoiceStatus: (channelId: string, status: Partial<{
    isAudioEnabled: boolean;
    isVideoEnabled: boolean;
    isScreenSharing: boolean;
  }>) => void;
  updateSpeakingStatus: (channelId: string, isSpeaking: boolean, volume: number, audioLevel?: number) => void;
  reportConnectionStats: (channelId: string, stats: {
    packetsLost: number;
    jitter: number;
    bitrate: number;
    roundTripTime: number;
  }) => void;
  
  // Voice channel getters
  getVoiceChannelData: (channelId: string) => {
    participants: VoiceParticipant[];
    settings: VoiceChannelSettings;
    totalCount: number;
    speakingCount: number;
    videoCount: number;
    screenShareCount: number;
  } | null;
  isInVoiceChannel: (channelId: string) => boolean;
  
  // Server members methods
  getServerMembers: (serverId: string) => any[];
  getServerOnlineCount: (serverId: string) => number;
  updateUserStatus: (status: 'online' | 'idle' | 'dnd' | 'invisible') => void;

  // Event subscriptions
  subscribeToMessages: (listener: (message: any) => void) => () => void;
  subscribeToServerMembers: (listener: (data: any) => void) => () => void;
  subscribeToVoiceUpdates: (channelId: string, listener: (data: any) => void) => () => void;
  subscribeToSpeakingUpdates: (channelId: string, listener: (data: any) => void) => () => void;
  subscribeToConnectionWarnings: (listener: (data: any) => void) => () => void;

  // Typing indicators
  startTyping: (channelId: string) => void;
  stopTyping: (channelId: string) => void;

  // Connection management
  forceReconnect: () => void;
  getConnectionInfo: () => {
    isConnected: boolean;
    transport: string;
    pingTimeout: number;
    reconnectAttempts: number;
    latency?: number;
  };
  clearNotifications: (serverId: string) => void;
}

const EnhancedSocketContext = createContext<EnhancedSocketContextType | null>(null);

// Enhanced connection configuration
const ENHANCED_SOCKET_CONFIG = {
  path: "/api/socket/io",
  transports: ['polling', 'websocket'],
  upgrade: true,
  rememberUpgrade: true,
  reconnection: true,
  reconnectionAttempts: 15,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  maxHttpBufferSize: 1e8, // 100MB for enhanced features
  pingTimeout: 60000,
  pingInterval: 25000,
  timeout: 20000,
  forceNew: false,
};

let globalSocket: Socket | null = null;
let reconnectAttempts = 0;
let maxReconnectAttempts = 15;
let lastPingTime = 0;
let currentLatency = 0;

const debug = (message: string, ...args: any[]) => {
  const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
  console.log(`[${timestamp}] [EnhancedSocket] ${message}`, ...args);
};

export const EnhancedSocketProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'failed'>('disconnected');
  const [voiceChannelData, setVoiceChannelData] = useState<{
    [channelId: string]: {
      participants: VoiceParticipant[];
      settings: VoiceChannelSettings;
      totalCount: number;
      speakingCount: number;
      videoCount: number;
      screenShareCount: number;
    }
  }>({});
  const [serverMembers, setServerMembers] = useState<{
    [serverId: string]: any[];
  }>({});
  const [userStatus, setUserStatus] = useState<'online' | 'idle' | 'dnd' | 'invisible'>('online');

  // Event listeners
  const messageListeners = useRef<Set<(message: any) => void>>(new Set());
  const serverMembersListeners = useRef<Set<(data: any) => void>>(new Set());
  const voiceUpdateListeners = useRef<Map<string, Set<(data: any) => void>>>(new Map());
  const speakingUpdateListeners = useRef<Map<string, Set<(data: any) => void>>>(new Map());
  const connectionWarningListeners = useRef<Set<(data: any) => void>>(new Set());
  
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectionCheckRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const { user, isLoaded } = useUser();

  // Enhanced connection establishment
  const establishConnection = useCallback(async (forceNew: boolean = false) => {
    if (!isLoaded || !user) {
      debug("User not loaded or not authenticated");
      return;
    }

    if (globalSocket && (forceNew || globalSocket.auth?.clerkId !== user.id)) {
      debug("Cleaning up existing socket connection...");
      globalSocket.removeAllListeners();
      globalSocket.disconnect();
      globalSocket = null;
      setIsConnected(false);
      setConnectionState('disconnected');
    }

    if (globalSocket?.connected && globalSocket.auth?.clerkId === user.id && !forceNew) {
      debug("Socket already connected for current user");
      setIsConnected(true);
      setConnectionState('connected');
      return;
    }

    try {
      debug("Establishing enhanced socket connection...");
      setConnectionState('connecting');
      
      // Wake up the serverless function
      try {
        await fetch('/api/socket/io', { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'init' })
        });
        debug("Enhanced socket server awakened successfully");
      } catch (wakeError) {
        debug("Failed to wake socket server (non-critical):", wakeError);
      }

      // Enhanced auth object
      const authData = {
        clerkId: user.id,
        username: user.username || user.firstName || user.emailAddresses[0]?.emailAddress?.split('@')[0] || 'User',
        email: user.primaryEmailAddress?.emailAddress,
        avatar: user.imageUrl,
        firstName: user.firstName,
        lastName: user.lastName,
        timestamp: Date.now(),
        capabilities: {
          voiceChannel: true,
          speakingDetection: true,
          connectionMonitoring: true,
          enhancedFeatures: true,
        }
      };

      debug("Creating enhanced socket with auth:", { ...authData, clerkId: '***' });

      globalSocket = io({
        ...ENHANCED_SOCKET_CONFIG,
        auth: authData,
      });

      // Enhanced event handlers
      globalSocket.on("connect", () => {
        debug("✅ Enhanced socket connected successfully:", {
          id: globalSocket?.id,
          transport: globalSocket?.io.engine.transport.name,
          upgraded: globalSocket?.io.engine.upgraded
        });
        
        setIsConnected(true);
        setConnectionState('connected');
        reconnectAttempts = 0;

        // Start enhanced heartbeat
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }
        heartbeatIntervalRef.current = setInterval(() => {
          if (globalSocket?.connected) {
            lastPingTime = Date.now();
            globalSocket.emit('ping', lastPingTime);
          }
        }, 30000);
      });

      globalSocket.on("disconnect", (reason, details) => {
        debug(`❌ Enhanced socket disconnected: ${reason}`, details);
        setIsConnected(false);
        
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }

        switch (reason) {
          case 'io server disconnect':
            setConnectionState('failed');
            break;
          case 'io client disconnect':
            setConnectionState('disconnected');
            break;
          default:
            setConnectionState('reconnecting');
        }
      });

      globalSocket.on("connect_error", (error) => {
        debug(`🔌 Enhanced socket connection error:`, error);
        reconnectAttempts++;
        
        if (reconnectAttempts >= maxReconnectAttempts) {
          setConnectionState('failed');
          globalSocket?.disconnect();
        } else {
          setConnectionState('reconnecting');
        }
      });

      // Enhanced pong handler with latency calculation
      globalSocket.on("pong", (timestamp: number) => {
        if (timestamp === lastPingTime) {
          currentLatency = Date.now() - timestamp;
          debug(`🏓 Pong received, latency: ${currentLatency}ms`);
        }
      });

      // Enhanced voice participants handler
      globalSocket.on("voice:participants_updated", (data: { 
        channelId: string; 
        participants: VoiceParticipant[];
        settings: VoiceChannelSettings;
        totalCount: number;
      }) => {
        debug("🎤 Enhanced voice participants updated:", { 
          channelId: data.channelId, 
          count: data.participants?.length,
          speaking: data.participants?.filter(p => p.isSpeaking).length
        });
        
        const speakingCount = data.participants.filter(p => p.isSpeaking).length;
        const videoCount = data.participants.filter(p => p.isVideoEnabled).length;
        const screenShareCount = data.participants.filter(p => p.isScreenSharing).length;
        
        setVoiceChannelData(prev => ({
          ...prev,
          [data.channelId]: {
            participants: data.participants,
            settings: data.settings,
            totalCount: data.totalCount,
            speakingCount,
            videoCount,
            screenShareCount,
          }
        }));
        
        // Notify voice update listeners
        const listeners = voiceUpdateListeners.current.get(data.channelId);
        if (listeners) {
          listeners.forEach(listener => listener(data));
        }
      });

      // Speaking update handler
      globalSocket.on("voice:speaking_update", (data: {
        userId: string;
        isSpeaking: boolean;
        volume: number;
        audioLevel?: number;
      }) => {
        debug("🗣️ Speaking update:", data);
        
        // Update voice channel data
        setVoiceChannelData(prev => {
          const updated = { ...prev };
          Object.keys(updated).forEach(channelId => {
            const channel = updated[channelId];
            const participantIndex = channel.participants.findIndex(p => p.userId === data.userId);
            if (participantIndex !== -1) {
              const participants = [...channel.participants];
              participants[participantIndex] = {
                ...participants[participantIndex],
                isSpeaking: data.isSpeaking,
                volume: data.volume,
                lastSpeakingUpdate: new Date(),
              };
              
              const speakingCount = participants.filter(p => p.isSpeaking).length;
              
              updated[channelId] = {
                ...channel,
                participants,
                speakingCount,
              };
              
              // Notify speaking update listeners for this channel
              const listeners = speakingUpdateListeners.current.get(channelId);
              if (listeners) {
                listeners.forEach(listener => listener({ ...data, channelId }));
              }
            }
          });
          return updated;
        });
      });

      // Connection warning handler
      globalSocket.on("voice:connection_warning", (data: {
        channelId: string;
        quality: 'excellent' | 'good' | 'fair' | 'poor';
        suggestion: string;
      }) => {
        debug("⚠️ Connection warning:", data);
        connectionWarningListeners.current.forEach(listener => listener(data));
      });

      // Connection info handler
      globalSocket.on("voice:connection_info", (data: {
        channelId: string;
        quality: string;
        maxBitrate: number;
        sampleRate: number;
      }) => {
        debug("📊 Voice connection info:", data);
      });

      // Join failed handler
      globalSocket.on("voice:join_failed", (data: {
        channelId: string;
        reason: string;
        maxParticipants?: number;
      }) => {
        debug("❌ Voice join failed:", data);
        // Could emit a toast notification here
      });

      // Enhanced message handler
      globalSocket.on("message:new", (message: Message) => {
        debug("📨 Enhanced message received:", { id: message.id, channelId: message.channelId });
        messageListeners.current.forEach((listener) => listener(message));
      });

      // Enhanced server members handler
      globalSocket.on("server:members_updated", (data) => {
        debug("👥 Enhanced server members updated:", { 
          serverId: data.serverId, 
          count: data.members?.length,
          online: data.onlineCount 
        });
        setServerMembers((prev) => ({ ...prev, [data.serverId]: data.members }));
        serverMembersListeners.current.forEach((listener) => listener(data));
      });

      // Connection superseded handler
      globalSocket.on("connection:superseded", (data) => {
        debug("🔄 Connection superseded:", data);
        setConnectionState('disconnected');
      });

      // Standard typing indicators
      globalSocket.on("user_typing", (data) => {
        // Handle typing indicator
      });

      globalSocket.on("user_stop_typing", (data) => {
        // Handle stop typing indicator
      });

      debug("Enhanced socket instance created and event listeners attached");

    } catch (error) {
      debug("❌ Failed to create enhanced socket:", error);
      setConnectionState('failed');
    }
  }, [isLoaded, user]);

  // Initialize connection
  useEffect(() => {
    establishConnection();
    
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (connectionCheckRef.current) {
        clearInterval(connectionCheckRef.current);
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      
      if (globalSocket) {
        debug("🧹 Cleaning up enhanced socket connection on unmount");
        globalSocket.removeAllListeners();
        globalSocket.disconnect();
        globalSocket = null;
        setIsConnected(false);
        setConnectionState('disconnected');
      }
    };
  }, [establishConnection]);

  // Enhanced socket methods
  const joinServer = useCallback((serverId: string) => {
    if (globalSocket?.connected && user?.id) {
      debug(`🏠 Joining server: ${serverId}`);
      globalSocket.emit("user:join", {
        userId: user.id,
        serverId,
        username: user.username || user.firstName || "Unknown",
        avatar: user.imageUrl,
        firstName: user.firstName,
        lastName: user.lastName,
      });
    }
  }, [user]);

  const joinChannel = useCallback((channelId: string, serverId?: string) => {
    if (globalSocket?.connected) {
      debug(`📱 Joining channel: ${channelId}`);
      globalSocket.emit("channel:join", { channelId, serverId });
    }
  }, []);

  const sendMessage = useCallback((content: string, channelId: string, tempId?: string): Promise<{ success: boolean; message?: any; error?: string }> => {
    return new Promise((resolve) => {
      if (!globalSocket?.connected || !user?.id) {
        resolve({ success: false, error: "Not connected or authenticated" });
        return;
      }

      const trimmedContent = content.trim();
      if (!trimmedContent) {
        resolve({ success: false, error: "Message cannot be empty" });
        return;
      }

      let hasResolved = false;
      const messageData = {
        content: trimmedContent,
        channelId,
        tempId: tempId || `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId: user.id,
        username: user.username || user.firstName || "Unknown",
        avatar: user.imageUrl,
        timestamp: Date.now(),
      };
      
      try {
        globalSocket.emit("message:send", messageData, (response: { success: boolean; message?: any; error?: string }) => {
          if (hasResolved) return;
          hasResolved = true;
          resolve(response?.success ? response : { success: false, error: response?.error || "Failed to send message" });
        });
      } catch (error) {
        if (!hasResolved) {
          hasResolved = true;
          resolve({ success: false, error: "Failed to emit message" });
        }
      }
      
      setTimeout(() => {
        if (!hasResolved) {
          hasResolved = true;
          resolve({ success: false, error: "Message send timeout" });
        }
      }, 15000);
    });
  }, [user]);

  // Enhanced voice channel methods
  const joinVoiceChannel = useCallback((
    channelId: string,
    callType: "voice" | "video" | "screen" = "voice",
    quality: "auto" | "high" | "medium" | "low" = "auto"
  ) => {
    if (globalSocket?.connected && user?.id) {
      debug(`🎤 Joining enhanced voice channel: ${channelId} (${callType}, ${quality})`);
      globalSocket.emit("voice:join", {
        channelId,
        userId: user.id,
        username: user.username || user.firstName || "Unknown",
        avatar: user.imageUrl,
        callType,
        quality,
        timestamp: Date.now(),
      });
    }
  }, [user]);

  const leaveVoiceChannel = useCallback((channelId: string) => {
    if (globalSocket?.connected && user?.id) {
      debug(`🎤 Leaving enhanced voice channel: ${channelId}`);
      globalSocket.emit("voice:leave", {
        channelId,
        userId: user.id,
        timestamp: Date.now(),
      });

      // Clear local voice channel data
      setVoiceChannelData(prev => {
        const updated = { ...prev };
        delete updated[channelId];
        return updated;
      });
    }
  }, [user?.id]);

  const updateVoiceStatus = useCallback((channelId: string, status: Partial<{
    isAudioEnabled: boolean;
    isVideoEnabled: boolean;
    isScreenSharing: boolean;
  }>) => {
    if (globalSocket?.connected && user?.id) {
      debug(`🎤 Updating enhanced voice status for channel: ${channelId}`, status);
      globalSocket.emit("voice:status_update", {
        channelId,
        userId: user.id,
        timestamp: Date.now(),
        ...status,
      });
    }
  }, [user?.id]);

  const updateSpeakingStatus = useCallback((channelId: string, isSpeaking: boolean, volume: number, audioLevel?: number) => {
    if (globalSocket?.connected && user?.id) {
      globalSocket.emit("voice:speaking_update", {
        channelId,
        userId: user.id,
        isSpeaking,
        volume,
        audioLevel,
        timestamp: Date.now(),
      });
    }
  }, [user?.id]);

  const reportConnectionStats = useCallback((channelId: string, stats: {
    packetsLost: number;
    jitter: number;
    bitrate: number;
    roundTripTime: number;
  }) => {
    if (globalSocket?.connected && user?.id) {
      globalSocket.emit("voice:connection_stats", {
        channelId,
        userId: user.id,
        stats,
        timestamp: Date.now(),
      });
    }
  }, [user?.id]);

  const updateUserStatus = useCallback((status: 'online' | 'idle' | 'dnd' | 'invisible') => {
    if (globalSocket?.connected) {
      debug(`👤 Updating user status: ${status}`);
      globalSocket.emit("user:status_update", { status });
      setUserStatus(status);
    }
  }, []);

  // Enhanced getters
  const getVoiceChannelData = useCallback((channelId: string) => {
    return voiceChannelData[channelId] || null;
  }, [voiceChannelData]);

  const isInVoiceChannel = useCallback((channelId: string): boolean => {
    const channel = voiceChannelData[channelId];
    return channel ? channel.participants.some(p => p.userId === user?.id) : false;
  }, [voiceChannelData, user?.id]);

  const getServerMembers = useCallback((serverId: string) => {
    return serverMembers[serverId] || [];
  }, [serverMembers]);

  const getServerOnlineCount = useCallback((serverId: string) => {
    const members = serverMembers[serverId] || [];
    return members.filter(member => member.status !== 'offline').length;
  }, [serverMembers]);

  // Enhanced subscription methods
  const subscribeToMessages = useCallback((listener: (message: any) => void) => {
    messageListeners.current.add(listener);
    return () => messageListeners.current.delete(listener);
  }, []);

  const subscribeToServerMembers = useCallback((listener: (data: any) => void) => {
    serverMembersListeners.current.add(listener);
    return () => serverMembersListeners.current.delete(listener);
  }, []);

  const subscribeToVoiceUpdates = useCallback((channelId: string, listener: (data: any) => void) => {
    if (!voiceUpdateListeners.current.has(channelId)) {
      voiceUpdateListeners.current.set(channelId, new Set());
    }
    voiceUpdateListeners.current.get(channelId)!.add(listener);
    return () => {
      const listeners = voiceUpdateListeners.current.get(channelId);
      if (listeners) {
        listeners.delete(listener);
        if (listeners.size === 0) {
          voiceUpdateListeners.current.delete(channelId);
        }
      }
    };
  }, []);

  const subscribeToSpeakingUpdates = useCallback((channelId: string, listener: (data: any) => void) => {
    if (!speakingUpdateListeners.current.has(channelId)) {
      speakingUpdateListeners.current.set(channelId, new Set());
    }
    speakingUpdateListeners.current.get(channelId)!.add(listener);
    return () => {
      const listeners = speakingUpdateListeners.current.get(channelId);
      if (listeners) {
        listeners.delete(listener);
        if (listeners.size === 0) {
          speakingUpdateListeners.current.delete(channelId);
        }
      }
    };
  }, []);

  const subscribeToConnectionWarnings = useCallback((listener: (data: any) => void) => {
    connectionWarningListeners.current.add(listener);
    return () => connectionWarningListeners.current.delete(listener);
  }, []);

  // Standard methods
  const startTyping = useCallback((channelId: string) => {
    if (globalSocket?.connected) {
      globalSocket.emit("typing_start", { channelId, timestamp: Date.now() });
    }
  }, []);

  const stopTyping = useCallback((channelId: string) => {
    if (globalSocket?.connected) {
      globalSocket.emit("typing_stop", { channelId, timestamp: Date.now() });
    }
  }, []);

  const forceReconnect = useCallback(() => {
    debug("🔄 Force reconnecting enhanced socket...");
    establishConnection(true);
  }, [establishConnection]);

  const getConnectionInfo = useCallback(() => {
    return {
      isConnected: !!globalSocket?.connected,
      transport: globalSocket?.io.engine.transport.name || 'unknown',
      pingTimeout: globalSocket?.io.opts.timeout || 0,
      reconnectAttempts: reconnectAttempts,
      latency: currentLatency,
    };
  }, []);

  const clearNotifications = useCallback((serverId: string) => {
    if (globalSocket?.connected && user?.id) {
      globalSocket.emit("notifications:clear", {
        serverId,
        userId: user.id,
      });
    }
  }, [user?.id]);

  const value: EnhancedSocketContextType = {
    socket: globalSocket,
    isConnected,
    connectionState,
    voiceChannelData,
    serverMembers,
    userStatus,

    // Methods
    joinServer,
    joinChannel,
    sendMessage,
    subscribeToMessages,
    subscribeToServerMembers,

    // Enhanced voice channel methods
    joinVoiceChannel,
    leaveVoiceChannel,
    updateVoiceStatus,
    updateSpeakingStatus,
    reportConnectionStats,
    getVoiceChannelData,
    isInVoiceChannel,
    subscribeToVoiceUpdates,
    subscribeToSpeakingUpdates,
    subscribeToConnectionWarnings,

    // Server members methods
    getServerMembers,
    getServerOnlineCount,
    updateUserStatus,

    // Typing indicators
    startTyping,
    stopTyping,

    // Connection management
    forceReconnect,
    getConnectionInfo,
    clearNotifications,
  };

  return (
    <EnhancedSocketContext.Provider value={value}>
      {children}
    </EnhancedSocketContext.Provider>
  );
};

export const useEnhancedSocketContext = () => {
  const context = useContext(EnhancedSocketContext);
  if (!context) {
    throw new Error("useEnhancedSocketContext must be used within an EnhancedSocketProvider");
  }
  return context;
};

// Backward compatibility
export const useSocketContext = useEnhancedSocketContext;
export const SocketProvider = EnhancedSocketProvider;
