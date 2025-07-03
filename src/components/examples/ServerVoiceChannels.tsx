import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { toast } from 'sonner';
import { useVoiceChannel, useVoicePresence } from '~/hooks/useVoiceChannel';
import { useEnhancedSocketContext } from '~/contexts/EnhancedSocketContext';
import EnhancedVoiceChannel from '~/components/voice/EnhancedVoiceChannel';
import VoiceCallInterface from '~/components/VoiceCallInterface';

// Exemplu de componenta server/channel care integreaza voice channels
interface ServerVoiceChannelsProps {
  serverId: string;
  channels: Array<{
    id: string;
    name: string;
    emoji?: string;
    type: 'voice' | 'text';
    category?: string;
  }>;
}

const ServerVoiceChannels: React.FC<ServerVoiceChannelsProps> = ({ serverId, channels }) => {
  const { user } = useUser();
  const socket = useEnhancedSocketContext();
  const voicePresence = useVoicePresence();
  
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [connectionWarnings, setConnectionWarnings] = useState<Array<{
    channelId: string;
    message: string;
    timestamp: Date;
  }>>([]);

  // Use voice channel hook for selected channel
  const [voiceState, voiceControls] = useVoiceChannel({
    channelId: selectedChannelId || '',
    enableSpeakingDetection: true,
    enableConnectionMonitoring: true,
    onConnectionWarning: (warning) => {
      setConnectionWarnings(prev => [...prev, {
        channelId: selectedChannelId || '',
        message: warning.suggestion,
        timestamp: new Date(),
      }]);
      toast.warning(`Connection Issue: ${warning.suggestion}`);
    },
    onParticipantJoin: (participant) => {
      toast.success(`${participant.username} joined the voice channel`);
    },
    onParticipantLeave: (participant) => {
      toast.info(`${participant.username} left the voice channel`);
    },
    onSpeakingChange: (userId, isSpeaking) => {
      // Could update UI to show speaking indicators
      console.log(`User ${userId} ${isSpeaking ? 'started' : 'stopped'} speaking`);
    },
    onError: (error) => {
      toast.error(`Voice Error: ${error.message}`);
      console.error('Voice channel error:', error);
    },
  });

  // Join server on mount
  useEffect(() => {
    if (socket.isConnected && user?.id) {
      socket.joinServer(serverId);
    }
  }, [socket, serverId, user?.id]);

  // Clear old connection warnings
  useEffect(() => {
    const interval = setInterval(() => {
      setConnectionWarnings(prev => 
        prev.filter(warning => 
          Date.now() - warning.timestamp.getTime() < 30000 // Keep for 30 seconds
        )
      );
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleJoinVoiceChannel = async (channelId: string, type: 'voice' | 'video' | 'screen' = 'voice') => {
    try {
      setSelectedChannelId(channelId);
      
      // Check if already in another voice channel
      if (voicePresence.activeChannels.length > 0 && !voicePresence.activeChannels.includes(channelId)) {
        const shouldSwitch = confirm('You are already in a voice channel. Do you want to switch?');
        if (!shouldSwitch) return;
        
        // Leave current channels
        for (const activeChannelId of voicePresence.activeChannels) {
          socket.leaveVoiceChannel(activeChannelId);
        }
      }
      
      await voiceControls.joinChannel(channelId, type);
      toast.success(`Joined ${type} channel successfully!`);
    } catch (error) {
      console.error('Failed to join voice channel:', error);
      toast.error('Failed to join voice channel');
    }
  };

  const handleLeaveVoiceChannel = () => {
    try {
      voiceControls.leaveChannel();
      setSelectedChannelId(null);
      toast.info('Left voice channel');
    } catch (error) {
      console.error('Failed to leave voice channel:', error);
      toast.error('Failed to leave voice channel');
    }
  };

  const handleToggleAudio = () => {
    try {
      voiceControls.toggleAudio();
      toast.success(voiceState.isAudioEnabled ? 'Microphone muted' : 'Microphone unmuted');
    } catch (error) {
      toast.error('Failed to toggle microphone');
    }
  };

  const handleToggleVideo = () => {
    try {
      voiceControls.toggleVideo();
      toast.success(voiceState.isVideoEnabled ? 'Camera disabled' : 'Camera enabled');
    } catch (error) {
      toast.error('Failed to toggle camera');
    }
  };

  const handleToggleDeafen = () => {
    try {
      voiceControls.toggleDeafen();
      toast.success(voiceState.isDeafened ? 'Undeafened' : 'Deafened');
    } catch (error) {
      toast.error('Failed to toggle deafen');
    }
  };

  const handleToggleScreenShare = async () => {
    try {
      if (voiceState.isScreenSharing) {
        voiceControls.stopScreenShare();
        toast.success('Screen sharing stopped');
      } else {
        await voiceControls.startScreenShare();
        toast.success('Screen sharing started');
      }
    } catch (error) {
      toast.error('Failed to toggle screen share');
    }
  };

  const handleRunDiagnostics = async () => {
    try {
      const diagnostics = await voiceControls.runDiagnostics();
      console.log('Voice diagnostics:', diagnostics);
      
      // Show diagnostic results
      const issues = [];
      if (!diagnostics.connection.socketConnected) issues.push('Socket disconnected');
      if (diagnostics.connection.latency > 200) issues.push('High latency');
      if (diagnostics.webrtc.peersCount === 0 && voiceState.stats.totalParticipants > 1) {
        issues.push('No WebRTC connections');
      }
      
      if (issues.length > 0) {
        toast.warning(`Issues detected: ${issues.join(', ')}`);
      } else {
        toast.success('All systems operational');
      }
    } catch (error) {
      toast.error('Failed to run diagnostics');
    }
  };

  const handleExportLogs = () => {
    try {
      const logs = voiceControls.exportLogs();
      const blob = new Blob([logs], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `voice-logs-${selectedChannelId}-${Date.now()}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Logs exported successfully');
    } catch (error) {
      toast.error('Failed to export logs');
    }
  };

  const currentUser = {
    id: user?.id || '',
    username: user?.username || user?.firstName || 'Unknown',
    avatar: user?.imageUrl,
    isAudioEnabled: voiceState.isAudioEnabled,
    isVideoEnabled: voiceState.isVideoEnabled,
    isScreenSharing: voiceState.isScreenSharing,
    isDeafened: voiceState.isDeafened,
    isSpeaking: voiceState.isSpeaking,
    connectionQuality: voiceState.connectionQuality,
  };

  const voiceChannels = channels.filter(channel => channel.type === 'voice');

  return (
    <div className="space-y-4">
      {/* Connection warnings */}
      {connectionWarnings.length > 0 && (
        <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3">
          <h4 className="text-sm font-medium text-yellow-400 mb-2">Connection Warnings:</h4>
          <ul className="space-y-1">
            {connectionWarnings.map((warning, index) => (
              <li key={index} className="text-xs text-yellow-300">
                {warning.message} ({warning.timestamp.toLocaleTimeString()})
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Voice presence indicator */}
      {voicePresence.activeChannels.length > 0 && (
        <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="flex h-3 w-3 bg-green-400 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-green-400">Connected to voice</span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleRunDiagnostics}
                className="text-xs text-green-300 hover:text-green-200 underline"
              >
                Run diagnostics
              </button>
              <button
                onClick={handleExportLogs}
                className="text-xs text-green-300 hover:text-green-200 underline"
              >
                Export logs
              </button>
            </div>
          </div>
          <div className="text-xs text-green-300 mt-1">
            {voicePresence.totalParticipants} total participants
            {voicePresence.isSpeaking && ' • Speaking'}
          </div>
        </div>
      )}

      {/* Voice Channels List */}
      <div className="space-y-2">
        <h3 className="text-lg font-bold text-white flex items-center space-x-2">
          <span>🔊</span>
          <span>Voice Channels</span>
          <span className="text-sm text-gray-400">({voiceChannels.length})</span>
        </h3>
        
        {voiceChannels.map((channel) => {
          const channelData = socket.getVoiceChannelData(channel.id);
          const isInChannel = selectedChannelId === channel.id && voiceState.isConnected;
          
          return (
            <EnhancedVoiceChannel
              key={channel.id}
              channelId={channel.id}
              channelName={channel.name}
              channelEmoji={channel.emoji}
              isInChannel={isInChannel}
              participants={channelData?.participants || []}
              currentUser={currentUser}
              onJoinChannel={handleJoinVoiceChannel}
              onLeaveChannel={handleLeaveVoiceChannel}
              onToggleAudio={handleToggleAudio}
              onToggleVideo={handleToggleVideo}
              onToggleDeafen={handleToggleDeafen}
              onToggleScreenShare={handleToggleScreenShare}
              maxParticipants={channelData?.settings.maxParticipants || 20}
              allowVideo={channelData?.settings.allowVideo ?? true}
              allowScreenShare={channelData?.settings.allowScreenShare ?? true}
              isLocked={channelData?.settings.isLocked ?? false}
              showInSidebar={true}
              className="bg-gray-800/50 hover:bg-gray-800/70"
            />
          );
        })}
      </div>

      {/* Voice Call Interface - shown when in a call */}
      {selectedChannelId && voiceState.isConnected && (
        <VoiceCallInterface
          isCallActive={voiceState.isConnected}
          isAudioEnabled={voiceState.isAudioEnabled}
          isVideoEnabled={voiceState.isVideoEnabled}
          isScreenSharing={voiceState.isScreenSharing}
          currentCallType={voiceState.isScreenSharing ? 'screen' : voiceState.isVideoEnabled ? 'video' : 'voice'}
          currentChannelId={selectedChannelId}
          currentChannelName={channels.find(c => c.id === selectedChannelId)?.name}
          currentChannelEmoji={channels.find(c => c.id === selectedChannelId)?.emoji}
          currentUserAvatar={currentUser.avatar}
          currentUserName={currentUser.username}
          peers={[]} // WebRTC peers would be passed here
          voiceParticipants={voiceState.participants}
          localVideoRef={{ current: null }} // Would be connected to actual video element
          screenShareRef={{ current: null }} // Would be connected to actual screen share element
          onEndCall={handleLeaveVoiceChannel}
          onToggleAudio={handleToggleAudio}
          onToggleVideo={handleToggleVideo}
          onToggleScreenShare={handleToggleScreenShare}
          onToggleDeafen={handleToggleDeafen}
          onAnswerCall={() => {}} // Not used in this context
          onDeclineCall={() => {}} // Not used in this context
          isDeafened={voiceState.isDeafened}
          isSpeaking={voiceState.isSpeaking}
        />
      )}

      {/* Debug information (dev only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-3 text-xs">
          <h4 className="font-medium text-gray-300 mb-2">Debug Info:</h4>
          <div className="space-y-1 text-gray-400 font-mono">
            <div>Socket Connected: {socket.isConnected ? '✅' : '❌'}</div>
            <div>Socket State: {socket.connectionState}</div>
            <div>Selected Channel: {selectedChannelId || 'None'}</div>
            <div>Voice Connected: {voiceState.isConnected ? '✅' : '❌'}</div>
            <div>Participants: {voiceState.stats.totalParticipants}</div>
            <div>Speaking: {voiceState.stats.speakingCount}</div>
            <div>Connection Quality: {voiceState.connectionQuality}</div>
            <div>Active Channels: {voicePresence.activeChannels.join(', ') || 'None'}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServerVoiceChannels;

// Exemplu de integrare in layout principal
export const ExampleLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Sidebar cu voice channels */}
      <div className="fixed left-0 top-0 h-full w-64 bg-gray-800 p-4 overflow-y-auto">
        <ServerVoiceChannels
          serverId="example-server-id"
          channels={[
            { id: 'general-voice', name: 'General', emoji: '🔊', type: 'voice' },
            { id: 'gaming-voice', name: 'Gaming', emoji: '🎮', type: 'voice' },
            { id: 'music-voice', name: 'Music', emoji: '🎵', type: 'voice' },
            { id: 'chill-voice', name: 'Chill Zone', emoji: '😎', type: 'voice' },
          ]}
        />
      </div>
      
      {/* Main content */}
      <div className="ml-64 p-4">
        {children}
      </div>
    </div>
  );
};
