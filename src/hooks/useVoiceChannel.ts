import { useCallback, useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useEnhancedSocketContext } from "~/contexts/EnhancedSocketContext";
import { useEnhancedWebRTC } from "./useEnhancedWebRTC";

interface VoiceChannelState {
  isConnected: boolean;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  isDeafened: boolean;
  isSpeaking: boolean;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
  participants: Array<{
    userId: string;
    username: string;
    avatar?: string;
    isAudioEnabled: boolean;
    isVideoEnabled: boolean;
    isScreenSharing: boolean;
    isSpeaking: boolean;
    volume: number;
    connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
    role?: 'admin' | 'moderator' | 'member';
  }>;
  settings: {
    maxParticipants: number;
    allowVideo: boolean;
    allowScreenShare: boolean;
    isLocked: boolean;
  };
  stats: {
    totalParticipants: number;
    speakingCount: number;
    videoCount: number;
    screenShareCount: number;
  };
}

interface VoiceChannelControls {
  // Connection controls
  joinChannel: (channelId: string, type?: 'voice' | 'video' | 'screen') => Promise<void>;
  leaveChannel: () => void;
  
  // Audio controls
  toggleAudio: () => void;
  toggleDeafen: () => void;
  setVolume: (userId: string, volume: number) => void;
  
  // Video controls
  toggleVideo: () => void;
  switchCamera: (deviceId?: string) => Promise<void>;
  
  // Screen sharing controls
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => void;
  
  // Advanced controls
  changeQuality: (quality: 'auto' | 'high' | 'medium' | 'low') => void;
  muteParticipant: (userId: string) => void;
  kickParticipant: (userId: string) => void;
  
  // Diagnostics
  runDiagnostics: () => Promise<{
    connection: any;
    audio: any;
    video: any;
    webrtc: any;
  }>;
  exportLogs: () => string;
}

interface UseVoiceChannelOptions {
  channelId: string;
  autoJoin?: boolean;
  defaultQuality?: 'auto' | 'high' | 'medium' | 'low';
  enableSpeakingDetection?: boolean;
  enableConnectionMonitoring?: boolean;
  onConnectionWarning?: (warning: { quality: string; suggestion: string }) => void;
  onParticipantJoin?: (participant: any) => void;
  onParticipantLeave?: (participant: any) => void;
  onSpeakingChange?: (userId: string, isSpeaking: boolean) => void;
  onError?: (error: Error) => void;
}

export function useVoiceChannel(options: UseVoiceChannelOptions): [VoiceChannelState, VoiceChannelControls] {
  const {
    channelId,
    autoJoin = false,
    defaultQuality = 'auto',
    enableSpeakingDetection = true,
    enableConnectionMonitoring = true,
    onConnectionWarning,
    onParticipantJoin,
    onParticipantLeave,
    onSpeakingChange,
    onError,
  } = options;

  const { user } = useUser();
  const socket = useEnhancedSocketContext();
  
  // Enhanced WebRTC hook integration
  const webrtc = useEnhancedWebRTC({
    socket: socket.socket,
    userId: user?.id || '',
    username: user?.username || user?.firstName || 'Unknown',
  });

  // State management
  const [state, setState] = useState<VoiceChannelState>({
    isConnected: false,
    isAudioEnabled: true,
    isVideoEnabled: false,
    isScreenSharing: false,
    isDeafened: false,
    isSpeaking: false,
    connectionQuality: 'excellent',
    participants: [],
    settings: {
      maxParticipants: 20,
      allowVideo: true,
      allowScreenShare: true,
      isLocked: false,
    },
    stats: {
      totalParticipants: 0,
      speakingCount: 0,
      videoCount: 0,
      screenShareCount: 0,
    },
  });

  // References for cleanup and tracking
  const connectionStatsRef = useRef<{
    packetsLost: number;
    jitter: number;
    bitrate: number;
    roundTripTime: number;
    lastUpdate: Date;
  }>({
    packetsLost: 0,
    jitter: 0,
    bitrate: 0,
    roundTripTime: 0,
    lastUpdate: new Date(),
  });

  const logsRef = useRef<Array<{
    timestamp: Date;
    level: 'info' | 'warn' | 'error';
    message: string;
    data?: any;
  }>>([]);

  const volumeNodesRef = useRef<Map<string, GainNode>>(new Map());
  const diagnosticsRef = useRef<{
    lastDiagnostic: Date | null;
    results: any;
  }>({
    lastDiagnostic: null,
    results: null,
  });

  // Enhanced logging
  const log = useCallback((level: 'info' | 'warn' | 'error', message: string, data?: any) => {
    const logEntry = {
      timestamp: new Date(),
      level,
      message,
      data,
    };
    
    logsRef.current.push(logEntry);
    
    // Keep only last 1000 entries
    if (logsRef.current.length > 1000) {
      logsRef.current = logsRef.current.slice(-1000);
    }
    
    console.log(`[VoiceChannel:${channelId}] ${level.toUpperCase()}: ${message}`, data || '');
  }, [channelId]);

  // Sync with socket context voice channel data
  useEffect(() => {
    const voiceData = socket.getVoiceChannelData(channelId);
    if (voiceData) {
      setState(prevState => ({
        ...prevState,
        participants: voiceData.participants,
        settings: voiceData.settings,
        stats: {
          totalParticipants: voiceData.totalCount,
          speakingCount: voiceData.speakingCount,
          videoCount: voiceData.videoCount,
          screenShareCount: voiceData.screenShareCount,
        },
      }));
    }
  }, [socket, channelId]);

  // Sync with WebRTC hook state
  useEffect(() => {
    setState(prevState => ({
      ...prevState,
      isConnected: webrtc.isCallActive && webrtc.currentChannelId === channelId,
      isAudioEnabled: webrtc.isAudioEnabled,
      isVideoEnabled: webrtc.isVideoEnabled,
      isScreenSharing: webrtc.isScreenSharing,
      isDeafened: webrtc.isDeafened,
      isSpeaking: webrtc.isSpeaking,
    }));
  }, [
    webrtc.isCallActive,
    webrtc.currentChannelId,
    webrtc.isAudioEnabled,
    webrtc.isVideoEnabled,
    webrtc.isScreenSharing,
    webrtc.isDeafened,
    webrtc.isSpeaking,
    channelId,
  ]);

  // Subscribe to voice updates
  useEffect(() => {
    const unsubscribeVoice = socket.subscribeToVoiceUpdates(channelId, (data) => {
      log('info', 'Voice channel updated', data);
      
      // Detect participant changes
      const currentParticipantIds = new Set(state.participants.map(p => p.userId));
      const newParticipantIds = new Set(data.participants.map((p: any) => p.userId));
      
      // Handle new participants
      newParticipantIds.forEach(userId => {
        if (!currentParticipantIds.has(userId)) {
          const participant = data.participants.find((p: any) => p.userId === userId);
          if (participant && onParticipantJoin) {
            onParticipantJoin(participant);
          }
        }
      });
      
      // Handle leaving participants
      currentParticipantIds.forEach(userId => {
        if (!newParticipantIds.has(userId)) {
          const participant = state.participants.find(p => p.userId === userId);
          if (participant && onParticipantLeave) {
            onParticipantLeave(participant);
          }
        }
      });
    });

    const unsubscribeSpeaking = socket.subscribeToSpeakingUpdates(channelId, (data) => {
      log('info', 'Speaking update', data);
      if (onSpeakingChange) {
        onSpeakingChange(data.userId, data.isSpeaking);
      }
    });

    const unsubscribeWarnings = socket.subscribeToConnectionWarnings((data) => {
      if (data.channelId === channelId) {
        log('warn', 'Connection warning', data);
        setState(prevState => ({
          ...prevState,
          connectionQuality: data.quality,
        }));
        if (onConnectionWarning) {
          onConnectionWarning(data);
        }
      }
    });

    return () => {
      unsubscribeVoice();
      unsubscribeSpeaking();
      unsubscribeWarnings();
    };
  }, [socket, channelId, state.participants, onParticipantJoin, onParticipantLeave, onSpeakingChange, onConnectionWarning, log]);

  // Connection monitoring
  useEffect(() => {
    if (!enableConnectionMonitoring || !state.isConnected) return;

    const interval = setInterval(() => {
      // Collect WebRTC statistics
      const stats = webrtc.getConnectionStats();
      
      // Update connection stats
      connectionStatsRef.current = {
        ...connectionStatsRef.current,
        lastUpdate: new Date(),
      };
      
      // Report to server
      socket.reportConnectionStats(channelId, {
        packetsLost: stats.failedPeers,
        jitter: 0, // Would need real WebRTC stats
        bitrate: 0, // Would need real WebRTC stats
        roundTripTime: socket.getConnectionInfo().latency || 0,
      });
    }, 5000); // Every 5 seconds

    return () => clearInterval(interval);
  }, [enableConnectionMonitoring, state.isConnected, webrtc, socket, channelId]);

  // Auto-join functionality
  useEffect(() => {
    if (autoJoin && !state.isConnected && socket.isConnected) {
      joinChannel(channelId, 'voice').catch(console.error);
    }
  }, [autoJoin, state.isConnected, socket.isConnected, channelId]);

  // Control functions
  const joinChannel = useCallback(async (
    targetChannelId: string,
    type: 'voice' | 'video' | 'screen' = 'voice'
  ) => {
    try {
      log('info', `Joining channel ${targetChannelId} as ${type}`);
      
      // Use WebRTC hook to join
      await webrtc.joinVoiceChannel(targetChannelId, type);
      
      // Update socket
      socket.joinVoiceChannel(targetChannelId, type, defaultQuality);
      
      log('info', `Successfully joined channel ${targetChannelId}`);
    } catch (error) {
      log('error', `Failed to join channel ${targetChannelId}`, error);
      if (onError) {
        onError(error instanceof Error ? error : new Error('Failed to join channel'));
      }
      throw error;
    }
  }, [webrtc, socket, defaultQuality, log, onError]);

  const leaveChannel = useCallback(() => {
    try {
      log('info', `Leaving channel ${channelId}`);
      
      // Use WebRTC hook to leave
      webrtc.leaveVoiceChannel();
      
      // Update socket
      socket.leaveVoiceChannel(channelId);
      
      // Clean up volume nodes
      volumeNodesRef.current.clear();
      
      log('info', `Successfully left channel ${channelId}`);
    } catch (error) {
      log('error', `Failed to leave channel ${channelId}`, error);
      if (onError) {
        onError(error instanceof Error ? error : new Error('Failed to leave channel'));
      }
    }
  }, [webrtc, socket, channelId, log, onError]);

  const toggleAudio = useCallback(() => {
    try {
      webrtc.toggleAudio();
      socket.updateVoiceStatus(channelId, { isAudioEnabled: !state.isAudioEnabled });
      log('info', `Audio ${state.isAudioEnabled ? 'disabled' : 'enabled'}`);
    } catch (error) {
      log('error', 'Failed to toggle audio', error);
      if (onError) {
        onError(error instanceof Error ? error : new Error('Failed to toggle audio'));
      }
    }
  }, [webrtc, socket, channelId, state.isAudioEnabled, log, onError]);

  const toggleDeafen = useCallback(() => {
    try {
      webrtc.toggleDeafen();
      log('info', `Deafen ${state.isDeafened ? 'disabled' : 'enabled'}`);
    } catch (error) {
      log('error', 'Failed to toggle deafen', error);
      if (onError) {
        onError(error instanceof Error ? error : new Error('Failed to toggle deafen'));
      }
    }
  }, [webrtc, state.isDeafened, log, onError]);

  const toggleVideo = useCallback(() => {
    try {
      webrtc.toggleVideo();
      socket.updateVoiceStatus(channelId, { isVideoEnabled: !state.isVideoEnabled });
      log('info', `Video ${state.isVideoEnabled ? 'disabled' : 'enabled'}`);
    } catch (error) {
      log('error', 'Failed to toggle video', error);
      if (onError) {
        onError(error instanceof Error ? error : new Error('Failed to toggle video'));
      }
    }
  }, [webrtc, socket, channelId, state.isVideoEnabled, log, onError]);

  const startScreenShare = useCallback(async () => {
    try {
      log('info', 'Starting screen share');
      await webrtc.startScreenShare();
      socket.updateVoiceStatus(channelId, { isScreenSharing: true });
      log('info', 'Screen share started successfully');
    } catch (error) {
      log('error', 'Failed to start screen share', error);
      if (onError) {
        onError(error instanceof Error ? error : new Error('Failed to start screen share'));
      }
      throw error;
    }
  }, [webrtc, socket, channelId, log, onError]);

  const stopScreenShare = useCallback(() => {
    try {
      log('info', 'Stopping screen share');
      webrtc.stopScreenShare();
      socket.updateVoiceStatus(channelId, { isScreenSharing: false });
      log('info', 'Screen share stopped successfully');
    } catch (error) {
      log('error', 'Failed to stop screen share', error);
      if (onError) {
        onError(error instanceof Error ? error : new Error('Failed to stop screen share'));
      }
    }
  }, [webrtc, socket, channelId, log, onError]);

  const setVolume = useCallback((userId: string, volume: number) => {
    try {
      // This would need integration with WebRTC audio context
      log('info', `Setting volume for ${userId} to ${volume}`);
      // Implementation would involve Web Audio API
    } catch (error) {
      log('error', `Failed to set volume for ${userId}`, error);
      if (onError) {
        onError(error instanceof Error ? error : new Error('Failed to set volume'));
      }
    }
  }, [log, onError]);

  const switchCamera = useCallback(async (deviceId?: string) => {
    try {
      log('info', `Switching camera to ${deviceId || 'default'}`);
      // This would need integration with WebRTC
      // Implementation would involve getUserMedia with deviceId constraint
    } catch (error) {
      log('error', 'Failed to switch camera', error);
      if (onError) {
        onError(error instanceof Error ? error : new Error('Failed to switch camera'));
      }
      throw error;
    }
  }, [log, onError]);

  const changeQuality = useCallback((quality: 'auto' | 'high' | 'medium' | 'low') => {
    try {
      log('info', `Changing quality to ${quality}`);
      // This would need integration with WebRTC
      // Implementation would involve updating peer connection constraints
    } catch (error) {
      log('error', 'Failed to change quality', error);
      if (onError) {
        onError(error instanceof Error ? error : new Error('Failed to change quality'));
      }
    }
  }, [log, onError]);

  const muteParticipant = useCallback((userId: string) => {
    try {
      log('info', `Muting participant ${userId}`);
      // This would need server-side permissions
      // Implementation would involve emitting mute command to server
    } catch (error) {
      log('error', `Failed to mute participant ${userId}`, error);
      if (onError) {
        onError(error instanceof Error ? error : new Error('Failed to mute participant'));
      }
    }
  }, [log, onError]);

  const kickParticipant = useCallback((userId: string) => {
    try {
      log('info', `Kicking participant ${userId}`);
      // This would need server-side permissions
      // Implementation would involve emitting kick command to server
    } catch (error) {
      log('error', `Failed to kick participant ${userId}`, error);
      if (onError) {
        onError(error instanceof Error ? error : new Error('Failed to kick participant'));
      }
    }
  }, [log, onError]);

  const runDiagnostics = useCallback(async () => {
    try {
      log('info', 'Running diagnostics');
      
      const results = {
        connection: {
          socketConnected: socket.isConnected,
          socketState: socket.connectionState,
          latency: socket.getConnectionInfo().latency,
          transport: socket.getConnectionInfo().transport,
        },
        audio: {
          devices: await navigator.mediaDevices.enumerateDevices(),
          permissions: await navigator.permissions.query({ name: 'microphone' as PermissionName }),
        },
        video: {
          permissions: await navigator.permissions.query({ name: 'camera' as PermissionName }),
        },
        webrtc: {
          isCallActive: webrtc.isCallActive,
          peersCount: webrtc.peers.length,
          connectionStats: webrtc.getConnectionStats(),
        },
      };
      
      diagnosticsRef.current = {
        lastDiagnostic: new Date(),
        results,
      };
      
      log('info', 'Diagnostics completed', results);
      return results;
    } catch (error) {
      log('error', 'Failed to run diagnostics', error);
      throw error;
    }
  }, [socket, webrtc, log]);

  const exportLogs = useCallback(() => {
    const logs = logsRef.current.map(entry => 
      `[${entry.timestamp.toISOString()}] ${entry.level.toUpperCase()}: ${entry.message}${
        entry.data ? ` | ${JSON.stringify(entry.data)}` : ''
      }`
    ).join('\n');
    
    return `Voice Channel Logs (${channelId}):\n${logs}`;
  }, [channelId]);

  const controls: VoiceChannelControls = {
    joinChannel,
    leaveChannel,
    toggleAudio,
    toggleDeafen,
    setVolume,
    toggleVideo,
    switchCamera,
    startScreenShare,
    stopScreenShare,
    changeQuality,
    muteParticipant,
    kickParticipant,
    runDiagnostics,
    exportLogs,
  };

  return [state, controls];
}

// Utility hook for multiple voice channels
export function useVoiceChannels(channelIds: string[]) {
  const channels = channelIds.map(channelId => 
    useVoiceChannel({ channelId })
  );
  
  return channels.reduce((acc, [state, controls], index) => {
    acc[channelIds[index]] = { state, controls };
    return acc;
  }, {} as Record<string, { state: VoiceChannelState; controls: VoiceChannelControls }>);
}

// Utility hook for voice channel presence
export function useVoicePresence() {
  const socket = useEnhancedSocketContext();
  const { user } = useUser();
  
  const [presence, setPresence] = useState<{
    activeChannels: string[];
    totalParticipants: number;
    isSpeaking: boolean;
  }>({
    activeChannels: [],
    totalParticipants: 0,
    isSpeaking: false,
  });

  useEffect(() => {
    // Calculate presence from voice channel data
    const activeChannels = Object.keys(socket.voiceChannelData).filter(channelId => 
      socket.isInVoiceChannel(channelId)
    );
    
    const totalParticipants = Object.values(socket.voiceChannelData).reduce(
      (sum, channel) => sum + channel.totalCount, 0
    );
    
    const isSpeaking = Object.values(socket.voiceChannelData).some(channel =>
      channel.participants.some(p => p.userId === user?.id && p.isSpeaking)
    );
    
    setPresence({
      activeChannels,
      totalParticipants,
      isSpeaking,
    });
  }, [socket.voiceChannelData, socket, user?.id]);

  return presence;
}
