// src/components/presence/UserProfileModal.tsx
'use client';

import React from 'react';
import { X, Crown, Shield, Calendar, Activity, Globe, MessageCircle, UserPlus, UserMinus, Phone, Video } from 'lucide-react';
import type { UserPresence } from '~/hooks/usePresence';

interface UserProfileModalProps {
  user: {
    id: string;
    name: string;
    username?: string;
    avatar?: string;
    role?: string;
    joinedAt?: string;
    status?: string;
    activity?: string;
    bio?: string;
    presence?: UserPresence;
  };
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: string;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  user,
  isOpen,
  onClose,
  currentUserId
}) => {
  if (!isOpen) return null;

  const getRoleIcon = (role?: string) => {
    switch (role) {
      case "admin":
        return <Crown className="h-4 w-4 text-[#FEE75C]" />;
      case "moderator":
        return <Shield className="h-4 w-4 text-[#57F287]" />;
      default:
        return null;
    }
  };

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case "admin":
        return "bg-[#FEE75C]/20 text-[#FEE75C] border-[#FEE75C]/30";
      case "moderator":
        return "bg-[#57F287]/20 text-[#57F287] border-[#57F287]/30";
      default:
        return "bg-gray-600/20 text-gray-400 border-gray-600/30";
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "online":
        return "bg-[#57F287] shadow-[0_0_10px_rgba(87,242,135,0.6)]";
      case "away":
        return "bg-[#FEE75C] shadow-[0_0_10px_rgba(254,231,92,0.6)]";
      case "dnd":
        return "bg-[#ED4245] shadow-[0_0_10px_rgba(237,66,69,0.6)]";
      case "offline":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case "online": return "Online";
      case "away": return "Away";
      case "dnd": return "Do Not Disturb";
      case "offline": return "Offline";
      default: return "Unknown";
    }
  };

  const formatActivity = (activity: UserPresence['activity']) => {
    if (!activity) return null;

    switch (activity.type) {
      case 'browser':
        return {
          text: `Browsing ${activity.name}`,
          details: activity.url,
          icon: <Globe className="h-4 w-4" />
        };
      case 'game':
        return {
          text: `Playing ${activity.name}`,
          details: activity.details,
          icon: <Activity className="h-4 w-4" />
        };
      case 'music':
        return {
          text: `Listening to ${activity.name}`,
          details: activity.details,
          icon: <Activity className="h-4 w-4" />
        };
      default:
        return {
          text: activity.details || activity.name,
          details: null,
          icon: <Activity className="h-4 w-4" />
        };
    }
  };

  const isCurrentUser = currentUserId === user.id;
  const activityInfo = user.presence?.activity ? formatActivity(user.presence.activity) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div 
        className="fixed inset-0" 
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-md mx-4 bg-[#161B22] rounded-2xl border border-gray-700/50 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 flex items-center justify-center w-8 h-8 rounded-lg bg-gray-700/50 text-gray-400 hover:bg-gray-600/50 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header with gradient background */}
        <div className="relative h-24 bg-gradient-to-r from-[#5865F2] to-[#7289DA] overflow-hidden">
          <div className="absolute inset-0 bg-black/20" />
          {/* Decorative pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-2 left-4 w-16 h-16 border border-white/20 rounded-full" />
            <div className="absolute top-6 right-8 w-8 h-8 border border-white/20 rounded-full" />
            <div className="absolute bottom-4 left-12 w-4 h-4 bg-white/20 rounded-full" />
          </div>
        </div>

        {/* Avatar */}
        <div className="relative px-6 -mt-12">
          <div className="relative">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-20 h-20 rounded-full border-4 border-[#161B22] object-cover ring-4 ring-[#57F287]/30"
              />
            ) : (
              <div className="w-20 h-20 rounded-full border-4 border-[#161B22] bg-gradient-to-br from-[#57F287] to-[#3BA55C] flex items-center justify-center font-bold text-black text-2xl ring-4 ring-[#57F287]/30">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            
            {/* Status indicator */}
            <div className={`absolute bottom-0 right-0 w-6 h-6 rounded-full border-3 border-[#161B22] ${getStatusColor(user.presence?.status || 'offline')}`} />
          </div>
        </div>

        {/* User Info */}
        <div className="px-6 pt-4 pb-6">
          {/* Name and Role */}
          <div className="mb-4">
            <div className="flex items-center space-x-2 mb-2">
              <h2 className="text-xl font-bold text-white">{user.name}</h2>
              {getRoleIcon(user.role)}
            </div>
            
            {user.username && (
              <p className="text-gray-400 text-sm mb-2">@{user.username}</p>
            )}
            
            <div className="flex items-center space-x-2">
              <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-medium border ${getRoleBadgeColor(user.role)}`}>
                {getRoleIcon(user.role)}
                <span>{user.role?.charAt(0).toUpperCase() + user.role?.slice(1) || 'Member'}</span>
              </span>
              
              <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-medium ${
                user.presence?.status === 'online' 
                  ? 'bg-[#57F287]/20 text-[#57F287] border border-[#57F287]/30'
                  : user.presence?.status === 'away'
                  ? 'bg-[#FEE75C]/20 text-[#FEE75C] border border-[#FEE75C]/30'
                  : user.presence?.status === 'dnd'
                  ? 'bg-[#ED4245]/20 text-[#ED4245] border border-[#ED4245]/30'
                  : 'bg-gray-600/20 text-gray-400 border border-gray-600/30'
              }`}>
                <div className={`w-2 h-2 rounded-full ${getStatusColor(user.presence?.status || 'offline')}`} />
                <span>{getStatusText(user.presence?.status)}</span>
              </span>
            </div>
          </div>

          {/* Activity */}
          {activityInfo && (
            <div className="mb-4 p-3 bg-[#21262D] rounded-lg border border-gray-700/50">
              <div className="flex items-center space-x-2 mb-1">
                {activityInfo.icon}
                <span className="text-sm font-medium text-white">{activityInfo.text}</span>
              </div>
              {activityInfo.details && (
                <p className="text-xs text-gray-400 ml-6">{activityInfo.details}</p>
              )}
            </div>
          )}

          {/* Bio */}
          {user.bio && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-300 mb-2">About</h4>
              <p className="text-sm text-gray-400 leading-relaxed">{user.bio}</p>
            </div>
          )}

          {/* Join Date */}
          {user.joinedAt && (
            <div className="mb-4 flex items-center space-x-2 text-sm text-gray-400">
              <Calendar className="w-4 h-4" />
              <span>Joined {new Date(user.joinedAt).toLocaleDateString()}</span>
            </div>
          )}

          {/* Last Seen for Offline Users */}
          {user.presence?.status === 'offline' && user.presence?.lastSeen && (
            <div className="mb-4 flex items-center space-x-2 text-sm text-gray-400">
              <Activity className="w-4 h-4" />
              <span>Last seen {new Date(user.presence.lastSeen).toLocaleString()}</span>
            </div>
          )}

          {/* Action Buttons */}
          {!isCurrentUser && (
            <div className="flex space-x-2">
              <button className="flex-1 flex items-center justify-center space-x-2 py-2 px-4 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-lg transition-colors">
                <MessageCircle className="w-4 h-4" />
                <span>Message</span>
              </button>
              
              <button className="flex items-center justify-center p-2 bg-[#21262D] hover:bg-gray-600/30 text-gray-400 hover:text-[#57F287] rounded-lg transition-colors">
                <Phone className="w-4 h-4" />
              </button>
              
              <button className="flex items-center justify-center p-2 bg-[#21262D] hover:bg-gray-600/30 text-gray-400 hover:text-[#57F287] rounded-lg transition-colors">
                <Video className="w-4 h-4" />
              </button>
              
              <button className="flex items-center justify-center p-2 bg-[#21262D] hover:bg-gray-600/30 text-gray-400 hover:text-[#57F287] rounded-lg transition-colors">
                <UserPlus className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};