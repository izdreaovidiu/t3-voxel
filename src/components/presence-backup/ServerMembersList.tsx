// src/components/presence/ServerMembersList.tsx
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useSocket } from '~/hooks/useSocket';
import { UserPresenceIndicator } from './UserPresenceIndicator';
import { StatusSelector } from './StatusSelector';
import { UserProfileModal } from '../modals/UserProfileModal';
import { useUser } from '@clerk/nextjs';
import { 
  Users, 
  MoreHorizontal, 
  Loader2,
  Crown,
  Shield
} from 'lucide-react';

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
  const { getServerMembers, getServerOnlineCount, subscribeToServerMembers, isConnected: socketConnected } = useSocket();
  const { user: clerkUser } = useUser();
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [realtimeMembers, setRealtimeMembers] = useState<any[]>([]);

  const handleUserClick = (member: any) => {
    setSelectedUser(member);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
  };

  // Subscribe to real-time server members updates
  useEffect(() => {
    if (!serverId) return;

    const unsubscribe = subscribeToServerMembers((data) => {
      if (data.serverId === serverId) {
        console.log('📊 Server members updated in real-time:', data);
        setRealtimeMembers(data.members);
      }
    });

    return unsubscribe;
  }, [serverId, subscribeToServerMembers]);

  // Get initial members from socket
  useEffect(() => {
    if (serverId && socketConnected) {
      const socketMembers = getServerMembers(serverId);
      if (socketMembers.length > 0) {
        setRealtimeMembers(socketMembers);
      }
    }
  }, [serverId, socketConnected, getServerMembers]);
  
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
        return "bg-gray-500";
    }
  };

  // Use real-time members from socket or fallback to server members
  const allMembers = useMemo(() => {
    // Prioritize real-time members from socket
    if (realtimeMembers.length > 0) {
      return realtimeMembers.map(member => ({
        ...member,
        displayName: member.fullName || 
                     (member.firstName && member.lastName ? `${member.firstName} ${member.lastName}` : null) ||
                     member.name || 
                     member.username || 
                     "Unknown User"
      }));
    }
    
    // Fallback to server members with default online status
    return serverMembers.map(member => ({
      ...member,
      displayName: member.fullName || 
                   (member.firstName && member.lastName ? `${member.firstName} ${member.lastName}` : null) ||
                   member.name || 
                   member.username || 
                   "Unknown User",
      status: member.status || 'online' // Default to online
    }));
  }, [realtimeMembers, serverMembers]);

  const onlineCount = serverId ? getServerOnlineCount(serverId) : allMembers.filter(m => m.status === 'online').length;
  const totalCount = allMembers.length;

  return (
    <div className="flex w-80 flex-col border-l border-gray-800/50 bg-[#161B22]">
      {/* Connection Status */}
      {!isConnected && (
        <div className="mx-4 mt-4 bg-yellow-600/20 border border-yellow-600/30 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
            <span className="text-yellow-300 text-sm">Connecting...</span>
          </div>
        </div>
      )}

      <div className="p-6">
        {/* Your Status */}
        {clerkUser && (
          <div className="mb-6">
            <h3 className="text-sm font-bold tracking-wider text-gray-400 uppercase mb-3">
              Your Status
            </h3>
            <div className="flex items-center justify-between bg-gray-700/30 rounded-lg p-3">
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
                        "I"
                      ).toUpperCase()}
                    </div>
                  )}
                  <div className="absolute -right-1 -bottom-1 h-4 w-4 rounded-full border-2 border-[#161B22] bg-[#57F287] shadow-[0_0_6px_rgba(87,242,135,0.6)]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-white">
                    {clerkUser?.firstName && clerkUser?.lastName
                      ? `${clerkUser.firstName} ${clerkUser.lastName}`
                      : clerkUser?.username || "Izdrea Ovidiu"}
                  </div>
                  <div className="text-xs text-[#57F287]">Online</div>
                </div>
              </div>
              <StatusSelector />
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
            {onlineCount} online
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
                className="group flex cursor-pointer items-center rounded-lg px-3 py-3 transition-all duration-200 hover:bg-[#21262D]/50 hover:shadow-lg hover:shadow-[#57F287]/10 hover:border hover:border-[#57F287]/20"
                onClick={() => handleUserClick(member)}
              >
                <div className="relative mr-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#57F287] to-[#3BA55C] font-bold text-black ring-2 ring-gray-700/50">
                    {member.displayName
                      ? String(member.displayName)[0]?.toUpperCase()
                      : "I"}
                  </div>
                  <div
                    className={`absolute -right-1 -bottom-1 h-4 w-4 rounded-full border-2 border-[#161B22] ${getStatusColor(member.status || 'online')}`}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center space-x-2">
                    <span className="truncate text-sm font-bold text-white transition-colors duration-200 group-hover:text-[#57F287]">
                      {member.displayName || "Unknown User"}
                    </span>
                    {getRoleIcon(member.role || "member")}
                  </div>
                  
                  {/* Show activity if available */}
                  {member.activity ? (
                    <div className="truncate text-xs text-gray-400">
                      {member.activity.type === 'browser' 
                        ? `Browsing ${member.activity.name}${member.activity.url ? ` - ${member.activity.url}` : ''}`
                        : member.activity.details || member.activity.name
                      }
                    </div>
                  ) : (
                    <div className="truncate text-xs text-gray-400">
                      {member.status === 'offline' ? 'Offline' : 'No activity'}
                    </div>
                  )}
                  
                  {/* Show last seen for offline users */}
                  {member.status === 'offline' && member.lastSeen && (
                    <div className="truncate text-xs text-gray-500">
                      Last seen: {new Date(member.lastSeen).toLocaleString()}
                    </div>
                  )}
                </div>

                <div className="opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  <button className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:text-[#57F287]">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            
            {allMembers.length === 0 && (
              <div className="text-gray-500 text-sm text-center py-8">
                {socketConnected ? 'No members found' : 'Connecting...'}
              </div>
            )}
          </div>
        )}
      </div>

      {/* User Profile Modal */}
      {selectedUser && (
        <UserProfileModal
          user={{
            id: selectedUser.id,
            name: selectedUser.displayName || 'Unknown User',
            username: selectedUser.username,
            avatar: selectedUser.avatar,
            role: selectedUser.role,
            status: selectedUser.status || 'offline',
            activity: selectedUser.activity,
            joinedAt: selectedUser.joinedAt,
            lastSeen: selectedUser.lastSeen,
            userInfo: {
              username: selectedUser.username,
              avatar: selectedUser.avatar,
              email: selectedUser.email,
              firstName: selectedUser.firstName,
              lastName: selectedUser.lastName,
              fullName: selectedUser.fullName
            }
          }}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          isCurrentUser={selectedUser.id === clerkUser?.id}
        />
      )}
    </div>
  );
};