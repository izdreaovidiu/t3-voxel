"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  MonitorOff,
  Volume2,
  VolumeX,
  Settings,
  Phone,
  Users,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  UserPlus,
  Copy,
  ArrowLeft,
} from "lucide-react";
import { useEnhancedSocketContext } from "~/contexts/EnhancedSocketContext";
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
  videoRef?: React.RefObject<HTMLVideoElement>;
}

interface VoiceChannelInterfaceProps {
  channelId: string;
  channelName: string;
  channelEmoji?: string;
  serverId: string;
  onLeaveChannel: () => void;
  onSwitchToTextChannel: (channelId: string) => void;
}

const VoiceChannelInterface: React.FC<VoiceChannelInterfaceProps> = ({
  channelId,
  channelName,
  channelEmoji = "🔊",
  serverId,
  onLeaveChannel,
  onSwitchToTextChannel,
}) => {
  const { user } = useUser();
  const {
    getVoiceChannelData,
    updateVoiceStatus,
    updateSpeakingStatus,
    leaveVoiceChannel,
    subscribeToVoiceUpdates,
    subscribeToSpeakingUpdates,
    isConnected,
  } = useEnhancedSocketContext();

  const [participants, setParticipants] = useState<VoiceParticipant[]>([]);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [focusedParticipant, setFocusedParticipant] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenShareStreamRef = useRef<MediaStream | null>(null);

  // Subscribe to voice channel updates
  useEffect(() => {
    const unsubscribeVoice = subscribeToVoiceUpdates(channelId, (data) => {
      console.log("Voice channel updated:", data);
      const channelData = getVoiceChannelData(channelId);
      if (channelData) {
        setParticipants(channelData.participants);
      }
    });

    const unsubscribeSpeaking = subscribeToSpeakingUpdates(channelId, (data) => {
      console.log("Speaking update:", data);
      setParticipants(prev => 
        prev.map(p => 
          p.userId === data.userId 
            ? { ...p, isSpeaking: data.isSpeaking, volume: data.volume }
            : p
        )
      );
    });

    return () => {
      unsubscribeVoice();
      unsubscribeSpeaking();
    };
  }, [channelId, subscribeToVoiceUpdates, subscribeToSpeakingUpdates, getVoiceChannelData]);

  // Initialize voice channel data
  useEffect(() => {
    const channelData = getVoiceChannelData(channelId);
    if (channelData) {
      setParticipants(channelData.participants);
    }
  }, [channelId, getVoiceChannelData]);

  // Initialize media streams
  useEffect(() => {
    const initializeMedia = async () => {
      try {
        if (isVideoEnabled) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 1280, height: 720 },
            audio: true,
          });
          localStreamRef.current = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        }
      } catch (error) {
        console.error("Failed to initialize media:", error);
      }
    };

    initializeMedia();

    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (screenShareStreamRef.current) {
        screenShareStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [isVideoEnabled]);

  // Toggle audio
  const toggleAudio = () => {
    const newState = !isAudioEnabled;
    setIsAudioEnabled(newState);
    updateVoiceStatus(channelId, { isAudioEnabled: newState });
    
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = newState;
      }
    }
  };

  // Toggle video
  const toggleVideo = async () => {
    const newState = !isVideoEnabled;
    setIsVideoEnabled(newState);
    updateVoiceStatus(channelId, { isVideoEnabled: newState });

    if (newState) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
          audio: true,
        });
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error("Failed to enable video:", error);
        setIsVideoEnabled(false);
      }
    } else {
      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach(track => track.stop());
      }
    }
  };

  // Toggle screen sharing
  const toggleScreenShare = async () => {
    const newState = !isScreenSharing;
    setIsScreenSharing(newState);
    updateVoiceStatus(channelId, { isScreenSharing: newState });

    if (newState) {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { width: 1920, height: 1080 },
          audio: true,
        });
        screenShareStreamRef.current = stream;
        
        // Handle screen share ending
        stream.getVideoTracks()[0].addEventListener('ended', () => {
          setIsScreenSharing(false);
          updateVoiceStatus(channelId, { isScreenSharing: false });
        });
      } catch (error) {
        console.error("Failed to start screen share:", error);
        setIsScreenSharing(false);
      }
    } else {
      if (screenShareStreamRef.current) {
        screenShareStreamRef.current.getTracks().forEach(track => track.stop());
        screenShareStreamRef.current = null;
      }
    }
  };

  // Toggle deafened
  const toggleDeafened = () => {
    const newState = !isDeafened;
    setIsDeafened(newState);
    if (newState) {
      setIsAudioEnabled(false);
      updateVoiceStatus(channelId, { isAudioEnabled: false });
    }
  };

  // Leave voice channel
  const handleLeaveChannel = () => {
    leaveVoiceChannel(channelId);
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (screenShareStreamRef.current) {
      screenShareStreamRef.current.getTracks().forEach(track => track.stop());
    }
    onLeaveChannel();
  };

  // Copy channel invite
  const copyChannelInvite = () => {
    const inviteUrl = `${window.location.origin}/invite/${serverId}?channel=${channelId}`;
    navigator.clipboard.writeText(inviteUrl);
    // Show toast notification
    console.log("Channel invite copied to clipboard");
  };

  // Get connection quality color
  const getConnectionQualityColor = (quality: string) => {
    switch (quality) {
      case 'excellent': return 'text-green-400';
      case 'good': return 'text-yellow-400';
      case 'fair': return 'text-orange-400';
      case 'poor': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  // Get current user from participants
  const currentUser = participants.find(p => p.userId === user?.id);

  return (
    <div className={`flex flex-col h-screen bg-[#0D1117] text-white ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between h-16 px-6 border-b border-gray-800/50 bg-[#161B22]/90 backdrop-blur-sm">
        <div className="flex items-center space-x-4">
          <button
            onClick={onLeaveChannel}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors"
            title="Leave voice channel"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{channelEmoji}</span>
            <div className="flex items-center space-x-2">
              <Volume2 className="w-5 h-5 text-[#57F287]" />
              <h1 className="text-xl font-bold">{channelName}</h1>
            </div>
          </div>

          <div className="flex items-center space-x-2 px-3 py-1 bg-[#21262D] rounded-full">
            <Users className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-300">{participants.length}</span>
          </div>

          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[#57F287]' : 'bg-[#ED4245]'} ${isConnected ? 'shadow-[0_0_6px_rgba(87,242,135,0.6)]' : 'shadow-[0_0_6px_rgba(237,66,69,0.6)]'}`} />
            <span className={`text-xs ${isConnected ? 'text-[#57F287]' : 'text-[#ED4245]'}`}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={copyChannelInvite}
            className="flex items-center justify-center w-10 h-10 rounded-lg text-gray-400 hover:text-[#57F287] hover:bg-gray-700/50 transition-colors"
            title="Copy invite link"
          >
            <UserPlus className="w-5 h-5" />
          </button>
          
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="flex items-center justify-center w-10 h-10 rounded-lg text-gray-400 hover:text-[#57F287] hover:bg-gray-700/50 transition-colors"
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center justify-center w-10 h-10 rounded-lg text-gray-400 hover:text-[#57F287] hover:bg-gray-700/50 transition-colors"
            title="Voice settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Participants Grid */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className={`grid gap-6 ${
          participants.length === 1 ? 'grid-cols-1 place-items-center' :
          participants.length === 2 ? 'grid-cols-2' :
          participants.length <= 4 ? 'grid-cols-2' :
          participants.length <= 6 ? 'grid-cols-3' :
          'grid-cols-4'
        }`}>
          {participants.map((participant) => (
            <div
              key={participant.userId}
              className={`relative group bg-[#161B22] rounded-2xl overflow-hidden transition-all duration-300 hover:scale-105 cursor-pointer ${
                focusedParticipant === participant.userId ? 'ring-2 ring-[#57F287]' : ''
              } ${
                participant.isSpeaking ? 'ring-2 ring-[#57F287] shadow-[0_0_20px_rgba(87,242,135,0.3)]' : ''
              }`}
              style={{
                aspectRatio: participant.isVideoEnabled ? '16/9' : '4/3',
                minHeight: '200px',
              }}
              onClick={() => setFocusedParticipant(
                focusedParticipant === participant.userId ? null : participant.userId
              )}
            >
              {/* Video Stream */}
              {participant.isVideoEnabled ? (
                <div className="relative w-full h-full">
                  <video
                    ref={participant.userId === user?.id ? localVideoRef : undefined}
                    className="w-full h-full object-cover"
                    autoPlay
                    muted={participant.userId === user?.id}
                    playsInline
                  />
                  
                  {/* Screen Share Overlay */}
                  {participant.isScreenSharing && (
                    <div className="absolute top-2 left-2 px-2 py-1 bg-[#57F287] text-black text-xs font-medium rounded-full">
                      <Monitor className="w-3 h-3 inline mr-1" />
                      Screen
                    </div>
                  )}
                </div>
              ) : (
                /* Avatar View */
                <div className="flex items-center justify-center w-full h-full bg-gradient-to-br from-[#21262D] to-[#161B22]">
                  {participant.avatar ? (
                    <img
                      src={participant.avatar}
                      alt={participant.username}
                      className="w-24 h-24 rounded-full object-cover ring-4 ring-[#57F287]/30"
                    />
                  ) : (
                    <div className="flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-[#57F287] to-[#3BA55C] text-black text-3xl font-bold ring-4 ring-[#57F287]/30">
                      {participant.username[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
              )}

              {/* User Info Overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-white font-medium text-sm truncate">
                      {participant.username}
                    </span>
                    <div className={`w-2 h-2 rounded-full ${getConnectionQualityColor(participant.connectionQuality)}`} />
                  </div>

                  <div className="flex items-center space-x-1">
                    {!participant.isAudioEnabled && (
                      <div className="flex items-center justify-center w-6 h-6 bg-[#ED4245] rounded-full">
                        <MicOff className="w-3 h-3 text-white" />
                      </div>
                    )}
                    
                    {participant.isVideoEnabled && (
                      <div className="flex items-center justify-center w-6 h-6 bg-[#57F287] rounded-full">
                        <Video className="w-3 h-3 text-black" />
                      </div>
                    )}
                    
                    {participant.isScreenSharing && (
                      <div className="flex items-center justify-center w-6 h-6 bg-[#5865F2] rounded-full">
                        <Monitor className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Speaking Indicator */}
                {participant.isSpeaking && (
                  <div className="absolute -top-2 left-2 right-2 h-1 bg-[#57F287] rounded-full opacity-80 animate-pulse" />
                )}
              </div>

              {/* Hover Actions */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="flex items-center justify-center w-8 h-8 bg-black/50 rounded-full text-white hover:bg-[#57F287] hover:text-black transition-colors">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center h-20 px-6 border-t border-gray-800/50 bg-[#161B22]/90 backdrop-blur-sm">
        <div className="flex items-center space-x-4">
          <button
            onClick={toggleAudio}
            className={`flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 ${
              isAudioEnabled
                ? 'bg-[#21262D] text-white hover:bg-[#57F287] hover:text-black'
                : 'bg-[#ED4245] text-white shadow-[0_0_20px_rgba(237,66,69,0.3)]'
            }`}
            title={isAudioEnabled ? 'Mute' : 'Unmute'}
          >
            {isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>

          <button
            onClick={toggleVideo}
            className={`flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 ${
              isVideoEnabled
                ? 'bg-[#57F287] text-black shadow-[0_0_20px_rgba(87,242,135,0.3)]'
                : 'bg-[#21262D] text-white hover:bg-[#57F287] hover:text-black'
            }`}
            title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
          >
            {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>

          <button
            onClick={toggleScreenShare}
            className={`flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 ${
              isScreenSharing
                ? 'bg-[#5865F2] text-white shadow-[0_0_20px_rgba(88,101,242,0.3)]'
                : 'bg-[#21262D] text-white hover:bg-[#5865F2] hover:text-white'
            }`}
            title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
          >
            {isScreenSharing ? <Monitor className="w-5 h-5" /> : <MonitorOff className="w-5 h-5" />}
          </button>

          <button
            onClick={toggleDeafened}
            className={`flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 ${
              isDeafened
                ? 'bg-[#ED4245] text-white shadow-[0_0_20px_rgba(237,66,69,0.3)]'
                : 'bg-[#21262D] text-white hover:bg-[#FEE75C] hover:text-black'
            }`}
            title={isDeafened ? 'Undeafen' : 'Deafen'}
          >
            {isDeafened ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>

          <div className="w-px h-8 bg-gray-700" />

          <button
            onClick={handleLeaveChannel}
            className="flex items-center justify-center w-12 h-12 rounded-full bg-[#ED4245] text-white hover:bg-[#C53030] transition-all duration-300 shadow-[0_0_20px_rgba(237,66,69,0.3)]"
            title="Leave channel"
          >
            <Phone className="w-5 h-5 rotate-225" />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute top-16 right-6 w-80 bg-[#161B22] border border-gray-700/50 rounded-xl shadow-2xl p-6 z-10">
          <h3 className="text-lg font-bold mb-4">Voice Settings</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Input Volume
              </label>
              <input
                type="range"
                min="0"
                max="100"
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Output Volume
              </label>
              <input
                type="range"
                min="0"
                max="100"
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="noise-suppression"
                className="w-4 h-4 text-[#57F287] bg-gray-700 border-gray-600 rounded focus:ring-[#57F287]"
              />
              <label htmlFor="noise-suppression" className="text-sm text-gray-300">
                Noise Suppression
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="echo-cancellation"
                className="w-4 h-4 text-[#57F287] bg-gray-700 border-gray-600 rounded focus:ring-[#57F287]"
              />
              <label htmlFor="echo-cancellation" className="text-sm text-gray-300">
                Echo Cancellation
              </label>
            </div>
          </div>

          <button
            onClick={() => setShowSettings(false)}
            className="w-full mt-4 bg-[#57F287] text-black py-2 rounded-lg hover:bg-[#3BA55C] transition-colors"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
};

export default VoiceChannelInterface;