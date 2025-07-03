// src/components/friends/FriendsSystem.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  MessageCircle, 
  Phone, 
  Video,
  Check, 
  X, 
  Search,
  UserMinus,
  MoreHorizontal,
  Send,
  Clock,
  Star
} from 'lucide-react';
import { useUser } from '@clerk/nextjs';

interface Friend {
  id: string;
  username: string;
  avatar?: string;
  status: 'online' | 'away' | 'dnd' | 'offline';
  activity?: string;
  lastSeen?: Date;
}

interface FriendRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  fromUsername: string;
  fromAvatar?: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
}

interface FriendsSystemProps {
  onStartPrivateCall?: (friendId: string, type: 'voice' | 'video') => void;
  onStartPrivateMessage?: (friendId: string) => void;
}

export const FriendsSystem: React.FC<FriendsSystemProps> = ({
  onStartPrivateCall,
  onStartPrivateMessage
}) => {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<'friends' | 'pending' | 'blocked' | 'add'>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Mock data - replace with real API calls
  useEffect(() => {
    // Mock friends data
    setFriends([
      {
        id: 'kopl',
        username: 'kopl',
        status: 'online',
        activity: 'Playing Voxel Chat'
      },
      {
        id: 'user2',
        username: 'TestUser',
        status: 'away',
        lastSeen: new Date()
      }
    ]);

    // Mock pending requests
    setFriendRequests([
      {
        id: 'req1',
        fromUserId: 'user3',
        toUserId: user?.id || '',
        fromUsername: 'NewFriend',
        status: 'pending',
        createdAt: new Date()
      }
    ]);
  }, [user?.id]);

  const handleSendFriendRequest = async (targetUsername: string) => {
    // Mock sending friend request
    console.log(`Sending friend request to ${targetUsername}`);
    // Add to pending requests
    const newRequest: FriendRequest = {
      id: Math.random().toString(),
      fromUserId: user?.id || '',
      toUserId: targetUsername,
      fromUsername: user?.username || user?.firstName || 'Unknown',
      fromAvatar: user?.imageUrl,
      status: 'pending',
      createdAt: new Date()
    };
    setFriendRequests(prev => [...prev, newRequest]);
  };

  const handleAcceptFriendRequest = (requestId: string) => {
    const request = friendRequests.find(req => req.id === requestId);
    if (request) {
      // Add to friends
      const newFriend: Friend = {
        id: request.fromUserId,
        username: request.fromUsername,
        avatar: request.fromAvatar,
        status: 'online'
      };
      setFriends(prev => [...prev, newFriend]);
      
      // Remove from pending
      setFriendRequests(prev => prev.filter(req => req.id !== requestId));
    }
  };

  const handleRejectFriendRequest = (requestId: string) => {
    setFriendRequests(prev => prev.filter(req => req.id !== requestId));
  };

  const handleSearchUsers = async (query: string) => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    // Mock search - replace with real API
    setTimeout(() => {
      setSearchResults([
        { id: 'search1', username: `${query}User1`, avatar: null },
        { id: 'search2', username: `${query}User2`, avatar: null },
      ]);
      setIsSearching(false);
    }, 500);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'status-online';
      case 'away': return 'status-away';
      case 'dnd': return 'status-dnd';
      default: return 'status-offline';
    }
  };

  const filteredFriends = friends.filter(friend => 
    friend.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingRequests = friendRequests.filter(req => req.status === 'pending');

  return (
    <div className="h-full flex flex-col bg-[#0D1117]">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-800/50">
        <div className="flex items-center space-x-3">
          <Users className="h-6 w-6 text-[#57F287]" />
          <h1 className="text-xl font-bold text-white">Friends</h1>
          {pendingRequests.length > 0 && (
            <div className="notification-badge bg-[#ED4245] text-white text-xs px-2 py-1 rounded-full">
              {pendingRequests.length}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 p-4 border-b border-gray-800/50">
        {[
          { key: 'friends', label: 'All', count: friends.length },
          { key: 'pending', label: 'Pending', count: pendingRequests.length },
          { key: 'blocked', label: 'Blocked', count: 0 },
          { key: 'add', label: 'Add Friend', count: null }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`btn-interactive px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === tab.key
                ? 'bg-[#57F287] text-black shadow-[0_0_20px_rgba(87,242,135,0.3)]'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/30'
            }`}
          >
            {tab.label}
            {tab.count !== null && tab.count > 0 && (
              <span className="ml-2 text-xs bg-black/20 px-1.5 py-0.5 rounded-full">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'friends' && (
          <div className="h-full flex flex-col">
            {/* Search */}
            <div className="p-4">
              <div className="relative">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search friends..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-gray-700/50 bg-[#21262D] py-2 pr-4 pl-10 text-white placeholder-gray-400 focus:border-[#57F287] focus:ring-[#57F287]/20 focus:outline-none"
                />
              </div>
            </div>

            {/* Friends List */}
            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
              {filteredFriends.map(friend => (
                <div
                  key={friend.id}
                  className="group message-hover flex items-center justify-between p-4 rounded-xl"
                >
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      {friend.avatar ? (
                        <img
                          src={friend.avatar}
                          alt={friend.username}
                          className="h-12 w-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#57F287] to-[#3BA55C] font-bold text-black">
                          {friend.username[0].toUpperCase()}
                        </div>
                      )}
                      <div className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-[#0D1117] ${getStatusColor(friend.status)}`} />
                    </div>

                    <div>
                      <div className="font-medium text-white">{friend.username}</div>
                      <div className="text-sm text-gray-400">
                        {friend.status === 'online' && friend.activity 
                          ? friend.activity 
                          : friend.status === 'offline' && friend.lastSeen
                          ? `Last seen ${friend.lastSeen.toLocaleDateString()}`
                          : friend.status}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onStartPrivateMessage?.(friend.id)}
                      className="btn-interactive flex h-10 w-10 items-center justify-center rounded-lg bg-gray-700/50 text-gray-400 hover:bg-[#5865F2] hover:text-white"
                      title="Message"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </button>
                    
                    <button
                      onClick={() => onStartPrivateCall?.(friend.id, 'voice')}
                      className="btn-interactive flex h-10 w-10 items-center justify-center rounded-lg bg-gray-700/50 text-gray-400 hover:bg-[#57F287] hover:text-black"
                      title="Voice Call"
                    >
                      <Phone className="h-4 w-4" />
                    </button>
                    
                    <button
                      onClick={() => onStartPrivateCall?.(friend.id, 'video')}
                      className="btn-interactive flex h-10 w-10 items-center justify-center rounded-lg bg-gray-700/50 text-gray-400 hover:bg-[#57F287] hover:text-black"
                      title="Video Call"
                    >
                      <Video className="h-4 w-4" />
                    </button>

                    <button className="btn-interactive flex h-10 w-10 items-center justify-center rounded-lg bg-gray-700/50 text-gray-400 hover:bg-gray-600 hover:text-white">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}

              {filteredFriends.length === 0 && (
                <div className="text-center py-12">
                  <Users className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">No friends yet</h3>
                  <p className="text-gray-400 mb-6">Start by adding some friends!</p>
                  <button
                    onClick={() => setActiveTab('add')}
                    className="btn-interactive bg-[#57F287] text-black px-6 py-2 rounded-lg font-medium hover:bg-[#3BA55C]"
                  >
                    Add Friends
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'pending' && (
          <div className="p-4 space-y-4">
            <h3 className="text-white font-medium">Pending Requests</h3>
            
            {pendingRequests.map(request => (
              <div
                key={request.id}
                className="message-hover flex items-center justify-between p-4 rounded-xl"
              >
                <div className="flex items-center space-x-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#57F287] to-[#3BA55C] font-bold text-black">
                    {request.fromUsername[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium text-white">{request.fromUsername}</div>
                    <div className="text-sm text-gray-400">
                      Incoming friend request • {request.createdAt.toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleAcceptFriendRequest(request.id)}
                    className="btn-interactive flex h-10 w-10 items-center justify-center rounded-lg bg-[#57F287] text-black hover:bg-[#3BA55C]"
                    title="Accept"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  
                  <button
                    onClick={() => handleRejectFriendRequest(request.id)}
                    className="btn-interactive flex h-10 w-10 items-center justify-center rounded-lg bg-[#ED4245] text-white hover:bg-[#C03A3C]"
                    title="Reject"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}

            {pendingRequests.length === 0 && (
              <div className="text-center py-12">
                <Clock className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No pending requests</h3>
                <p className="text-gray-400">All caught up!</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'add' && (
          <div className="p-4">
            <div className="mb-6">
              <h3 className="text-white font-medium mb-4">Add Friend</h3>
              <div className="flex space-x-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Enter username..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearchUsers(searchQuery)}
                    className="w-full rounded-lg border border-gray-700/50 bg-[#21262D] py-3 px-4 text-white placeholder-gray-400 focus:border-[#57F287] focus:ring-[#57F287]/20 focus:outline-none"
                  />
                </div>
                <button
                  onClick={() => handleSearchUsers(searchQuery)}
                  disabled={!searchQuery.trim() || isSearching}
                  className="btn-interactive bg-[#57F287] text-black px-6 py-3 rounded-lg font-medium hover:bg-[#3BA55C] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSearching ? (
                    <div className="animate-enhanced-spin h-4 w-4 border-2 border-black border-t-transparent rounded-full" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-white font-medium">Search Results</h4>
                {searchResults.map(result => (
                  <div
                    key={result.id}
                    className="message-hover flex items-center justify-between p-4 rounded-xl"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#57F287] to-[#3BA55C] font-bold text-black">
                        {result.username[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-white">{result.username}</div>
                        <div className="text-sm text-gray-400">Click to send friend request</div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleSendFriendRequest(result.username)}
                      className="btn-interactive flex items-center space-x-2 bg-[#57F287] text-black px-4 py-2 rounded-lg font-medium hover:bg-[#3BA55C]"
                    >
                      <UserPlus className="h-4 w-4" />
                      <span>Add Friend</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
