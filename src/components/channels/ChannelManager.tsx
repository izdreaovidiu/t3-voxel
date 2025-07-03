// src/components/channels/ChannelManager.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, 
  Hash, 
  Volume2, 
  Settings, 
  Trash2, 
  Edit3, 
  MoreHorizontal,
  Sparkles,
  Zap,
  MessageCircle,
  Mic,
  Monitor,
  Lock,
  Users,
  Star,
  Eye,
  EyeOff,
  MicOff,
  Video,
  VideoOff,
  MonitorOff
} from 'lucide-react';

interface Channel {
  id: string;
  name: string;
  type: 'text' | 'voice' | 'video';
  emoji?: string;
  isPrivate?: boolean;
  userLimit?: number;
  description?: string;
  category: string;
}

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

interface ChannelManagerProps {
  channels: { [category: string]: Channel[] };
  onCreateChannel?: (channel: Omit<Channel, 'id'>) => void;
  onEditChannel?: (channelId: string, updates: Partial<Channel>) => void;
  onDeleteChannel?: (channelId: string) => void;
  onChannelClick?: (channelId: string, channelType: string) => void;
  selectedChannelId?: string;
  searchQuery?: string;
  currentVoiceChannelId?: string;
  currentUserId?: string;
  currentUserName?: string;
  currentUserAvatar?: string;
  voiceChannelUsers?: { [channelId: string]: VoiceParticipant[] };
}

export const ChannelManager: React.FC<ChannelManagerProps> = ({
  channels,
  onCreateChannel,
  onEditChannel,
  onDeleteChannel,
  onChannelClick,
  selectedChannelId,
  searchQuery = '',
  currentVoiceChannelId,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  voiceChannelUsers = {}
}) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [newChannel, setNewChannel] = useState({
    name: '',
    type: 'text' as const,
    emoji: '💬',
    isPrivate: false,
    userLimit: undefined as number | undefined,
    description: '',
    category: 'GENERAL'
  });
  const [hoveredChannel, setHoveredChannel] = useState<string | null>(null);
  const [voiceParticipants, setVoiceParticipants] = useState<{ [channelId: string]: VoiceParticipant[] }>({});
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setIsCreateModalOpen(false);
        setEditingChannel(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update voice participants from props
  useEffect(() => {
    setVoiceParticipants(prevParticipants => {
      // Only update if there are actual changes to prevent infinite loops
      const prevKeys = Object.keys(prevParticipants).sort();
      const newKeys = Object.keys(voiceChannelUsers).sort();
      
      // Check if keys are different
      if (prevKeys.length !== newKeys.length || !prevKeys.every((key, index) => key === newKeys[index])) {
        return voiceChannelUsers;
      }
      
      // Check if participant data has changed
      for (const channelId of newKeys) {
        const prevChannelUsers = prevParticipants[channelId] || [];
        const newChannelUsers = voiceChannelUsers[channelId] || [];
        
        if (prevChannelUsers.length !== newChannelUsers.length) {
          return voiceChannelUsers;
        }
        
        // Check if any participant data changed
        const hasChanges = newChannelUsers.some((newUser, index) => {
          const prevUser = prevChannelUsers[index];
          return !prevUser || 
                 prevUser.userId !== newUser.userId ||
                 prevUser.username !== newUser.username ||
                 JSON.stringify(prevUser.status) !== JSON.stringify(newUser.status);
        });
        
        if (hasChanges) {
          return voiceChannelUsers;
        }
      }
      
      // No changes detected, return previous state
      return prevParticipants;
    });
  }, [voiceChannelUsers]);

  const channelTypes = [
    { 
      id: 'text', 
      name: 'Text Channel', 
      icon: Hash, 
      emoji: '💬',
      description: 'Send messages, images, GIFs, emoji, opinions, and puns',
      color: 'text-blue-400'
    },
    { 
      id: 'voice', 
      name: 'Voice Channel', 
      icon: Volume2, 
      emoji: '🔊',
      description: 'Hang out together with voice, video, and screen share',
      color: 'text-green-400'
    },
    { 
      id: 'video', 
      name: 'Video Channel', 
      icon: Monitor, 
      emoji: '📹',
      description: 'Voice and video calls with up to 25 people',
      color: 'text-purple-400'
    }
  ];

  const channelEmojis = [
    '💬', '🎮', '🎵', '📢', '🏆', '🎨', '📚', '🍕', '🎬', '⚽',
    '🚀', '💻', '🎯', '🔥', '⭐', '🎉', '🌟', '💎', '🎪', '🎭'
  ];

  const handleCreateChannel = () => {
    if (!newChannel.name.trim()) return;

    const channelData = {
      ...newChannel,
      name: newChannel.name.trim(),
      userLimit: newChannel.type === 'voice' || newChannel.type === 'video' ? newChannel.userLimit : undefined
    };

    console.log('Creating channel with data:', channelData); // Debug log
    onCreateChannel?.(channelData);
    setIsCreateModalOpen(false);
    setNewChannel({
      name: '',
      type: 'text',
      emoji: '💬',
      isPrivate: false,
      userLimit: undefined,
      description: '',
      category: 'GENERAL'
    });
  };

  const handleEditChannel = () => {
    if (!editingChannel || !editingChannel.name.trim()) return;

    onEditChannel?.(editingChannel.id, {
      name: editingChannel.name.trim(),
      emoji: editingChannel.emoji,
      description: editingChannel.description,
      isPrivate: editingChannel.isPrivate,
      userLimit: editingChannel.userLimit
    });
    setEditingChannel(null);
  };

  const getChannelIcon = (type: string) => {
    switch (type) {
      case 'text': return Hash;
      case 'voice': return Volume2;
      case 'video': return Monitor;
      default: return Hash;
    }
  };

  const filterChannels = (channelList: Channel[]) => {
    if (!searchQuery) return channelList;
    return channelList.filter(channel =>
      channel.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const getStatusEmoji = (participant: VoiceParticipant) => {
    if (participant.status.isScreenSharing) return '🖥️';
    if (participant.status.isVideoEnabled) return '📹';
    if (!participant.status.isAudioEnabled) return '🔇';
    return '🎤';
  };

  const getStatusColor = (participant: VoiceParticipant) => {
    if (participant.status.isScreenSharing) return 'text-purple-400';
    if (participant.status.isVideoEnabled) return 'text-blue-400';
    if (!participant.status.isAudioEnabled) return 'text-red-400';
    return 'text-green-400';
  };

  return (
    <>
      {/* Channels List */}
      <div className="space-y-6">
        {Object.entries(channels).map(([category, channelList]) => {
          const filteredChannels = filterChannels(channelList);
          if (filteredChannels.length === 0 && searchQuery) return null;

          // Separate channels by type
          const textChannels = filteredChannels.filter(ch => ch.type === 'text');
          const voiceChannels = filteredChannels.filter(ch => ch.type === 'voice' || ch.type === 'video');

          return (
            <div key={category} className="space-y-2">
              {/* Category Header */}
              <div className="flex items-center justify-between px-2">
                <h3 className="text-xs font-bold tracking-wider text-gray-400 uppercase flex items-center space-x-2">
                  <Sparkles className="h-3 w-3" />
                  <span>{category}</span>
                </h3>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="btn-interactive flex h-5 w-5 items-center justify-center rounded text-gray-400 hover:bg-gray-700/50 hover:text-[#57F287] hover:rotate-90 hover:scale-110"
                  title="Create Channel"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>

              {/* Text Channels */}
              {textChannels.length > 0 && (
                <div className="space-y-1">
                  {textChannels.map(channel => (
                    <div
                      key={channel.id}
                      className={`group flex cursor-pointer items-center rounded-lg px-3 py-2 transition-all duration-200 relative ${
                        selectedChannelId === channel.id
                          ? 'bg-[#57F287]/20 text-[#57F287] shadow-[0_0_20px_rgba(87,242,135,0.1)]'
                          : 'text-gray-300 hover:bg-gray-700/30 hover:text-white'
                      }`}
                      onClick={() => onChannelClick?.(channel.id, channel.type)}
                      onMouseEnter={() => setHoveredChannel(channel.id)}
                      onMouseLeave={() => setHoveredChannel(null)}
                    >
                      <span className="mr-2 text-lg transition-transform group-hover:scale-110">
                        {channel.emoji}
                      </span>
                      <Hash className="mr-2 h-5 w-5" />
                      <span className="flex-1 text-sm font-medium">
                        {channel.name}
                      </span>
                      
                      {channel.isPrivate && (
                        <Lock className="h-3 w-3 text-gray-500" />
                      )}

                      {/* Three dots menu */}
                      {hoveredChannel === channel.id && (
                        <div className="absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingChannel(channel);
                            }}
                            className="btn-interactive flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:bg-gray-600 hover:text-white"
                            title="Edit Channel"
                          >
                            <MoreHorizontal className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Separator */}
              {textChannels.length > 0 && voiceChannels.length > 0 && (
                <div className="my-3 flex items-center">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent" />
                  <div className="px-3 text-xs text-gray-500 font-medium">
                    <Volume2 className="h-3 w-3" />
                  </div>
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent" />
                </div>
              )}

              {/* Voice/Video Channels */}
              {voiceChannels.length > 0 && (
                <div className="space-y-1">
                  {voiceChannels.map(channel => {
                    const Icon = getChannelIcon(channel.type);
                    const channelParticipants = voiceParticipants[channel.id] || [];
                    const isCurrentUserInChannel = currentVoiceChannelId === channel.id;
                    const totalUsers = channelParticipants.length + (isCurrentUserInChannel ? 1 : 0);
                    
                    return (
                      <div key={channel.id} className="space-y-1">
                        <div
                          className={`group flex cursor-pointer items-center rounded-lg px-3 py-2 transition-all duration-200 relative ${
                            selectedChannelId === channel.id || currentVoiceChannelId === channel.id
                              ? 'bg-[#57F287]/20 text-[#57F287] shadow-[0_0_20px_rgba(87,242,135,0.1)]'
                              : 'text-gray-300 hover:bg-gray-700/30 hover:text-white'
                          }`}
                          onClick={() => onChannelClick?.(channel.id, channel.type)}
                          onMouseEnter={() => setHoveredChannel(channel.id)}
                          onMouseLeave={() => setHoveredChannel(null)}
                        >
                          <span className="mr-2 text-lg transition-transform group-hover:scale-110">
                            {channel.emoji}
                          </span>
                          <Icon className="mr-2 h-5 w-5" />
                          <span className="flex-1 text-sm font-medium">
                            {channel.name}
                          </span>
                          
                          <div className="flex items-center space-x-2">
                            {(totalUsers > 0 || channel.userLimit) && (
                              <div className="flex items-center space-x-1 text-xs text-gray-400 bg-gray-700/50 px-2 py-1 rounded">
                                <Users className="h-3 w-3" />
                                <span>{totalUsers}{channel.userLimit ? `/${channel.userLimit}` : ''}</span>
                              </div>
                            )}

                            {channel.isPrivate && (
                              <Lock className="h-3 w-3 text-gray-500" />
                            )}

                            {/* Three dots menu */}
                            {hoveredChannel === channel.id && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingChannel(channel);
                                }}
                                className="btn-interactive flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:bg-gray-600 hover:text-white z-10"
                                title="Edit Channel"
                              >
                                <MoreHorizontal className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>
                        
                        {/* Connected Users */}
                        {(isCurrentUserInChannel || channelParticipants.length > 0) && (
                          <div className="ml-8 space-y-1">
                            {/* Current User */}
                            {isCurrentUserInChannel && (
                              <div className="flex items-center space-x-2 px-2 py-1 rounded-lg bg-[#57F287]/10 text-[#57F287] text-xs">
                                <div className="w-4 h-4 rounded-full overflow-hidden bg-gradient-to-br from-[#57F287] to-[#3BA55C] flex items-center justify-center">
                                  {currentUserAvatar ? (
                                    <img src={currentUserAvatar} alt={currentUserName || 'You'} className="w-full h-full object-cover" />
                                  ) : (
                                    <span className="text-black text-xs font-bold">{(currentUserName?.[0] || 'Y').toUpperCase()}</span>
                                  )}
                                </div>
                                <span className="font-medium">{currentUserName || 'You'}</span>
                                <div className="ml-auto flex items-center space-x-1">
                                  <span className="text-xs">🎤</span>
                                </div>
                              </div>
                            )}
                            
                            {/* Other Participants */}
                            {channelParticipants.map(participant => (
                              <div key={participant.userId} className="flex items-center space-x-2 px-2 py-1 rounded-lg hover:bg-gray-700/30 text-gray-300 text-xs">
                                <div className="w-4 h-4 rounded-full overflow-hidden bg-gradient-to-br from-[#5865F2] to-[#4752C4] flex items-center justify-center">
                                  {participant.avatar ? (
                                    <img src={participant.avatar} alt={participant.username} className="w-full h-full object-cover" />
                                  ) : (
                                    <span className="text-white text-xs font-bold">{participant.username[0]?.toUpperCase()}</span>
                                  )}
                                </div>
                                <span className="flex-1">{participant.username}</span>
                                <div className="flex items-center space-x-1">
                                  {/* Status Emojis */}
                                  <span 
                                    className={`text-xs ${getStatusColor(participant)}`} 
                                    title={
                                      participant.status.isScreenSharing ? 'Screen Sharing' :
                                      participant.status.isVideoEnabled ? 'Video On' :
                                      !participant.status.isAudioEnabled ? 'Muted' : 'Speaking'
                                    }
                                  >
                                    {getStatusEmoji(participant)}
                                  </span>
                                  
                                  {/* Additional status indicators */}
                                  {participant.status.isScreenSharing && (
                                    <Monitor className="h-3 w-3 text-purple-400" />
                                  )}
                                  {participant.status.isVideoEnabled && !participant.status.isScreenSharing && (
                                    <Video className="h-3 w-3 text-blue-400" />
                                  )}
                                  {!participant.status.isAudioEnabled && (
                                    <MicOff className="h-3 w-3 text-red-400" />
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Create Channel Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-backdrop-in">
          <div className="relative w-full max-w-md" ref={modalRef}>
            <div className="rounded-2xl border border-gray-700/50 bg-gradient-to-br from-[#161B22] via-[#21262D] to-[#0D1117] p-6 shadow-2xl animate-modal-in">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                  <Zap className="h-5 w-5 text-[#57F287] animate-pulse-glow" />
                  <span>Create Channel</span>
                </h3>
                <p className="text-gray-400 text-sm mt-1">Set up a new place to chat</p>
              </div>

              {/* Channel Type Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-white mb-3">Channel Type</label>
                <div className="space-y-2">
                  {channelTypes.map(type => (
                    <button
                      key={type.id}
                      onClick={() => setNewChannel({ ...newChannel, type: type.id as any, emoji: type.emoji })}
                      className={`w-full p-4 rounded-xl border text-left transition-all duration-200 hover-lift ${
                        newChannel.type === type.id
                          ? 'border-[#57F287]/50 bg-[#57F287]/10 shadow-[0_0_20px_rgba(87,242,135,0.2)]'
                          : 'border-gray-700/50 bg-gray-800/30 hover:border-gray-600/50'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`p-2 rounded-lg bg-gray-700/50 ${type.color}`}>
                          <type.icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-white">{type.name}</h4>
                          <p className="text-sm text-gray-400 mt-1">{type.description}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Channel Name */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-white mb-2">Channel Name</label>
                <input
                  type="text"
                  value={newChannel.name}
                  onChange={(e) => setNewChannel({ ...newChannel, name: e.target.value })}
                  placeholder="awesome-channel"
                  className="w-full rounded-lg border border-gray-700/50 bg-[#21262D] py-2 px-3 text-white placeholder-gray-400 focus:border-[#57F287] focus:ring-[#57F287]/20 focus:outline-none"
                />
              </div>

              {/* Emoji Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-white mb-2">Channel Emoji</label>
                <div className="grid grid-cols-10 gap-1">
                  {channelEmojis.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => setNewChannel({ ...newChannel, emoji })}
                      className={`p-2 rounded-lg text-lg transition-all duration-200 hover:scale-110 ${
                        newChannel.emoji === emoji 
                          ? 'bg-[#57F287]/20 ring-2 ring-[#57F287]/50' 
                          : 'hover:bg-gray-700/50'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Voice Channel Settings */}
              {(newChannel.type === 'voice' || newChannel.type === 'video') && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-white mb-2">User Limit</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      value={newChannel.userLimit || ''}
                      onChange={(e) => setNewChannel({ ...newChannel, userLimit: e.target.value ? parseInt(e.target.value) : undefined })}
                      placeholder="No limit"
                      min="0"
                      max="99"
                      className="flex-1 rounded-lg border border-gray-700/50 bg-[#21262D] py-2 px-3 text-white placeholder-gray-400 focus:border-[#57F287] focus:ring-[#57F287]/20 focus:outline-none text-center"
                    />
                    <div className="flex flex-col">
                      <button
                        type="button"
                        onClick={() => {
                          const currentValue = newChannel.userLimit || 0;
                          const newValue = Math.min(99, currentValue + 1);
                          setNewChannel({ ...newChannel, userLimit: newValue });
                        }}
                        className="w-6 h-5 bg-[#21262D] hover:bg-[#57F287] border border-gray-700/50 hover:border-[#57F287] text-gray-400 hover:text-black text-xs flex items-center justify-center transition-all duration-200 shadow-inner"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const currentValue = newChannel.userLimit || 0;
                          const newValue = Math.max(0, currentValue - 1);
                          setNewChannel({ ...newChannel, userLimit: newValue === 0 ? undefined : newValue });
                        }}
                        className="w-6 h-5 bg-[#21262D] hover:bg-[#57F287] border border-gray-700/50 hover:border-[#57F287] border-t-0 text-gray-400 hover:text-black text-xs flex items-center justify-center transition-all duration-200 shadow-inner"
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Privacy Setting */}
              <div className="mb-6">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newChannel.isPrivate}
                    onChange={(e) => setNewChannel({ ...newChannel, isPrivate: e.target.checked })}
                    className="rounded border-gray-700 bg-[#21262D] text-[#57F287] focus:ring-[#57F287]/20"
                  />
                  <div>
                    <span className="text-white font-medium">Private Channel</span>
                    <p className="text-sm text-gray-400">Only selected members can view this channel</p>
                  </div>
                </label>
              </div>

              {/* Actions */}
              <div className="flex space-x-3">
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 rounded-lg bg-gray-700/50 py-2 px-4 text-white transition-colors hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateChannel}
                  disabled={!newChannel.name.trim()}
                  className="flex-1 rounded-lg bg-[#57F287] py-2 px-4 text-black font-medium transition-colors hover:bg-[#3BA55C] disabled:opacity-50 disabled:cursor-not-allowed btn-interactive"
                >
                  Create Channel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Channel Modal */}
      {editingChannel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-backdrop-in">
          <div className="relative w-full max-w-md" ref={modalRef}>
            <div className="rounded-2xl border border-gray-700/50 bg-gradient-to-br from-[#161B22] via-[#21262D] to-[#0D1117] p-6 shadow-2xl animate-modal-in">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                  <Edit3 className="h-5 w-5 text-[#57F287]" />
                  <span>Edit Channel</span>
                </h3>
                <p className="text-gray-400 text-sm mt-1">Update channel settings</p>
              </div>

              {/* Channel Name */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-white mb-2">Channel Name</label>
                <input
                  type="text"
                  value={editingChannel.name}
                  onChange={(e) => setEditingChannel({ ...editingChannel, name: e.target.value })}
                  className="w-full rounded-lg border border-gray-700/50 bg-[#21262D] py-2 px-3 text-white focus:border-[#57F287] focus:ring-[#57F287]/20 focus:outline-none"
                />
              </div>

              {/* Emoji Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-white mb-2">Channel Emoji</label>
                <div className="grid grid-cols-10 gap-1">
                  {channelEmojis.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => setEditingChannel({ ...editingChannel, emoji })}
                      className={`p-2 rounded-lg text-lg transition-all duration-200 hover:scale-110 ${
                        editingChannel.emoji === emoji 
                          ? 'bg-[#57F287]/20 ring-2 ring-[#57F287]/50' 
                          : 'hover:bg-gray-700/50'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-2">
                <button
                  onClick={() => setEditingChannel(null)}
                  className="flex-1 rounded-lg bg-gray-700/50 py-2 px-4 text-white transition-colors hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (editingChannel) {
                      onDeleteChannel?.(editingChannel.id);
                      setEditingChannel(null);
                    }
                  }}
                  className="rounded-lg bg-[#ED4245] py-2 px-4 text-white transition-colors hover:bg-[#C03A3C] btn-interactive"
                  title="Delete Channel"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button
                  onClick={handleEditChannel}
                  className="flex-1 rounded-lg bg-[#57F287] py-2 px-4 text-black font-medium transition-colors hover:bg-[#3BA55C] btn-interactive"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
