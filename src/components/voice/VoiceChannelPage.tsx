// Enhanced Voice Channel Page Component with Video and Screen Sharing
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
  MessageSquare,
  Grid3X3,
  Rows3,
  Camera,
  CameraOff,
  Share,
  ShareOff,
  Maximize,
  Pin,
  PinOff,
} from "lucide-react";
import { useEnhancedSocketContext } from "~/contexts/EnhancedSocketContext";
import { useSimpleWebRTC } from "~/hooks/useSimpleWebRTC";
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
  screenShareRef?: React.RefObject<HTMLVideoElement>;
  stream?: MediaStream;
  screenStream?: MediaStream;
}

interface VoiceChannelPageProps {
  channelId: string;
  channelName: string;
  channelEmoji?: string;
  serverId: string;
  onLeaveChannel: () => void;
  onSwitchToTextChannel: (channelId: string) => void;
}

const VoiceChannelPage: React.FC<VoiceChannelPageProps> = ({
  channelId,
  channelName,
  channelEmoji = "🔊",
  serverId,
  onLeaveChannel,
  onSwitchToTextChannel,
}) => {
  const { user } = useUser();
  const {
    socket,
    isConnected,
    joinVoiceChannel,
    leaveVoiceChannel,
    updateVoiceStatus,
  } = useEnhancedSocketContext();

  // WebRTC integration
  const webRTC = useSimpleWebRTC({
    socket,
    userId: user?.id || "",
    username: user?.username || user?.firstName || "Unknown User",
  });

  const [participants, setParticipants] = useState<VoiceParticipant[]>([]);
  const [isDeafened, setIsDeafened] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [focusedParticipant, setFocusedParticipant] = useState<string | null>(null);
  const [viewLayout, setViewLayout] = useState<'grid' | 'speaker' | 'gallery'>('grid');
  const [pinnedParticipants, setPinnedParticipants] = useState<Set<string>>(new Set());

  // Video refs for remote participants
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const remoteScreenRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

  // Initialize voice channel connection
  useEffect(() => {
    if (isConnected && channelId) {
      joinVoiceChannel(channelId, 'voice');  // Start with voice only
      // Start the call automatically when joining voice channel
      webRTC.startCall('voice', channelId);  // Voice only - user can enable video manually
    }
  }, [isConnected, channelId, joinVoiceChannel, webRTC]);

  // Update participants based on WebRTC peers
  useEffect(() => {
    const updatedParticipants: VoiceParticipant[] = [];
    
    // Add current user
    if (user) {
      updatedParticipants.push({
        userId: user.id,
        username: user.username || user.firstName || "You",
        avatar: user.imageUrl,
        isAudioEnabled: webRTC.isAudioEnabled,
        isVideoEnabled: webRTC.isVideoEnabled,
        isScreenSharing: webRTC.isScreenSharing,
        isSpeaking: false,
        volume: 0,
        connectionQuality: 'excellent',
        joinedAt: new Date(),
      });
    }

    // Add remote peers
    webRTC.peers.forEach(peer => {
      updatedParticipants.push({
        userId: peer.id,
        username: peer.username || peer.id,
        avatar: undefined,
        isAudioEnabled: true, // We'll get this from WebRTC events
        isVideoEnabled: !!peer.stream?.getVideoTracks().length,
        isScreenSharing: false, // We'll detect this from stream metadata
        isSpeaking: false,
        volume: 0,
        connectionQuality: 'good',
        joinedAt: new Date(),
        stream: peer.stream,
      });
    });

    setParticipants(updatedParticipants);
  }, [webRTC.peers, webRTC.isAudioEnabled, webRTC.isVideoEnabled, webRTC.isScreenSharing, user]);

  // Handle remote video streams
  useEffect(() => {
    webRTC.peers.forEach(peer => {
      if (peer.stream) {
        const videoElement = remoteVideoRefs.current.get(peer.id);
        if (videoElement && videoElement.srcObject !== peer.stream) {
          videoElement.srcObject = peer.stream;
        }
      }
    });
  }, [webRTC.peers]);

  // Toggle deafened
  const toggleDeafened = () => {
    const newState = !isDeafened;
    setIsDeafened(newState);
    if (newState) {
      webRTC.toggleAudio(); // Mute audio when deafened
    }
  };

  // Leave voice channel
  const handleLeaveChannel = () => {
    webRTC.endCall();
    leaveVoiceChannel(channelId);
    onLeaveChannel();
  };

  // Copy channel invite
  const copyChannelInvite = () => {
    const inviteUrl = `${window.location.origin}/invite/${serverId}?channel=${channelId}`;
    navigator.clipboard.writeText(inviteUrl);
    console.log("Channel invite copied to clipboard");
  };

  // Toggle pin participant
  const togglePinParticipant = (userId: string) => {
    setPinnedParticipants(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
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

  // Get grid layout based on participant count
  const getGridLayout = () => {
    const count = participants.length;
    
    if (viewLayout === 'speaker' && focusedParticipant) {
      return 'speaker-view';
    }
    
    if (count === 1) return 'grid-cols-1 place-items-center';
    if (count === 2) return 'grid-cols-2 gap-4';
    if (count <= 4) return 'grid-cols-2 gap-4';
    if (count <= 6) return 'grid-cols-3 gap-4';
    if (count <= 9) return 'grid-cols-3 gap-4';
    return 'grid-cols-4 gap-3';
  };

  // Create video element for participant
  const createVideoElement = (participant: VoiceParticipant) => {
    const isCurrentUser = participant.userId === user?.id;
    const isScreenSharing = participant.isScreenSharing;
    const videoRef = isCurrentUser ? webRTC.localVideoRef : null;
    const screenRef = isCurrentUser ? webRTC.screenShareRef : null;

    return (
      <div
        key={participant.userId}
        className={`relative group bg-gradient-to-br from-[#161B22] via-[#21262D] to-[#161B22] rounded-3xl overflow-hidden transition-all duration-500 hover:scale-[1.02] cursor-pointer border border-gray-700/30 shadow-2xl ${
          focusedParticipant === participant.userId ? 'ring-4 ring-[#57F287] shadow-[0_0_30px_rgba(87,242,135,0.3)]' : ''
        } ${
          participant.isSpeaking ? 'ring-4 ring-[#57F287] shadow-[0_0_40px_rgba(87,242,135,0.4)] animate-pulse' : ''
        } ${
          pinnedParticipants.has(participant.userId) ? 'ring-2 ring-yellow-400 shadow-[0_0_20px_rgba(255,193,7,0.3)]' : ''
        }`}
        style={{
          aspectRatio: (participant.isVideoEnabled || participant.isScreenSharing) ? '16/9' : '4/3',
          minHeight: '200px',
          height: viewLayout === 'speaker' && focusedParticipant === participant.userId ? '60vh' : 'auto',
        }}
        onClick={() => setFocusedParticipant(
          focusedParticipant === participant.userId ? null : participant.userId
        )}
      >
        {/* Video Content */}
        {participant.isScreenSharing && screenRef ? (
          <div className="relative w-full h-full">
            <video
              ref={screenRef}
              className="w-full h-full object-contain bg-black"
              autoPlay
              muted={isCurrentUser}
              playsInline
            />
            <div className="absolute top-4 left-4 px-3 py-2 bg-gradient-to-r from-[#5865F2] to-[#4752C4] text-white text-sm font-bold rounded-full shadow-lg">
              <Monitor className="w-4 h-4 inline mr-2" />
              Screen Sharing
            </div>
          </div>
        ) : participant.isVideoEnabled ? (
          <div className="relative w-full h-full">
            <video
              ref={isCurrentUser ? videoRef : (el) => {
                if (el && !isCurrentUser) {
                  remoteVideoRefs.current.set(participant.userId, el);
                  if (participant.stream) {
                    el.srcObject = participant.stream;
                  }
                }
              }}
              className="w-full h-full object-cover"
              autoPlay
              muted={isCurrentUser}
              playsInline
            />
            
            {/* Video quality indicator */}
            <div className="absolute top-4 right-4 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-full">
              <div className={`w-2 h-2 rounded-full ${getConnectionQualityColor(participant.connectionQuality)}`} />
            </div>
          </div>
        ) : (
          /* Avatar View */
          <div className="flex items-center justify-center w-full h-full bg-gradient-to-br from-[#21262D] via-[#161B22] to-[#0D1117] relative">
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-black/10 to-black/30" />
            {participant.avatar ? (
              <img
                src={participant.avatar}
                alt={participant.username}
                className="w-32 h-32 rounded-full object-cover ring-8 ring-[#57F287]/40 shadow-2xl z-10"
              />
            ) : (
              <div className="flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-br from-[#57F287] to-[#3BA55C] text-black text-5xl font-bold ring-8 ring-[#57F287]/40 shadow-2xl z-10">
                {participant.username[0]?.toUpperCase()}
              </div>
            )}
            
            {/* Camera off indicator */}
            <div className="absolute bottom-4 left-4 px-3 py-2 bg-black/60 backdrop-blur-sm rounded-full text-white text-sm">
              <CameraOff className="w-4 h-4 inline mr-2" />
              Camera Off
            </div>
          </div>
        )}

        {/* User Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-white font-bold text-lg truncate drop-shadow-lg">
                {participant.username}
                {isCurrentUser && ' (You)'}
              </span>
              <div className={`w-3 h-3 rounded-full ${getConnectionQualityColor(participant.connectionQuality)} shadow-lg`} />
            </div>

            <div className="flex items-center space-x-2">
              {!participant.isAudioEnabled && (
                <div className="flex items-center justify-center w-8 h-8 bg-[#ED4245] rounded-full shadow-lg">
                  <MicOff className="w-4 h-4 text-white" />
                </div>
              )}
              
              {participant.isVideoEnabled && (
                <div className="flex items-center justify-center w-8 h-8 bg-[#57F287] rounded-full shadow-lg">
                  <Video className="w-4 h-4 text-black" />
                </div>
              )}
              
              {participant.isScreenSharing && (
                <div className="flex items-center justify-center w-8 h-8 bg-[#5865F2] rounded-full shadow-lg">
                  <Monitor className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
          </div>

          {/* Speaking Indicator */}
          {participant.isSpeaking && (
            <div className="absolute -top-2 left-4 right-4 h-2 bg-gradient-to-r from-[#57F287] to-[#3BA55C] rounded-full opacity-90 animate-pulse shadow-lg" />
          )}
        </div>

        {/* Hover Actions */}
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              togglePinParticipant(participant.userId);
            }}
            className={`flex items-center justify-center w-10 h-10 backdrop-blur-sm rounded-full transition-all duration-300 shadow-lg ${
              pinnedParticipants.has(participant.userId)
                ? 'bg-yellow-400 text-black'
                : 'bg-black/60 text-white hover:bg-yellow-400 hover:text-black'
            }`}
            title={pinnedParticipants.has(participant.userId) ? 'Unpin' : 'Pin'}
          >
            {pinnedParticipants.has(participant.userId) ? (
              <PinOff className="w-5 h-5" />
            ) : (
              <Pin className="w-5 h-5" />
            )}
          </button>
          
          {!isCurrentUser && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                // Open participant menu
              }}
              className="flex items-center justify-center w-10 h-10 bg-black/60 backdrop-blur-sm rounded-full text-white hover:bg-[#57F287] hover:text-black transition-all duration-300 shadow-lg"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={`flex flex-col h-screen bg-gradient-to-br from-[#0D1117] via-[#161B22] to-[#21262D] text-white ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between h-20 px-8 border-b border-gray-800/50 bg-gradient-to-r from-[#161B22]/95 via-[#21262D]/95 to-[#161B22]/95 backdrop-blur-md shadow-2xl">
        <div className="flex items-center space-x-6">
          <button
            onClick={handleLeaveChannel}
            className="group flex items-center justify-center w-12 h-12 rounded-xl text-gray-400 hover:text-white hover:bg-gradient-to-r hover:from-gray-700/50 hover:to-gray-600/50 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
            title="Leave voice channel"
          >
            <ArrowLeft className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </button>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#57F287]/20 to-[#3BA55C]/20 backdrop-blur-sm border border-[#57F287]/30 shadow-lg shadow-[#57F287]/10">
              <span className="text-3xl">{channelEmoji}</span>
            </div>
            <div className="flex items-center space-x-3">
              <Volume2 className="w-6 h-6 text-[#57F287] drop-shadow-lg" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                {channelName}
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-3 px-4 py-2 bg-gradient-to-r from-[#21262D] to-[#161B22] rounded-full shadow-lg border border-gray-700/50">
            <Users className="w-5 h-5 text-[#57F287]" />
            <span className="text-lg font-medium text-white">{participants.length}</span>
          </div>

          <div className="flex items-center space-x-3 px-4 py-2 bg-gradient-to-r from-[#21262D] to-[#161B22] rounded-full shadow-lg border border-gray-700/50">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-[#57F287]' : 'bg-[#ED4245]'} ${isConnected ? 'shadow-[0_0_8px_rgba(87,242,135,0.8)]' : 'shadow-[0_0_8px_rgba(237,66,69,0.8)]'} animate-pulse`} />
            <span className={`text-sm font-medium ${isConnected ? 'text-[#57F287]' : 'text-[#ED4245]'}`}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* View Layout Buttons */}
          <div className="flex items-center space-x-2 p-1 bg-[#21262D] rounded-lg border border-gray-700/50">
            <button
              onClick={() => setViewLayout('grid')}
              className={`p-2 rounded-md transition-all ${viewLayout === 'grid' ? 'bg-[#57F287] text-black' : 'text-gray-400 hover:text-white hover:bg-gray-700/50'}`}
              title="Grid view"
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewLayout('speaker')}
              className={`p-2 rounded-md transition-all ${viewLayout === 'speaker' ? 'bg-[#57F287] text-black' : 'text-gray-400 hover:text-white hover:bg-gray-700/50'}`}
              title="Speaker view"
            >
              <Rows3 className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={copyChannelInvite}
            className="flex items-center justify-center w-12 h-12 rounded-xl text-gray-400 hover:text-[#57F287] hover:bg-gradient-to-r hover:from-gray-700/50 hover:to-gray-600/50 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
            title="Copy invite link"
          >
            <UserPlus className="w-5 h-5" />
          </button>
          
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="flex items-center justify-center w-12 h-12 rounded-xl text-gray-400 hover:text-[#57F287] hover:bg-gradient-to-r hover:from-gray-700/50 hover:to-gray-600/50 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center justify-center w-12 h-12 rounded-xl text-gray-400 hover:text-[#57F287] hover:bg-gradient-to-r hover:from-gray-700/50 hover:to-gray-600/50 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
            title="Voice settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Participants Grid */}
      <div className="flex-1 p-8 overflow-y-auto">
        {viewLayout === 'speaker' && focusedParticipant ? (
          <div className="flex flex-col space-y-6">
            {/* Main Speaker */}
            <div className="flex-1">
              {participants.find(p => p.userId === focusedParticipant) && 
                createVideoElement(participants.find(p => p.userId === focusedParticipant)!)
              }
            </div>
            
            {/* Other Participants */}
            {participants.filter(p => p.userId !== focusedParticipant).length > 0 && (
              <div className="h-32 grid grid-cols-6 gap-3 overflow-x-auto">
                {participants
                  .filter(p => p.userId !== focusedParticipant)
                  .map(participant => (
                    <div key={participant.userId} className="min-w-[200px]">
                      {createVideoElement(participant)}
                    </div>
                  ))
                }
              </div>
            )}
          </div>
        ) : (
          <div className={`grid ${getGridLayout()} h-full`}>
            {participants.map(participant => createVideoElement(participant))}
          </div>
        )}
      </div>

      {/* Enhanced Controls */}
      <div className="flex items-center justify-center h-24 px-8 border-t border-gray-800/50 bg-gradient-to-r from-[#161B22]/95 via-[#21262D]/95 to-[#161B22]/95 backdrop-blur-md shadow-2xl">
        <div className="flex items-center space-x-6">
          <button
            onClick={webRTC.toggleAudio}
            className={`group flex items-center justify-center w-16 h-16 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-110 ${
              webRTC.isAudioEnabled
                ? 'bg-gradient-to-br from-[#21262D] to-[#161B22] text-white hover:from-[#57F287] hover:to-[#3BA55C] hover:text-black border border-gray-700/50'
                : 'bg-gradient-to-br from-[#ED4245] to-[#C53030] text-white shadow-[0_0_30px_rgba(237,66,69,0.4)] border border-[#ED4245]/50'
            }`}
            title={webRTC.isAudioEnabled ? 'Mute' : 'Unmute'}
          >
            {webRTC.isAudioEnabled ? (
              <Mic className="w-6 h-6 group-hover:scale-110 transition-transform" />
            ) : (
              <MicOff className="w-6 h-6 group-hover:scale-110 transition-transform" />
            )}
          </button>

          <button
            onClick={webRTC.toggleVideo}
            className={`group flex items-center justify-center w-16 h-16 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-110 ${
              webRTC.isVideoEnabled
                ? 'bg-gradient-to-br from-[#57F287] to-[#3BA55C] text-black shadow-[0_0_30px_rgba(87,242,135,0.4)] border border-[#57F287]/50'
                : 'bg-gradient-to-br from-[#21262D] to-[#161B22] text-white hover:from-[#57F287] hover:to-[#3BA55C] hover:text-black border border-gray-700/50'
            }`}
            title={webRTC.isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
          >
            {webRTC.isVideoEnabled ? (
              <Video className="w-6 h-6 group-hover:scale-110 transition-transform" />
            ) : (
              <VideoOff className="w-6 h-6 group-hover:scale-110 transition-transform" />
            )}
          </button>

          <button
            onClick={webRTC.isScreenSharing ? webRTC.stopScreenShare : webRTC.startScreenShare}
            className={`group flex items-center justify-center w-16 h-16 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-110 ${
              webRTC.isScreenSharing
                ? 'bg-gradient-to-br from-[#5865F2] to-[#4752C4] text-white shadow-[0_0_30px_rgba(88,101,242,0.4)] border border-[#5865F2]/50'
                : 'bg-gradient-to-br from-[#21262D] to-[#161B22] text-white hover:from-[#5865F2] hover:to-[#4752C4] border border-gray-700/50'
            }`}
            title={webRTC.isScreenSharing ? 'Stop sharing' : 'Share screen'}
          >
            {webRTC.isScreenSharing ? (
              <Monitor className="w-6 h-6 group-hover:scale-110 transition-transform" />
            ) : (
              <MonitorOff className="w-6 h-6 group-hover:scale-110 transition-transform" />
            )}
          </button>

          <button
            onClick={toggleDeafened}
            className={`group flex items-center justify-center w-16 h-16 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-110 ${
              isDeafened
                ? 'bg-gradient-to-br from-[#ED4245] to-[#C53030] text-white shadow-[0_0_30px_rgba(237,66,69,0.4)] border border-[#ED4245]/50'
                : 'bg-gradient-to-br from-[#21262D] to-[#161B22] text-white hover:from-[#FEE75C] hover:to-[#F59E0B] hover:text-black border border-gray-700/50'
            }`}
            title={isDeafened ? 'Undeafen' : 'Deafen'}
          >
            {isDeafened ? (
              <VolumeX className="w-6 h-6 group-hover:scale-110 transition-transform" />
            ) : (
              <Volume2 className="w-6 h-6 group-hover:scale-110 transition-transform" />
            )}
          </button>

          <div className="w-px h-12 bg-gradient-to-b from-transparent via-gray-600 to-transparent" />

          <button
            onClick={handleLeaveChannel}
            className="group flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#ED4245] to-[#C53030] text-white hover:from-[#C53030] hover:to-[#991B1B] transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-110 shadow-[0_0_30px_rgba(237,66,69,0.4)]"
            title="Leave channel"
          >
            <Phone className="w-6 h-6 rotate-[135deg] group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute top-24 right-8 w-96 bg-gradient-to-br from-[#161B22] via-[#21262D] to-[#161B22] border border-gray-700/50 rounded-2xl shadow-2xl p-8 z-20 backdrop-blur-md">
          <h3 className="text-2xl font-bold mb-6 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Voice Settings</h3>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Input Volume
              </label>
              <input
                type="range"
                min="0"
                max="100"
                className="w-full h-3 bg-gradient-to-r from-gray-700 to-gray-600 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Output Volume
              </label>
              <input
                type="range"
                min="0"
                max="100"
                className="w-full h-3 bg-gradient-to-r from-gray-700 to-gray-600 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>

            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="noise-suppression"
                className="w-5 h-5 text-[#57F287] bg-gray-700 border-gray-600 rounded focus:ring-[#57F287] focus:ring-2"
              />
              <label htmlFor="noise-suppression" className="text-sm text-gray-300">
                Noise Suppression
              </label>
            </div>

            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="echo-cancellation"
                className="w-5 h-5 text-[#57F287] bg-gray-700 border-gray-600 rounded focus:ring-[#57F287] focus:ring-2"
              />
              <label htmlFor="echo-cancellation" className="text-sm text-gray-300">
                Echo Cancellation
              </label>
            </div>
          </div>

          <button
            onClick={() => setShowSettings(false)}
            className="w-full mt-6 bg-gradient-to-r from-[#57F287] to-[#3BA55C] text-black py-3 rounded-xl hover:from-[#3BA55C] hover:to-[#22C55E] transition-all duration-300 font-medium shadow-lg"
          >
            Close Settings
          </button>
        </div>
      )}
    </div>
  );
};

export default VoiceChannelPage;