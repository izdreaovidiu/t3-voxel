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
  status: {
    isAudioEnabled: boolean;
    isVideoEnabled: boolean;
    isScreenSharing: boolean;
  };
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

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'failed';
  voiceChannelData: { [channelId: string]: VoiceParticipant[] };
  serverMembers: { [serverId: string]: any[] };
  userStatus: string;

  // Methods
  joinServer: (serverId: string) => void;
  joinChannel: (channelId: string, serverId?: string) => void;
  sendMessage: (content: string, channelId: string, tempId?: string) => Promise<{ 
    success: boolean; 
    message?: any; 
    error?: string 
  }>;
  subscribeToMessages: (listener: (message: any) => void) => () => void;
  subscribeToServerMembers: (listener: (data: any) => void) => () => void;
  clearNotifications: (serverId: string) => void;

  // Voice channel methods
  joinVoiceChannel: (
    channelId: string,
    callType?: "voice" | "video" | "screen",
  ) => void;
  leaveVoiceChannel: (channelId: string) => void;
  updateVoiceStatus: (channelId: string, status: any) => void;
  getVoiceChannelParticipants: (channelId: string) => VoiceParticipant[];
  isInVoiceChannel: (channelId: string) => boolean;
  getVoiceChannelCount: (channelId: string) => number;

  // Server members methods
  getServerMembers: (serverId: string) => any[];
  getServerOnlineCount: (serverId: string) => number;

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
  };
}

const SocketContext = createContext<SocketContextType | null>(null);

// Enhanced connection configuration
const SOCKET_CONFIG = {
  path: "/api/socket/io",
  transports: ['polling', 'websocket'], // Start with polling, upgrade to websocket
  upgrade: true,
  rememberUpgrade: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  maxHttpBufferSize: 1e6,
  pingTimeout: 60000,
  pingInterval: 25000,
  timeout: 20000,
  forceNew: false,
};

// Global socket instance with enhanced management
let globalSocket: Socket | null = null;
let reconnectAttempts = 0;
let maxReconnectAttempts = 10;

const debug = (message: string, ...args: any[]) => {
  const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
  console.log(`[${timestamp}] [Socket] ${message}`, ...args);
};

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'failed'>('disconnected');
  const [voiceChannelData, setVoiceChannelData] = useState<{
    [channelId: string]: VoiceParticipant[];
  }>({});
  const [serverMembers, setServerMembers] = useState<{
    [serverId: string]: any[];
  }>({});

  const messageListeners = useRef<Set<(message: any) => void>>(new Set());
  const serverMembersListeners = useRef<Set<(data: any) => void>>(new Set());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectionCheckRef = useRef<NodeJS.Timeout | null>(null);
  const { user, isLoaded } = useUser();

  // Enhanced connection establishment
  const establishConnection = useCallback(async (forceNew: boolean = false) => {
    if (!isLoaded || !user) {
      debug("User not loaded or not authenticated");
      return;
    }

    // Clean up existing connection if forcing new or different user
    if (globalSocket && (forceNew || globalSocket.auth?.clerkId !== user.id)) {
      debug("Cleaning up existing socket connection...");
      globalSocket.removeAllListeners();
      globalSocket.disconnect();
      globalSocket = null;
      setIsConnected(false);
      setConnectionState('disconnected');
    }

    // If already connected to the same user, don't reconnect
    if (globalSocket?.connected && globalSocket.auth?.clerkId === user.id && !forceNew) {
      debug("Socket already connected for current user");
      setIsConnected(true);
      setConnectionState('connected');
      return;
    }

    try {
      debug("Establishing new socket connection...");
      setConnectionState('connecting');
      
      // Wake up the serverless function first
      try {
        await fetch('/api/socket/io', { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'init' })
        });
        debug("Socket server awakened successfully");
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
      };

      debug("Creating socket with auth:", { ...authData, clerkId: '***' });

      // Create socket with enhanced configuration
      globalSocket = io({
        ...SOCKET_CONFIG,
        auth: authData,
      });

      // Enhanced event handlers
      globalSocket.on("connect", () => {
        debug("✅ Socket connected successfully:", {
          id: globalSocket?.id,
          transport: globalSocket?.io.engine.transport.name,
          upgraded: globalSocket?.io.engine.upgraded
        });
        
        setIsConnected(true);
        setConnectionState('connected');
        reconnectAttempts = 0;

        // Start connection health check
        if (connectionCheckRef.current) {
          clearInterval(connectionCheckRef.current);
        }
        connectionCheckRef.current = setInterval(() => {
          if (globalSocket?.connected) {
            globalSocket.emit('ping', Date.now());
          }
        }, 30000);
      });

      globalSocket.on("disconnect", (reason, details) => {
        debug(`❌ Socket disconnected: ${reason}`, details);
        setIsConnected(false);
        
        if (connectionCheckRef.current) {
          clearInterval(connectionCheckRef.current);
          connectionCheckRef.current = null;
        }

        // Handle different disconnect reasons
        switch (reason) {
          case 'io server disconnect':
            setConnectionState('failed');
            debug("Server initiated disconnect - will not auto-reconnect");
            break;
          case 'io client disconnect':
            setConnectionState('disconnected');
            debug("Client initiated disconnect");
            break;
          case 'ping timeout':
          case 'transport close':
          case 'transport error':
            setConnectionState('reconnecting');
            debug("Connection lost - attempting to reconnect...");
            break;
          default:
            setConnectionState('reconnecting');
            debug("Unknown disconnect reason - attempting to reconnect...");
        }
      });

      globalSocket.on("connect_error", (error) => {
        debug(`🔌 Socket connection error:`, {
          message: error.message,
          description: error.description,
          context: error.context,
          type: error.type
        });
        
        reconnectAttempts++;
        
        if (reconnectAttempts >= maxReconnectAttempts) {
          debug("Max reconnection attempts reached");
          setConnectionState('failed');
          globalSocket?.disconnect();
        } else {
          setConnectionState('reconnecting');
          debug(`Reconnection attempt ${reconnectAttempts}/${maxReconnectAttempts}`);
        }
      });

      globalSocket.on("reconnect", (attemptNumber) => {
        debug(`🔄 Socket reconnected after ${attemptNumber} attempts`);
        setIsConnected(true);
        setConnectionState('connected');
        reconnectAttempts = 0;
      });

      globalSocket.on("reconnect_attempt", (attemptNumber) => {
        debug(`🔄 Reconnection attempt ${attemptNumber}`);
        setConnectionState('reconnecting');
      });

      globalSocket.on("reconnect_error", (error) => {
        debug(`❌ Reconnection error:`, error);
        setConnectionState('reconnecting');
      });

      globalSocket.on("reconnect_failed", () => {
        debug("❌ Reconnection failed after all attempts");
        setConnectionState('failed');
      });

      // Enhanced transport handling
      globalSocket.io.on("upgrade", (transport) => {
        debug(`🚀 Transport upgraded to: ${transport.name}`);
      });

      globalSocket.io.on("upgradeError", (error) => {
        debug(`❌ Transport upgrade error:`, error);
      });

      // Pong handler for connection health check
      globalSocket.on("pong", (timestamp) => {
        const latency = Date.now() - timestamp;
        debug(`🏓 Pong received, latency: ${latency}ms`);
      });

      // Application event listeners
      globalSocket.on("message:new", (message: Message) => {
        debug("📨 New message received:", { id: message.id, channelId: message.channelId });
        messageListeners.current.forEach((listener) => listener(message));
      });

      globalSocket.on("server:members_updated", (data) => {
        debug("👥 Server members updated:", { serverId: data.serverId, count: data.members?.length });
        setServerMembers((prev) => ({ ...prev, [data.serverId]: data.members }));
        serverMembersListeners.current.forEach((listener) => listener(data));
      });

      globalSocket.on("voice:participants_updated", (data: { channelId: string; participants: VoiceParticipant[] }) => {
        debug("🎤 Voice participants updated:", { channelId: data.channelId, count: data.participants?.length });
        setVoiceChannelData((prev) => ({ ...prev, [data.channelId]: data.participants }));
      });

      // Error handlers
      globalSocket.on("error", (error) => {
        debug("❌ Socket error:", error);
      });

      globalSocket.on("connect_timeout", () => {
        debug("⏰ Connection timeout");
        setConnectionState('failed');
      });

      debug("Socket instance created and event listeners attached");

    } catch (error) {
      debug("❌ Failed to create socket:", error);
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
      
      if (globalSocket) {
        debug("🧹 Cleaning up socket connection on unmount");
        globalSocket.removeAllListeners();
        globalSocket.disconnect();
        globalSocket = null;
        setIsConnected(false);
        setConnectionState('disconnected');
      }
    };
  }, [establishConnection]);

  // Enhanced socket methods with better error handling
  const joinServer = useCallback(
    (serverId: string) => {
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
      } else {
        debug("❌ Cannot join server: Socket not connected or user not authenticated");
      }
    },
    [user],
  );

  const joinChannel = useCallback((channelId: string, serverId?: string) => {
    if (globalSocket?.connected) {
      debug(`📱 Joining channel: ${channelId}`);
      globalSocket.emit("channel:join", { channelId, serverId });
    } else {
      debug("❌ Cannot join channel: Socket not connected");
    }
  }, []);

  const sendMessage = useCallback(
    (content: string, channelId: string, tempId?: string): Promise<{ success: boolean; message?: any; error?: string }> => {
      return new Promise((resolve) => {
        if (!globalSocket?.connected) {
          debug("❌ Cannot send message: Socket not connected");
          resolve({ success: false, error: "Not connected to server" });
          return;
        }

        if (!user?.id) {
          debug("❌ Cannot send message: User not authenticated");
          resolve({ success: false, error: "User not authenticated" });
          return;
        }

        const trimmedContent = content.trim();
        if (!trimmedContent) {
          debug("❌ Cannot send empty message");
          resolve({ success: false, error: "Message cannot be empty" });
          return;
        }

        debug(`💬 Sending message to channel: ${channelId}`);
        
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
          globalSocket.emit(
            "message:send",
            messageData,
            (response: { success: boolean; message?: any; error?: string }) => {
              if (hasResolved) return;
              hasResolved = true;
              
              if (response?.success) {
                debug("✅ Message sent successfully");
                resolve(response);
              } else {
                debug("❌ Failed to send message:", response?.error);
                resolve({ success: false, error: response?.error || "Failed to send message" });
              }
            }
          );
        } catch (error) {
          if (hasResolved) return;
          hasResolved = true;
          debug("❌ Error sending message:", error);
          resolve({ success: false, error: "Failed to emit message" });
        }
        
        // Enhanced timeout with exponential backoff
        const timeout = Math.min(10000 + (reconnectAttempts * 2000), 30000);
        setTimeout(() => {
          if (!hasResolved) {
            hasResolved = true;
            debug("❌ Message send timeout");
            resolve({ success: false, error: "Message send timeout" });
          }
        }, timeout);
      });
    },
    [user],
  );

  const subscribeToMessages = useCallback(
    (listener: (message: any) => void) => {
      messageListeners.current.add(listener);
      return () => {
        messageListeners.current.delete(listener);
      };
    },
    [],
  );

  const subscribeToServerMembers = useCallback(
    (listener: (data: any) => void) => {
      serverMembersListeners.current.add(listener);
      return () => serverMembersListeners.current.delete(listener);
    },
    [],
  );

  const clearNotifications = useCallback(
    (serverId: string) => {
      if (globalSocket?.connected && user?.id) {
        globalSocket.emit("notifications:clear", {
          serverId,
          userId: user.id,
        });
      }
    },
    [user?.id],
  );

  // Enhanced voice channel methods
  const joinVoiceChannel = useCallback(
    (channelId: string, callType: "voice" | "video" | "screen" = "voice") => {
      if (globalSocket?.connected && user?.id) {
        debug(`🎤 Joining voice channel: ${channelId} (${callType})`);
        globalSocket.emit("voice:join", {
          channelId,
          userId: user.id,
          username: user.username || user.firstName || "Unknown",
          avatar: user.imageUrl,
          callType,
          timestamp: Date.now(),
        });
      } else {
        debug("❌ Cannot join voice channel: Socket not connected or user not authenticated");
      }
    },
    [user],
  );

  const leaveVoiceChannel = useCallback(
    (channelId: string) => {
      if (globalSocket?.connected && user?.id) {
        debug(`🎤 Leaving voice channel: ${channelId}`);
        globalSocket.emit("voice:leave", {
          channelId,
          userId: user.id,
          timestamp: Date.now(),
        });

        setVoiceChannelData((prev) => {
          const newData = { ...prev };
          delete newData[channelId];
          return newData;
        });
      }
    },
    [user?.id],
  );

  const updateVoiceStatus = useCallback(
    (channelId: string, status: any) => {
      if (globalSocket?.connected && user?.id) {
        debug(`🎤 Updating voice status for channel: ${channelId}`, status);
        globalSocket.emit("voice:status_update", {
          channelId,
          userId: user.id,
          timestamp: Date.now(),
          ...status,
        });
      }
    },
    [user?.id],
  );

  // Helper methods
  const getVoiceChannelParticipants = useCallback(
    (channelId: string): VoiceParticipant[] => {
      return voiceChannelData[channelId] || [];
    },
    [voiceChannelData],
  );

  const isInVoiceChannel = useCallback(
    (channelId: string): boolean => {
      const participants = voiceChannelData[channelId] || [];
      return participants.some((p) => p.userId === user?.id);
    },
    [voiceChannelData, user?.id],
  );

  const getVoiceChannelCount = useCallback(
    (channelId: string): number => {
      return (voiceChannelData[channelId] || []).length;
    },
    [voiceChannelData],
  );

  const getServerMembers = useCallback(
    (serverId: string) => {
      return serverMembers[serverId] || [];
    },
    [serverMembers],
  );

  const getServerOnlineCount = useCallback(
    (serverId: string) => {
      const members = serverMembers[serverId] || [];
      return members.filter((member) => member.status === "online").length;
    },
    [serverMembers],
  );

  // Enhanced typing indicators
  const startTyping = useCallback((channelId: string) => {
    if (globalSocket?.connected) {
      debug(`⌨️ Starting typing in channel: ${channelId}`);
      globalSocket.emit("typing_start", { channelId, timestamp: Date.now() });
    }
  }, []);

  const stopTyping = useCallback((channelId: string) => {
    if (globalSocket?.connected) {
      debug(`⌨️ Stopping typing in channel: ${channelId}`);
      globalSocket.emit("typing_stop", { channelId, timestamp: Date.now() });
    }
  }, []);

  // Connection management methods
  const forceReconnect = useCallback(() => {
    debug("🔄 Force reconnecting socket...");
    establishConnection(true);
  }, [establishConnection]);

  const getConnectionInfo = useCallback(() => {
    return {
      isConnected: !!globalSocket?.connected,
      transport: globalSocket?.io.engine.transport.name || 'unknown',
      pingTimeout: globalSocket?.io.opts.timeout || 0,
      reconnectAttempts: reconnectAttempts,
    };
  }, []);

  const value: SocketContextType = {
    socket: globalSocket,
    isConnected,
    connectionState,
    voiceChannelData,
    serverMembers,
    userStatus: isConnected ? "online" : "offline",

    // Methods
    joinServer,
    joinChannel,
    sendMessage,
    subscribeToMessages,
    subscribeToServerMembers,
    clearNotifications,

    // Voice channel methods
    joinVoiceChannel,
    leaveVoiceChannel,
    updateVoiceStatus,
    getVoiceChannelParticipants,
    isInVoiceChannel,
    getVoiceChannelCount,

    // Server members methods
    getServerMembers,
    getServerOnlineCount,

    // Typing indicators
    startTyping,
    stopTyping,

    // Connection management
    forceReconnect,
    getConnectionInfo,
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};

export const useSocketContext = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocketContext must be used within a SocketProvider");
  }
  return context;
};
