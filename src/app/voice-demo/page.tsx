// Enhanced Voice Channel Demo Page
"use client";

import React, { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useEnhancedSocketContext } from '~/contexts/EnhancedSocketContext';
import VoiceChannelPage from '~/components/voice/VoiceChannelPage';
import { 
  Volume2, 
  Video, 
  Monitor, 
  Users, 
  Settings,
  ArrowLeft,
  Mic,
  MicOff
} from 'lucide-react';

const VoiceChannelDemo = () => {
  const { user } = useUser();
  const { 
    isConnected, 
    joinVoiceChannel, 
    leaveVoiceChannel, 
    getVoiceChannelData,
    isInVoiceChannel 
  } = useEnhancedSocketContext();
  
  const [activeChannel, setActiveChannel] = useState<string | null>(null);
  const [showVoiceInterface, setShowVoiceInterface] = useState(false);

  // Mock channels for demo
  const demoChannels = [
    { 
      id: 'voice-general', 
      name: 'General Voice', 
      emoji: '🎤', 
      type: 'voice',
      participantCount: 3
    },
    { 
      id: 'voice-gaming', 
      name: 'Gaming', 
      emoji: '🎮', 
      type: 'voice',
      participantCount: 7
    },
    { 
      id: 'video-meeting', 
      name: 'Video Meeting', 
      emoji: '📹', 
      type: 'video',
      participantCount: 2
    },
    { 
      id: 'voice-music', 
      name: 'Music Listening', 
      emoji: '🎵', 
      type: 'voice',
      participantCount: 5
    }
  ];

  const handleJoinChannel = (channelId: string, channelType: 'voice' | 'video') => {
    console.log(`Joining ${channelType} channel: ${channelId}`);
    joinVoiceChannel(channelId, channelType);
    setActiveChannel(channelId);
    setShowVoiceInterface(true);
  };

  const handleLeaveChannel = () => {
    if (activeChannel) {
      leaveVoiceChannel(activeChannel);
    }
    setActiveChannel(null);
    setShowVoiceInterface(false);
  };

  const handleSwitchToTextChannel = (channelId: string) => {
    console.log(`Switching to text channel: ${channelId}`);
    setShowVoiceInterface(false);
  };

  if (showVoiceInterface && activeChannel) {
    const channel = demoChannels.find(ch => ch.id === activeChannel);
    return (
      <VoiceChannelPage
        channelId={activeChannel}
        channelName={channel?.name || 'Voice Channel'}
        channelEmoji={channel?.emoji || '🔊'}
        serverId="demo-server"
        onLeaveChannel={handleLeaveChannel}
        onSwitchToTextChannel={handleSwitchToTextChannel}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0D1117] via-[#161B22] to-[#21262D] text-white">
      {/* Header */}
      <div className="border-b border-gray-800/50 bg-gradient-to-r from-[#161B22]/95 via-[#21262D]/95 to-[#161B22]/95 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-8 py-6">
          <div className="flex items-center space-x-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#57F287]/20 to-[#3BA55C]/20 backdrop-blur-sm border border-[#57F287]/30 shadow-lg">
              <Volume2 className="w-8 h-8 text-[#57F287]" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Voice Channel Demo
              </h1>
              <p className="text-gray-400 mt-1">
                Test the enhanced voice channel interface like Discord
              </p>
            </div>
          </div>

          {/* Connection Status */}
          <div className="mt-6 flex items-center space-x-4">
            <div className="flex items-center space-x-3 px-4 py-2 bg-gradient-to-r from-[#21262D] to-[#161B22] rounded-full shadow-lg border border-gray-700/50">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-[#57F287]' : 'bg-[#ED4245]'} ${isConnected ? 'shadow-[0_0_8px_rgba(87,242,135,0.8)]' : 'shadow-[0_0_8px_rgba(237,66,69,0.8)]'} animate-pulse`} />
              <span className={`text-sm font-medium ${isConnected ? 'text-[#57F287]' : 'text-[#ED4245]'}`}>
                {isConnected ? 'Connected to Server' : 'Disconnected'}
              </span>
            </div>
            
            {user && (
              <div className="flex items-center space-x-3 px-4 py-2 bg-gradient-to-r from-[#21262D] to-[#161B22] rounded-full shadow-lg border border-gray-700/50">
                {user.imageUrl ? (
                  <img 
                    src={user.imageUrl} 
                    alt={user.firstName || 'User'} 
                    className="w-6 h-6 rounded-full" 
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-[#57F287] flex items-center justify-center text-black text-sm font-bold">
                    {(user.firstName || user.username || 'U')[0].toUpperCase()}
                  </div>
                )}
                <span className="text-sm text-gray-300">
                  {user.firstName && user.lastName 
                    ? `${user.firstName} ${user.lastName}` 
                    : user.username || user.firstName || 'User'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-8 py-12">
        <div className="grid gap-8">
          
          {/* Instructions */}
          <div className="bg-gradient-to-br from-[#161B22] via-[#21262D] to-[#161B22] rounded-2xl p-8 border border-gray-700/50 shadow-2xl">
            <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#57F287] to-[#3BA55C] bg-clip-text text-transparent">
              How to Test Voice Channels
            </h2>
            <div className="grid md:grid-cols-2 gap-6 text-gray-300">
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-[#57F287] rounded-full flex items-center justify-center text-black font-bold">1</div>
                  <span>Click on any voice channel below to join</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-[#57F287] rounded-full flex items-center justify-center text-black font-bold">2</div>
                  <span>Allow microphone/camera permissions when prompted</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-[#57F287] rounded-full flex items-center justify-center text-black font-bold">3</div>
                  <span>Test audio/video controls in the interface</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-[#5865F2] rounded-full flex items-center justify-center text-white font-bold">4</div>
                  <span>Try screen sharing and different view layouts</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-[#5865F2] rounded-full flex items-center justify-center text-white font-bold">5</div>
                  <span>Open voice settings to adjust audio levels</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-[#5865F2] rounded-full flex items-center justify-center text-white font-bold">6</div>
                  <span>Leave channel to return to this page</span>
                </div>
              </div>
            </div>
          </div>

          {/* Available Voice Channels */}
          <div className="bg-gradient-to-br from-[#161B22] via-[#21262D] to-[#161B22] rounded-2xl p-8 border border-gray-700/50 shadow-2xl">
            <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              Available Voice Channels
            </h2>
            
            <div className="grid gap-4">
              {demoChannels.map((channel) => (
                <div
                  key={channel.id}
                  className="group flex items-center justify-between p-6 bg-gradient-to-r from-[#21262D] to-[#161B22] rounded-xl border border-gray-700/50 hover:border-[#57F287]/50 transition-all duration-300 cursor-pointer hover:scale-[1.02] shadow-lg hover:shadow-2xl"
                  onClick={() => handleJoinChannel(channel.id, channel.type as 'voice' | 'video')}
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-[#57F287]/20 to-[#3BA55C]/20 group-hover:from-[#57F287]/30 group-hover:to-[#3BA55C]/30 transition-all">
                      <span className="text-2xl">{channel.emoji}</span>
                    </div>
                    
                    <div>
                      <div className="flex items-center space-x-2">
                        {channel.type === 'voice' ? (
                          <Volume2 className="w-5 h-5 text-[#57F287]" />
                        ) : (
                          <Video className="w-5 h-5 text-[#5865F2]" />
                        )}
                        <h3 className="text-lg font-bold text-white group-hover:text-[#57F287] transition-colors">
                          {channel.name}
                        </h3>
                      </div>
                      <p className="text-sm text-gray-400 mt-1">
                        {channel.type === 'voice' ? 'Voice Channel' : 'Video Channel'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2 px-3 py-2 bg-[#21262D] rounded-full">
                      <Users className="w-4 h-4 text-[#57F287]" />
                      <span className="text-sm font-medium text-white">{channel.participantCount}</span>
                    </div>
                    
                    <div className="w-2 h-2 rounded-full bg-[#57F287] shadow-[0_0_6px_rgba(87,242,135,0.6)] animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
            
            {/* Features Showcase */}
            <div className="mt-8 pt-8 border-t border-gray-700/50">
              <h3 className="text-lg font-bold mb-4 text-gray-300">Voice Channel Features</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-3 p-4 bg-[#21262D] rounded-lg">
                  <Mic className="w-6 h-6 text-[#57F287]" />
                  <div>
                    <p className="font-medium text-white">Audio Controls</p>
                    <p className="text-sm text-gray-400">Mute/unmute, deafen</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-4 bg-[#21262D] rounded-lg">
                  <Video className="w-6 h-6 text-[#5865F2]" />
                  <div>
                    <p className="font-medium text-white">Video Support</p>
                    <p className="text-sm text-gray-400">Camera on/off</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-4 bg-[#21262D] rounded-lg">
                  <Monitor className="w-6 h-6 text-[#FEE75C]" />
                  <div>
                    <p className="font-medium text-white">Screen Share</p>
                    <p className="text-sm text-gray-400">Share your screen</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Connection Info */}
          <div className="bg-gradient-to-br from-[#161B22] via-[#21262D] to-[#161B22] rounded-2xl p-8 border border-gray-700/50 shadow-2xl">
            <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              Technical Information
            </h2>
            <div className="grid md:grid-cols-2 gap-6 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Connection Status:</span>
                  <span className={isConnected ? 'text-[#57F287]' : 'text-[#ED4245]'}>
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">User ID:</span>
                  <span className="text-white font-mono">{user?.id?.slice(-8) || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Username:</span>
                  <span className="text-white">{user?.username || user?.firstName || 'Anonymous'}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Context Provider:</span>
                  <span className="text-[#57F287]">EnhancedSocketContext</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Voice Features:</span>
                  <span className="text-[#57F287]">Enabled</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Interface:</span>
                  <span className="text-[#57F287]">Discord-like</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceChannelDemo;