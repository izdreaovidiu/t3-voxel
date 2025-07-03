// src/components/voice/PrivateVoiceChannel.tsx
'use client';

import React from 'react';
import { 
  Phone, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Headphones, 
  Settings, 
  Volume2,
  VolumeX,
  Monitor,
  MonitorOff,
  Users,
  Minimize2,
  X
} from 'lucide-react';

interface VoiceUser {
  id: string;
  username: string;
  avatar?: string;
  isMuted: boolean;
  isDeafened: boolean;
  isVideoEnabled: boolean;
  isSpeaking: boolean;
}

interface PrivateVoiceChannelProps {
  isActive: boolean;
  callType: 'voice' | 'video';
  participants: VoiceUser[];
  currentUserId: string;
  channelName?: string;
  onEndCall?: () => void;
  onToggleMute?: () => void;
  onToggleDeafen?: () => void;
  onToggleVideo?: () => void;
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
}

export const PrivateVoiceChannel: React.FC<PrivateVoiceChannelProps> = ({
  isActive,
  callType,
  participants,
  currentUserId,
  channelName = 'Private',
  onEndCall,
  onToggleMute,
  onToggleDeafen,
  onToggleVideo,
  isMinimized = false,
  onToggleMinimize
}) => {
  if (!isActive) return null;

  const currentUser = participants.find(p => p.id === currentUserId);
  const otherParticipants = participants.filter(p => p.id !== currentUserId);

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 left-4 z-50">
        <button
          onClick={onToggleMinimize}
          className="btn-interactive flex items-center space-x-3 bg-[#57F287] text-black px-4 py-3 rounded-xl shadow-lg hover:bg-[#3BA55C] hover:shadow-xl"
        >
          <div className="flex -space-x-2">
            {participants.slice(0, 3).map(participant => (
              <div key={participant.id} className="relative">
                {participant.avatar ? (
                  <img
                    src={participant.avatar}
                    alt={participant.username}
                    className="h-8 w-8 rounded-full border-2 border-black object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#21262D] to-[#161B22] border-2 border-black font-bold text-white text-xs">
                    {participant.username[0].toUpperCase()}
                  </div>
                )}
                {participant.isSpeaking && (
                  <div className="absolute inset-0 rounded-full ring-2 ring-green-400 animate-pulse-glow" />
                )}
              </div>
            ))}
          </div>
          
          <div className="flex items-center space-x-2">
            <Phone className="h-4 w-4" />
            <span className="font-medium">{channelName}</span>
            <div className="flex items-center space-x-1 text-xs">
              <Users className="h-3 w-3" />
              <span>{participants.length}</span>
            </div>
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[#21262D] border border-gray-700/50 rounded-xl p-4 mb-4 mx-4 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#57F287] text-black">
            <Phone className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-white font-medium">{channelName}</h3>
            <p className="text-gray-400 text-sm flex items-center space-x-1">
              <Users className="h-3 w-3" />
              <span>{participants.length} participant{participants.length !== 1 ? 's' : ''}</span>
              {callType === 'video' && (
                <>
                  <span>•</span>
                  <Monitor className="h-3 w-3" />
                  <span>Video</span>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onToggleMinimize}
            className="btn-interactive flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-700/50 hover:text-white"
            title="Minimize"
          >
            <Minimize2 className="h-4 w-4" />
          </button>
          
          <button
            onClick={onEndCall}
            className="btn-interactive flex h-8 w-8 items-center justify-center rounded-lg bg-[#ED4245] text-white hover:bg-[#C03A3C]"
            title="End Call"
          >
            <PhoneOff className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Participants */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {participants.map(participant => (
          <div
            key={participant.id}
            className={`relative group transition-all duration-200 ${
              participant.isSpeaking 
                ? 'ring-2 ring-[#57F287] animate-pulse-glow' 
                : 'hover:ring-2 hover:ring-gray-500/50'
            } rounded-xl overflow-hidden`}
          >
            {/* Video/Avatar */}
            <div className="aspect-square bg-[#161B22] rounded-xl flex items-center justify-center relative overflow-hidden">
              {callType === 'video' && participant.isVideoEnabled ? (
                <div className="w-full h-full bg-gradient-to-br from-[#57F287]/20 to-[#3BA55C]/20 flex items-center justify-center">
                  <Monitor className="h-8 w-8 text-[#57F287]" />
                  <span className="absolute inset-0 bg-black/20 flex items-center justify-center text-white text-xs">
                    Video Feed
                  </span>
                </div>
              ) : (
                <div className="relative">
                  {participant.avatar ? (
                    <img
                      src={participant.avatar}
                      alt={participant.username}
                      className="h-16 w-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#57F287] to-[#3BA55C] font-bold text-black text-xl">
                      {participant.username[0].toUpperCase()}
                    </div>
                  )}
                </div>
              )}

              {/* Status Indicators */}
              <div className="absolute top-2 right-2 flex space-x-1">
                {participant.isMuted && (
                  <div className="bg-[#ED4245] rounded-full p-1">
                    <MicOff className="h-3 w-3 text-white" />
                  </div>
                )}
                {participant.isDeafened && (
                  <div className="bg-[#ED4245] rounded-full p-1">
                    <VolumeX className="h-3 w-3 text-white" />
                  </div>
                )}
                {callType === 'video' && !participant.isVideoEnabled && (
                  <div className="bg-gray-600 rounded-full p-1">
                    <MonitorOff className="h-3 w-3 text-white" />
                  </div>
                )}
              </div>

              {/* Speaking Indicator */}
              {participant.isSpeaking && (
                <div className="absolute bottom-2 left-2">
                  <div className="bg-[#57F287] rounded-full px-2 py-1 flex items-center space-x-1">
                    <Volume2 className="h-3 w-3 text-black" />
                    <span className="text-xs font-medium text-black">Speaking</span>
                  </div>
                </div>
              )}
            </div>

            {/* Username */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
              <p className="text-white text-sm font-medium truncate">
                {participant.username}
                {participant.id === currentUserId && ' (You)'}
              </p>
            </div>
          </div>
        ))}

        {/* Add more participants placeholder */}
        {participants.length < 9 && (
          <div className="aspect-square bg-[#161B22] border-2 border-dashed border-gray-600 rounded-xl flex items-center justify-center">
            <div className="text-center text-gray-500">
              <Users className="h-6 w-6 mx-auto mb-1" />
              <p className="text-xs">Invite more</p>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      {currentUser && (
        <div className="flex items-center justify-center space-x-3">
          <button
            onClick={onToggleMute}
            className={`btn-interactive flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-300 ${
              currentUser.isMuted
                ? 'bg-[#ED4245] text-white shadow-[0_0_15px_rgba(237,66,69,0.5)]'
                : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600 hover:text-white'
            }`}
            title={currentUser.isMuted ? 'Unmute' : 'Mute'}
          >
            {currentUser.isMuted ? (
              <MicOff className="h-5 w-5" />
            ) : (
              <Mic className="h-5 w-5" />
            )}
          </button>

          <button
            onClick={onToggleDeafen}
            className={`btn-interactive flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-300 ${
              currentUser.isDeafened
                ? 'bg-[#ED4245] text-white shadow-[0_0_15px_rgba(237,66,69,0.5)]'
                : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600 hover:text-white'
            }`}
            title={currentUser.isDeafened ? 'Undeafen' : 'Deafen'}
          >
            {currentUser.isDeafened ? (
              <VolumeX className="h-5 w-5" />
            ) : (
              <Headphones className="h-5 w-5" />
            )}
          </button>

          {callType === 'video' && (
            <button
              onClick={onToggleVideo}
              className={`btn-interactive flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-300 ${
                currentUser.isVideoEnabled
                  ? 'bg-[#57F287] text-black shadow-[0_0_15px_rgba(87,242,135,0.3)]'
                  : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600 hover:text-white'
              }`}
              title={currentUser.isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
            >
              {currentUser.isVideoEnabled ? (
                <Monitor className="h-5 w-5" />
              ) : (
                <MonitorOff className="h-5 w-5" />
              )}
            </button>
          )}

          <button className="btn-interactive flex h-12 w-12 items-center justify-center rounded-xl bg-gray-700/50 text-gray-300 hover:bg-gray-600 hover:text-white">
            <Settings className="h-5 w-5" />
          </button>

          <div className="h-8 w-px bg-gray-600" />

          <button
            onClick={onEndCall}
            className="btn-interactive flex h-12 w-12 items-center justify-center rounded-xl bg-[#ED4245] text-white hover:bg-[#C03A3C] shadow-[0_0_15px_rgba(237,66,69,0.3)]"
            title="End Call"
          >
            <PhoneOff className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
};
