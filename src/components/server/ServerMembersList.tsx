'use client';

import React, { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useSocket } from '~/hooks/useSocket';
import { 
  Users, 
  MoreHorizontal, 
  Loader2,
  Crown,
  Shield,
  MessageCircle,
  Phone,
  Video,
  UserPlus,
  Settings,
  Heart,
  Gift,
  Zap,
  Star,
  Calendar,
  Eye,
  Copy,
  Ban,
  Flag
} from 'lucide-react';
import { UserProfileModal } from '~/components/modals/UserProfileModal';

interface ServerMembersListProps {
  serverId: string;
  serverMembers?: any[];
  membersLoading?: boolean;
  isConnected?: boolean;
}

export const ServerMembersList: React.FC<ServerMembersListProps> = ({
  serverId,
  serverMembers = [],
  membersLoading = false,
  isConnected = true
}) => {
  const { user: clerkUser } = useUser();
  const { 
    userStatus, 
    subscribeToServerMembers,
    getServerMembers,
    getServerOnlineCount 
  } = useSocket();
  
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // Get real-time server members from socket
  const socketMembers = getServerMembers(serverId);
  const onlineCount = getServerOnlineCount(serverId);

  const handleUserClick = (member: any, action: 'profile' | 'message' | 'call' | 'videocall' | 'addfriend' = 'profile') => {
    setSelectedUser(member);
    
    switch (action) {
      case 'profile':
        setShowProfileModal(true);
        break;
      case 'message':
        console.log('Start private message with:', member);
        // Implement private messaging
        break;
      case 'call':
        console.log('Start voice call with:', member);
        // Implement voice call
        break;
      case 'videocall':
        console.log('Start video call with:', member);
        // Implement video call
        break;
      case 'addfriend':
        console.log('Add friend:', member);
        // Implement add friend
        break;
    }
    
    setActiveDropdown(null);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return (
          <Crown className="h-4 w-4 text-[#FEE75C] drop-shadow-[0_0_6px_rgba(254,231,92,0.5)]" />
        );
      case "moderator":
        return (
          <Shield className="h-4 w-4 text-[#57F287] drop-shadow-[0_0_6px_rgba(87,242,135,0.5)]" />
        );
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "bg-[#57F287] shadow-[0_0_6px_rgba(87,242,135,0.5)]";
      case "away":
        return "bg-[#FEE75C] shadow-[0_0_6px_rgba(254,231,92,0.5)]";
      case "dnd":
        return "bg-[#ED4245] shadow-[0_0_6px_rgba(237,66,69,0.5)]";
      case "offline":
        return "bg-gray-500";
      default:
        return "bg-[#57F287] shadow-[0_0_6px_rgba(87,242,135,0.5)]";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "online":
        return 'Online';
      case "away":
        return 'Away';
      case "dnd":
        return 'Do Not Disturb';
      case "offline":
        return 'Offline';
      default:
        return 'Online';
    }
  };

  // Use socket members if available, fallback to props
  const allMembers = socketMembers.length > 0 ? socketMembers : serverMembers.map(member => ({
    ...member,
    displayName: member.fullName || 
                 (member.firstName && member.lastName ? `${member.firstName} ${member.lastName}` : null) ||
                 member.name || 
                 member.username || 
                 "Unknown User",
    username: member.username || 
              (member.firstName && member.lastName ? `${member.firstName.toLowerCase()}.${member.lastName.toLowerCase()}` : null) ||
              member.name?.toLowerCase().replace(/\s+/g, '.') ||
              'unknown',
    status: 'offline' // Default to offline for non-socket members
  }));

  const totalCount = allMembers.length;
  const realTimeOnlineCount = socketMembers.length > 0 ? onlineCount : (userStatus === 'online' ? 1 : 0);

  const isCurrentUser = (member: any) => {
    return member.id === clerkUser?.id || member.userId === clerkUser?.id;
  };

  const CreativeDropdownMenu = ({ member, isOpen, onClose }: { member: any, isOpen: boolean, onClose: () => void }) => {
    if (!isOpen) return null;

    const isCurrentUserMember = isCurrentUser(member);

    return (
      <div className="absolute top-full right-0 z-50 mt-2 w-72 animate-modal-in">
        <div className="rounded-2xl border border-gray-700/50 bg-gradient-to-br from-[#161B22] via-[#21262D] to-[#0D1117] p-4 shadow-2xl backdrop-blur-sm">
          {/* Header */}
          <div className="mb-4 flex items-center space-x-3">
            <div className="relative">
              {member.avatar ? (
                <img
                  src={member.avatar}
                  alt={member.displayName || member.name}
                  className="h-12 w-12 rounded-full object-cover ring-2 ring-[#57F287]/30"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#57F287] to-[#3BA55C] font-bold text-black ring-2 ring-[#57F287]/30">
                  {(member.displayName || member.name || "U")[0]?.toUpperCase()}
                </div>
              )}
              <div className={`absolute -right-1 -bottom-1 h-4 w-4 rounded-full border-2 border-[#161B22] ${getStatusColor(member.status || 'offline')}`} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold text-white truncate">
                  {member.displayName || member.name || "Unknown User"}
                </span>
                {getRoleIcon(member.role || "member")}
              </div>
              <div className="text-xs text-gray-400">
                @{member.username}
              </div>
              <div className={`text-xs ${
                member.status === 'online' ? 'text-[#57F287]' : 
                member.status === 'away' ? 'text-[#FEE75C]' : 
                member.status === 'dnd' ? 'text-[#ED4245]' :
                'text-gray-400'
              }`}>
                {getStatusLabel(member.status || 'offline')}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            {/* Primary Actions */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleUserClick(member, 'profile')}
                className="flex items-center justify-center space-x-2 rounded-lg bg-[#5865F2] px-3 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-[#4752C4] hover:shadow-lg hover:shadow-[#5865F2]/30"
              >
                <Eye className="h-4 w-4" />
                <span>Profile</span>
              </button>
              
              {!isCurrentUserMember && (
                <button
                  onClick={() => handleUserClick(member, 'message')}
                  className="flex items-center justify-center space-x-2 rounded-lg bg-[#57F287] px-3 py-2 text-sm font-medium text-black transition-all duration-200 hover:bg-[#3BA55C] hover:shadow-lg hover:shadow-[#57F287]/30"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>Message</span>
                </button>
              )}
            </div>

            {/* Secondary Actions */}
            {!isCurrentUserMember && (
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleUserClick(member, 'call')}
                  className="flex items-center justify-center rounded-lg bg-gray-700/50 px-3 py-2 text-gray-300 transition-all duration-200 hover:bg-gray-700 hover:text-[#57F287] hover:shadow-lg"
                  title="Voice Call"
                >
                  <Phone className="h-4 w-4" />
                </button>
                
                <button
                  onClick={() => handleUserClick(member, 'videocall')}
                  className="flex items-center justify-center rounded-lg bg-gray-700/50 px-3 py-2 text-gray-300 transition-all duration-200 hover:bg-gray-700 hover:text-[#57F287] hover:shadow-lg"
                  title="Video Call"
                >
                  <Video className="h-4 w-4" />
                </button>
                
                <button
                  onClick={() => handleUserClick(member, 'addfriend')}
                  className="flex items-center justify-center rounded-lg bg-gray-700/50 px-3 py-2 text-gray-300 transition-all duration-200 hover:bg-gray-700 hover:text-[#57F287] hover:shadow-lg"
                  title="Add Friend"
                >
                  <UserPlus className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Creative Actions */}
            <div className="border-t border-gray-700/50 pt-3">
              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`@${member.username}`);
                    console.log('Username copied!');
                    onClose();
                  }}
                  className="flex items-center justify-center rounded-lg bg-purple-600/20 px-2 py-2 text-purple-400 transition-all duration-200 hover:bg-purple-600/30 hover:text-purple-300"
                  title="Copy Username"
                >
                  <Copy className="h-4 w-4" />
                </button>
                
                <button
                  onClick={() => {
                    console.log('Add to favorites:', member);
                    onClose();
                  }}
                  className="flex items-center justify-center rounded-lg bg-pink-600/20 px-2 py-2 text-pink-400 transition-all duration-200 hover:bg-pink-600/30 hover:text-pink-300"
                  title="Add to Favorites"
                >
                  <Heart className="h-4 w-4" />
                </button>
                
                <button
                  onClick={() => {
                    console.log('Send gift to:', member);
                    onClose();
                  }}
                  className="flex items-center justify-center rounded-lg bg-yellow-600/20 px-2 py-2 text-yellow-400 transition-all duration-200 hover:bg-yellow-600/30 hover:text-yellow-300"
                  title="Send Gift"
                >
                  <Gift className="h-4 w-4" />
                </button>
                
                <button
                  onClick={() => {
                    console.log('Boost user:', member);
                    onClose();
                  }}
                  className="flex items-center justify-center rounded-lg bg-blue-600/20 px-2 py-2 text-blue-400 transition-all duration-200 hover:bg-blue-600/30 hover:text-blue-300"
                  title="Boost User"
                >
                  <Zap className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            {/* Close button */}
            <button
              onClick={onClose}
              className="w-full rounded-lg bg-gray-700/30 px-3 py-2 text-sm text-gray-400 transition-all duration-200 hover:bg-gray-700/50 hover:text-white"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="flex w-80 flex-col border-l border-gray-800/50 bg-[#161B22]">
        <div className="p-6">
          {/* Your Status */}
          {clerkUser && (
            <div className="mb-6">
              <h3 className="text-sm font-bold tracking-wider text-gray-400 uppercase mb-3">
                Your Status
              </h3>
              <div 
                className="flex items-center bg-gray-700/30 rounded-lg p-3 cursor-pointer transition-all duration-200 hover:bg-gray-700/40 hover:shadow-lg hover:shadow-[#57F287]/10"
                onClick={() => handleUserClick({
                  id: clerkUser.id,
                  displayName: clerkUser.firstName && clerkUser.lastName
                    ? `${clerkUser.firstName} ${clerkUser.lastName}`
                    : clerkUser.fullName || clerkUser.username || "User",
                  username: clerkUser.username ||
                    (clerkUser.firstName && clerkUser.lastName 
                      ? `${clerkUser.firstName.toLowerCase()}.${clerkUser.lastName.toLowerCase()}`
                      : clerkUser.firstName?.toLowerCase() ||
                        clerkUser.id?.slice(-4) ||
                        "user"),
                  avatar: clerkUser.imageUrl,
                  status: userStatus,
                  role: 'admin', // You can adjust this based on your role system
                  joinedAt: clerkUser.createdAt,
                  userInfo: {
                    username: clerkUser.username,
                    avatar: clerkUser.imageUrl,
                    email: clerkUser.primaryEmailAddress?.emailAddress
                  }
                })}
                title="Click to view your profile"
              >
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    {clerkUser?.imageUrl ? (
                      <img
                        src={clerkUser.imageUrl}
                        alt={clerkUser.firstName || clerkUser.username || "User"}
                        className="h-10 w-10 rounded-full object-cover ring-2 ring-[#57F287]/30"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#57F287] to-[#3BA55C] font-bold text-black ring-2 ring-[#57F287]/30">
                        {(
                          clerkUser?.firstName?.[0] ||
                          clerkUser?.username?.[0] ||
                          "U"
                        ).toUpperCase()}
                      </div>
                    )}
                    <div className={`absolute -right-1 -bottom-1 h-4 w-4 rounded-full border-2 border-[#161B22] ${getStatusColor(userStatus)}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-white">
                      {clerkUser?.firstName && clerkUser?.lastName
                        ? `${clerkUser.firstName} ${clerkUser.lastName}`
                        : clerkUser?.fullName || clerkUser?.username || "User"}
                    </div>
                    <div className="text-xs text-gray-400">
                      @{clerkUser?.username ||
                        (clerkUser?.firstName && clerkUser?.lastName 
                          ? `${clerkUser.firstName.toLowerCase()}.${clerkUser.lastName.toLowerCase()}`
                          : clerkUser?.firstName?.toLowerCase() ||
                            clerkUser?.id?.slice(-4) ||
                            "user")}
                    </div>
                    <div className={`text-xs ${userStatus === 'online' ? 'text-[#57F287]' : userStatus === 'away' ? 'text-[#FEE75C]' : 'text-gray-400'}`}>
                      {getStatusLabel(userStatus)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Members Header */}
          <div className="mb-6 flex items-center justify-between">
            <h3 className="flex items-center text-sm font-bold tracking-wider text-gray-400 uppercase">
              <Users className="mr-2 h-4 w-4" />
              Members — {totalCount}
            </h3>
            <div className="rounded-full bg-[#57F287]/20 px-2 py-1 text-xs text-[#57F287]">
              {realTimeOnlineCount} online
            </div>
          </div>

          {/* Members List */}
          {membersLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[#57F287]" />
            </div>
          ) : (
            <div className="space-y-3">
              {allMembers.map((member) => (
                <div
                  key={member.id || Math.random()}
                  className="group relative flex cursor-pointer items-center rounded-lg px-3 py-3 transition-all duration-200 hover:bg-[#21262D]/50 hover:shadow-lg hover:shadow-[#57F287]/10 hover:border hover:border-[#57F287]/20"
                >
                  <div 
                    className="flex items-center flex-1 min-w-0"
                    onClick={() => handleUserClick(member)}
                  >
                    <div className="relative mr-4">
                      {member.avatar ? (
                        <img
                          src={member.avatar}
                          alt={member.displayName || member.name}
                          className="h-10 w-10 rounded-full object-cover ring-2 ring-gray-700/50"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#57F287] to-[#3BA55C] font-bold text-black ring-2 ring-gray-700/50">
                          {(member.displayName || member.name || "U")[0]?.toUpperCase()}
                        </div>
                      )}
                      <div
                        className={`absolute -right-1 -bottom-1 h-4 w-4 rounded-full border-2 border-[#161B22] ${getStatusColor(member.status || 'offline')}`}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center space-x-2">
                        <span className="truncate text-sm font-bold text-white transition-colors duration-200 group-hover:text-[#57F287]">
                          {member.displayName || member.name || "Unknown User"}
                        </span>
                        {getRoleIcon(member.role || "member")}
                      </div>
                      
                      <div className="text-xs text-gray-400 truncate">
                        @{member.username}
                      </div>
                      
                      <div className={`truncate text-xs capitalize ${
                        member.status === 'online' ? 'text-[#57F287]' : 
                        member.status === 'away' ? 'text-[#FEE75C]' : 
                        member.status === 'dnd' ? 'text-[#ED4245]' :
                        'text-gray-400'
                      }`}>
                        {getStatusLabel(member.status || 'offline')}
                      </div>
                    </div>
                  </div>

                  {/* Three dots menu */}
                  <div className="relative opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveDropdown(activeDropdown === member.id ? null : member.id);
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:text-[#57F287] hover:bg-gray-700/30 transition-all duration-200"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                    
                    <CreativeDropdownMenu
                      member={member}
                      isOpen={activeDropdown === member.id}
                      onClose={() => setActiveDropdown(null)}
                    />
                  </div>
                </div>
              ))}
              
              {allMembers.length === 0 && (
                <div className="text-gray-500 text-sm text-center py-8">
                  No members found
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* User Profile Modal */}
      {showProfileModal && selectedUser && (
        <UserProfileModal
          user={{
            id: selectedUser.id,
            name: selectedUser.displayName || selectedUser.name || "Unknown User",
            username: selectedUser.username,
            avatar: selectedUser.avatar,
            role: selectedUser.role || 'member',
            status: selectedUser.status || 'offline',
            joinedAt: selectedUser.joinedAt,
            lastSeen: selectedUser.lastSeen,
            userInfo: selectedUser.userInfo || {
              username: selectedUser.username,
              avatar: selectedUser.avatar,
              email: selectedUser.email
            }
          }}
          isOpen={showProfileModal}
          onClose={() => {
            setShowProfileModal(false);
            setSelectedUser(null);
          }}
          isCurrentUser={isCurrentUser(selectedUser)}
        />
      )}
    </>
  );
};
