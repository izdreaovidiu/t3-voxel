'use client';

import React from 'react';
import { 
  X, 
  Crown, 
  Shield, 
  MessageCircle, 
  Phone, 
  Video,
  UserPlus,
  MoreHorizontal,
  Calendar,
  Users,
  Settings
} from 'lucide-react';

interface UserProfileModalProps {
  user: {
    id: string;
    name: string;
    username?: string;
    avatar?: string;
    role?: string;
    status?: string;
    activity?: any;
    joinedAt?: string;
    lastSeen?: Date;
    userInfo?: {
      username?: string;
      avatar?: string;
      email?: string;
    };
  };
  isOpen: boolean;
  onClose: () => void;
  isCurrentUser?: boolean;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  user,
  isOpen,
  onClose,
  isCurrentUser = false
}) => {
  if (!isOpen) return null;

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Crown className="h-5 w-5 text-[#FEE75C] drop-shadow-[0_0_8px_rgba(254,231,92,0.6)]" />;
      case "moderator":
        return <Shield className="h-5 w-5 text-[#57F287] drop-shadow-[0_0_8px_rgba(87,242,135,0.6)]" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "bg-[#57F287] shadow-[0_0_8px_rgba(87,242,135,0.6)]";
      case "away":
        return "bg-[#FEE75C] shadow-[0_0_8px_rgba(254,231,92,0.6)]";
      case "dnd":
        return "bg-[#ED4245] shadow-[0_0_8px_rgba(237,66,69,0.6)]";
      case "offline":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "online":
        return "Online";
      case "away":
        return "Away";
      case "dnd":
        return "Do Not Disturb";
      case "offline":
        return "Offline";
      default:
        return "Unknown";
    }
  };

  const handleOpenClerkProfile = () => {
    if (isCurrentUser) {
      // Open Clerk's user profile modal
      window.open('/user-profile', '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-backdrop-in">
      <div 
        className="fixed inset-0" 
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-md transform rounded-2xl border border-gray-700/50 bg-gradient-to-br from-[#161B22] via-[#21262D] to-[#0D1117] p-6 shadow-2xl animate-modal-in hover-lift mx-4">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-700/50 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Profile Header */}
        <div className="relative mb-6">
          {/* Banner Background */}
          <div className="h-20 w-full rounded-xl bg-gradient-to-r from-[#57F287] via-[#3BA55C] to-[#57F287] mb-4" />
          
          {/* Avatar */}
          <div className="absolute -bottom-8 left-4">
            <div className="relative hover-lift">
              {user.userInfo?.avatar || user.avatar ? (
                <img
                  src={user.userInfo?.avatar || user.avatar}
                  alt={user.name}
                  className="h-20 w-20 rounded-full border-4 border-[#161B22] object-cover ring-2 ring-[#57F287]/30 transition-all duration-300 hover:ring-[#57F287]/50"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-[#161B22] bg-gradient-to-br from-[#57F287] to-[#3BA55C] text-2xl font-bold text-black ring-2 ring-[#57F287]/30 transition-all duration-300 hover:ring-[#57F287]/50">
                  {user.name[0]?.toUpperCase()}
                </div>
              )}
              
              {/* Status Indicator */}
              <div className={`absolute -bottom-1 -right-1 h-6 w-6 rounded-full border-4 border-[#161B22] ${
                user.status === 'online' ? 'status-online' : 
                user.status === 'away' ? 'status-away' : 
                user.status === 'dnd' ? 'status-dnd' : 'status-offline'
              }`} />
            </div>
          </div>
        </div>

        {/* User Info */}
        <div className="mt-8 space-y-4">
          {/* Name and Role */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <h2 className="text-2xl font-bold text-white">{user.name}</h2>
              {getRoleIcon(user.role || 'member')}
            </div>
            
            {isCurrentUser && (
              <button
                onClick={handleOpenClerkProfile}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-700/50 hover:text-[#57F287]"
                title="Edit Profile"
              >
                <Settings className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Username */}
          <div className="text-sm text-gray-400">
            @{user.userInfo?.username || user.username || user.name.toLowerCase().replace(/\s+/g, '')}
          </div>

          {/* Status */}
          <div className="flex items-center space-x-2">
            <div className={`h-3 w-3 rounded-full ${getStatusColor(user.status || 'offline')}`} />
            <span className="text-sm font-medium text-gray-300">
              {getStatusText(user.status || 'offline')}
            </span>
          </div>

          {/* Activity */}
          {user.activity && (
            <div className="rounded-lg border border-gray-700/50 bg-[#21262D]/50 p-3">
              <div className="text-sm font-medium text-[#57F287] mb-1">
                {user.activity.type === 'browser' ? 'Browsing' : user.activity.type || 'Activity'}
              </div>
              <div className="text-sm text-gray-300">
                {user.activity.name}
              </div>
              {user.activity.details && (
                <div className="text-xs text-gray-400 mt-1">
                  {user.activity.details}
                </div>
              )}
            </div>
          )}

          {/* Member Since */}
          {user.joinedAt && (
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <Calendar className="h-4 w-4" />
              <span>Member since {new Date(user.joinedAt).toLocaleDateString()}</span>
            </div>
          )}

          {/* Last Seen (for offline users) */}
          {user.status === 'offline' && user.lastSeen && (
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <Users className="h-4 w-4" />
              <span>Last seen {new Date(user.lastSeen).toLocaleString()}</span>
            </div>
          )}

          {/* Role Badge */}
          {user.role && user.role !== 'member' && (
            <div className="inline-flex items-center space-x-2 rounded-full bg-gradient-to-r from-[#57F287]/20 to-[#3BA55C]/20 px-3 py-1 text-sm font-medium text-[#57F287]">
              {getRoleIcon(user.role)}
              <span className="capitalize">{user.role}</span>
            </div>
          )}
        </div>

        {/* Action Buttons (only show for other users) */}
        {!isCurrentUser && (
          <div className="mt-6 flex space-x-2">
            <button className="flex flex-1 items-center justify-center space-x-2 rounded-lg bg-[#5865F2] px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-[#4752C4] hover:shadow-lg hover:shadow-[#5865F2]/30 btn-interactive">
              <MessageCircle className="h-4 w-4" />
              <span>Message</span>
            </button>
            
            <button className="flex items-center justify-center rounded-lg bg-gray-700/50 px-3 py-2 text-gray-400 transition-all duration-200 hover:bg-gray-700 hover:text-white hover:shadow-lg hover:shadow-gray-500/20 btn-interactive" title="Voice Call">
              <Phone className="h-4 w-4" />
            </button>
            
            <button className="flex items-center justify-center rounded-lg bg-gray-700/50 px-3 py-2 text-gray-400 transition-all duration-200 hover:bg-gray-700 hover:text-white hover:shadow-lg hover:shadow-gray-500/20 btn-interactive" title="Video Call">
              <Video className="h-4 w-4" />
            </button>
            
            <button className="flex items-center justify-center rounded-lg bg-gray-700/50 px-3 py-2 text-gray-400 transition-all duration-200 hover:bg-gray-700 hover:text-white hover:shadow-lg hover:shadow-gray-500/20 btn-interactive" title="Add Friend">
              <UserPlus className="h-4 w-4" />
            </button>
            
            <button className="flex items-center justify-center rounded-lg bg-gray-700/50 px-3 py-2 text-gray-400 transition-all duration-200 hover:bg-gray-700 hover:text-white hover:shadow-lg hover:shadow-gray-500/20 btn-interactive" title="More Options">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
