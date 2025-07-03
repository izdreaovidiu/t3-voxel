"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Hash,
  Volume2,
  Mic,
  MicOff,
  Headphones,
  Settings,
  Plus,
  Search,
  Bell,
  Pin,
  Users,
  Gift,
  Smile,
  Phone,
  Video,
  MoreHorizontal,
  Crown,
  Shield,
  ArrowLeft,
  Send,
  Paperclip,
  AtSign,
  Trash2,
  Edit3,
  Loader2,
} from "lucide-react";
import { api } from "~/utils/api";
import { useEnhancedSocketContext } from "~/contexts/EnhancedSocketContext";
import { useSimpleWebRTC } from "~/hooks/useSimpleWebRTC";
import VoiceCallInterface from "~/components/VoiceCallInterface";
import VoiceChannelInterface from "~/components/voice/VoiceChannelInterface";
import VoiceChannelPage from "~/components/voice/VoiceChannelPage";
import ServerDropdown from "~/components/ServerDropdown";
import { useUser } from "@clerk/nextjs";
import { ThreeDotsMenu } from "~/components/ui/ThreeDotsMenu";
import { FriendsSystem } from "~/components/friends/FriendsSystem";
import { PrivateMessaging } from "~/components/messaging/PrivateMessaging";
import { PrivateVoiceChannel } from "~/components/voice/PrivateVoiceChannel";
import { ChannelManager } from "~/components/channels/ChannelManager";
import { ServerMembersList } from '~/components/server/ServerMembersList';

// Type definitions
interface Member {
  id?: string;
  name?: string;
  avatar?: string;
  status?: string;
  activity?: string;
  joinedAt?: string;
  role?: "admin" | "moderator" | "member";
}

interface Message {
  id: string;
  user: string;
  time: string;
  content: string;
  role: string;
  edited?: boolean;
  reactions?: Array<{
    emoji: string;
    count: number;
    users?: string[];
  }>;
}

interface Channel {
  id: string;
  name: string;
  emoji?: string;
  type: string;
  unread?: number;
  users?: number;
}

export interface DiscordServerPageProps {
  serverId?: string;
  onBack?: () => void;
}

// Helper function to create profile modal
const createProfileModal = (messageUser: string, userAvatar?: string) => {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm';
  modal.onclick = () => modal.remove();
  
  const content = document.createElement('div');
  content.className = 'w-full max-w-md p-6 bg-gradient-to-br from-[#161B22] via-[#21262D] to-[#0D1117] rounded-2xl border border-gray-700/50 shadow-2xl';
  content.onclick = (e) => e.stopPropagation();
  
  const avatar = userAvatar ? 
    `<img src="${userAvatar}" alt="${messageUser}" class="h-full w-full object-cover" onerror="this.style.display='none'; this.parentElement.innerHTML='${String(messageUser)[0]?.toUpperCase() || '?'}'">` :
    (String(messageUser)[0]?.toUpperCase() || '?');
  
  content.innerHTML = `
    <div class="text-center text-white">
      <div class="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full overflow-hidden bg-gradient-to-br from-[#57F287] to-[#3BA55C] text-black text-2xl font-bold ring-4 ring-[#57F287]/30">
        ${avatar}
      </div>
      <h3 class="text-xl font-bold mb-2">${messageUser}</h3>
      <p class="text-gray-400 mb-4">@${messageUser.toLowerCase().replace(/\s+/g, '.')}</p>
      <div class="space-y-3">
        <button class="w-full bg-[#57F287] hover:bg-[#3BA55C] text-black px-4 py-2 rounded-lg transition-colors flex items-center justify-center space-x-2">
          <span>💬</span>
          <span>Send Message</span>
        </button>
        <button class="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center space-x-2">
          <span>📞</span>
          <span>Voice Call</span>
        </button>
        <button class="w-full bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center space-x-2">
          <span>👥</span>
          <span>Add Friend</span>
        </button>
      </div>
      <button onclick="this.closest('.fixed').remove()" class="w-full mt-4 bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-lg transition-colors">
        Close
      </button>
    </div>
  `;
  
  modal.appendChild(content);
  return modal;
};

// Helper function to create user modal
const createUserModal = () => {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm';
  modal.onclick = () => modal.remove();
  
  const content = document.createElement('div');
  content.className = 'w-full max-w-md p-6 bg-gradient-to-br from-[#161B22] via-[#21262D] to-[#0D1117] rounded-2xl border border-gray-700/50 shadow-2xl';
  content.onclick = (e) => e.stopPropagation();
  
  content.innerHTML = `
    <div class="text-center text-white">
      <h3 class="text-xl font-bold mb-2">Profile Settings</h3>
      <p class="text-gray-400 mb-4">Manage your profile and account settings</p>
      <button onclick="window.open('/user-profile', '_blank'); this.closest('.fixed').remove()" class="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white px-4 py-2 rounded-lg transition-colors">
        Open Clerk Profile Settings
      </button>
      <button onclick="this.closest('.fixed').remove()" class="w-full mt-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors">
        Close
      </button>
    </div>
  `;
  
  modal.appendChild(content);
  return modal;
};

// Helper function to create settings modal
const createSettingsModal = () => {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm';
  modal.onclick = () => modal.remove();
  
  const content = document.createElement('div');
  content.className = 'w-full max-w-md p-6 bg-gradient-to-br from-[#161B22] via-[#21262D] to-[#0D1117] rounded-2xl border border-gray-700/50 shadow-2xl';
  content.onclick = (e) => e.stopPropagation();
  
  content.innerHTML = `
    <div class="text-center text-white">
      <h3 class="text-xl font-bold mb-4 flex items-center justify-center space-x-2">
        <span class="text-2xl">⚙️</span>
        <span>Profile Settings</span>
      </h3>
      <p class="text-gray-400 mb-6">Manage your profile and account settings</p>
      <div class="space-y-3">
        <button onclick="window.open('/user-profile', '_blank')" class="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white px-4 py-3 rounded-lg transition-colors flex items-center justify-center space-x-2">
          <span>🔧</span>
          <span>Open Profile Settings</span>
        </button>
        <button onclick="console.log('Account settings clicked')" class="w-full bg-gray-700 hover:bg-gray-600 text-white px-4 py-3 rounded-lg transition-colors flex items-center justify-center space-x-2">
          <span>👤</span>
          <span>Account Settings</span>
        </button>
        <button onclick="console.log('Privacy settings clicked')" class="w-full bg-gray-700 hover:bg-gray-600 text-white px-4 py-3 rounded-lg transition-colors flex items-center justify-center space-x-2">
          <span>🔒</span>
          <span>Privacy Settings</span>
        </button>
      </div>
      <button onclick="this.closest('.fixed').remove()" class="w-full mt-4 bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-lg transition-colors">
        Close
      </button>
    </div>
  `;
  
  modal.appendChild(content);
  return modal;
};

const DiscordServerPage: React.FC<DiscordServerPageProps> = ({
  serverId = "1",
  onBack,
}) => {
  const [selectedChannel, setSelectedChannel] = useState<string>("");
  const [message, setMessage] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [realtimeMessages, setRealtimeMessages] = useState<any[]>([]);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [isCallMinimized, setIsCallMinimized] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [showPrivateMessages, setShowPrivateMessages] = useState(false);
  const [isPrivateMessagesMinimized, setIsPrivateMessagesMinimized] =
    useState(false);
  const [privateCallFriend, setPrivateCallFriend] = useState<string | null>(
    null,
  );
  const [isPrivateCallMinimized, setIsPrivateCallMinimized] = useState(false);
  const [channels, setChannels] = useState<{ [category: string]: any[] }>({});
  const [activeVoiceChannelId, setActiveVoiceChannelId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'text' | 'voice'>('text');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { user } = useUser();

  const {
    sendMessage: socketSendMessage,
    subscribeToMessages,
    joinChannel,
    joinServer,
    clearNotifications,
    isConnected,
    socket,
    joinVoiceChannel,
    leaveVoiceChannel,
    isInVoiceChannel,
  } = useEnhancedSocketContext();

  // WebRTC hook
  const webRTC = useSimpleWebRTC({
    socket,
    userId: user?.id || "",
    username: user?.username || user?.firstName || "Unknown User",
  });

  const serverIdString = serverId;

  // Fetch server data
  const {
    data: server,
    isLoading: serverLoading,
    error: serverError,
  } = api.server.getServerById.useQuery(
    { serverId: serverIdString },
    {
      enabled: !!serverIdString,
      staleTime: 60000,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
    },
  );

  // Fetch channels
  const { data: channelData = {}, isLoading: channelsLoading } =
    api.channel.getServerChannels.useQuery(
      { serverId: serverIdString },
      {
        enabled: !!serverIdString,
        staleTime: 60000,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: false,
      },
    );

  // Fetch server members
  const { data: members = [], isLoading: membersLoading } =
    api.user.getServerMembers.useQuery(
      { serverId: serverIdString },
      {
        enabled: !!serverIdString,
        staleTime: 30000,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: false,
      },
    );

  // Fetch messages for selected channel
  const {
    data: messageData,
    isLoading: messagesLoading,
    fetchNextPage,
    hasNextPage,
  } = api.message.getChannelMessages.useInfiniteQuery(
    {
      channelId: selectedChannel,
      limit: 50,
    },
    {
      enabled: !!selectedChannel,
      getNextPageParam: (lastPage: { nextCursor: any }) => lastPage.nextCursor,
      staleTime: 15000,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
    },
  );

  // Mutations for user updates
  const updateUserMutation = api.user.updateProfile.useMutation();

  // Mutation for server updates
  const updateServerMutation = api.server.updateServer.useMutation({
    onSuccess: () => {
      console.log("Server updated successfully");
    },
    onError: (error) => {
      console.error("Failed to update server:", error);
    },
  });

  // Set default channel when channels load
  useEffect(() => {
    if (
      !selectedChannel &&
      channelData &&
      Object.keys(channelData).length > 0
    ) {
      for (const category of Object.keys(channelData)) {
        const textChannels = channelData[category].filter(
          (ch: any) => ch.type === "text",
        );
        if (textChannels.length > 0) {
          setSelectedChannel(textChannels[0].id);
          break;
        }
      }
    }
  }, [channelData, selectedChannel]);

  // Join server room and clear notifications
  useEffect(() => {
    if (serverIdString && isConnected) {
      joinServer(serverIdString);
      clearNotifications(serverIdString);
    }
  }, [serverIdString, isConnected, joinServer, clearNotifications]);

  // Join channel room when selected channel changes
  useEffect(() => {
    if (selectedChannel && serverIdString && isConnected) {
      joinChannel(selectedChannel, serverIdString);
    }
  }, [selectedChannel, serverIdString, isConnected, joinChannel]);

  // Subscribe to real-time messages
  useEffect(() => {
    if (!selectedChannel) return;
    
    const unsubscribe = subscribeToMessages((newMessage) => {
      if (newMessage.channelId === selectedChannel) {
        setRealtimeMessages((prev) => [
          ...prev,
          {
            id: newMessage.id,
            user: newMessage.username || newMessage.user?.username || "Unknown User",
            time: new Date(newMessage.createdAt).toLocaleTimeString(),
            content: newMessage.content,
            role: "member",
            edited: false,
            reactions: [],
          },
        ]);
      }
    });

    return unsubscribe;
  }, [selectedChannel, subscribeToMessages]);

  // Reset realtime messages when channel changes
  useEffect(() => {
    setRealtimeMessages([]);
  }, [selectedChannel]);

  // Convert channelData to the format expected by ChannelManager
  useEffect(() => {
    if (channelData && Object.keys(channelData).length > 0) {
      setChannels(prevChannels => {
        // Only update if the data has actually changed
        const channelDataString = JSON.stringify(channelData);
        const prevChannelsString = JSON.stringify(prevChannels);
        if (channelDataString !== prevChannelsString) {
          return channelData;
        }
        return prevChannels;
      });
    }
  }, [channelData]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messageData, realtimeMessages]);

  // Handler functions for new features
  const handleStartPrivateCall = (
    friendId: string,
    type: "voice" | "video",
  ) => {
    setPrivateCallFriend(friendId);
    setIsPrivateCallMinimized(false);
    console.log(`Starting ${type} call with ${friendId}`);
  };

  const handleStartPrivateMessage = (friendId: string) => {
    setShowPrivateMessages(true);
    setIsPrivateMessagesMinimized(false);
    console.log(`Starting private message with ${friendId}`);
  };

  const handleOpenFriends = () => {
    setShowFriends(true);
  };

  const handleOpenSettings = () => {
    window.open("/user-profile", "_blank");
  };

  const handleCreateChannel = (channelData: any) => {
    const newChannel = {
      id: Math.random().toString(),
      ...channelData,
    };

    setChannels((prev) => ({
      ...prev,
      [channelData.category]: [
        ...(prev[channelData.category] || []),
        newChannel,
      ],
    }));

    console.log("Creating channel:", newChannel);
  };

  const handleEditChannel = (channelId: string, updates: any) => {
    setChannels((prev) => {
      const newChannels = { ...prev };
      Object.keys(newChannels).forEach((category) => {
        newChannels[category] = newChannels[category].map((channel) =>
          channel.id === channelId ? { ...channel, ...updates } : channel,
        );
      });
      return newChannels;
    });

    console.log("Editing channel:", channelId, updates);
  };

  const handleDeleteChannel = (channelId: string) => {
    setChannels((prev) => {
      const newChannels = { ...prev };
      Object.keys(newChannels).forEach((category) => {
        newChannels[category] = newChannels[category].filter(
          (channel) => channel.id !== channelId,
        );
      });
      return newChannels;
    });

    console.log("Deleting channel:", channelId);
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !selectedChannel || sendingMessage) return;

    const messageContent = message.trim();
    setSendingMessage(true);
    setMessage(""); // Clear input immediately for better UX
    
    try {
      const result = await socketSendMessage(messageContent, selectedChannel);
      if (!result.success) {
        console.error("Failed to send message:", result.error);
        // Restore message on error
        setMessage(messageContent);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      // Restore message on error
      setMessage(messageContent);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleChannelSelect = (channelId: string) => {
    setSelectedChannel(channelId);
    // Clear notifications when switching channels
    if (serverIdString) {
      clearNotifications(serverIdString);
    }
  };

  const toggleMute = async () => {
    setIsMuted(!isMuted);
    try {
      await updateUserMutation.mutateAsync({});
    } catch (error) {
      console.error("Failed to update mute state:", error);
    }
  };

  const toggleDeafen = async () => {
    setIsDeafened(!isDeafened);
    try {
      await updateUserMutation.mutateAsync({});
    } catch (error) {
      console.error("Failed to update deafen state:", error);
    }
  };

  // Voice/Video call handlers
  const handleJoinVoiceChannel = (channelId: string) => {
    // Check if it's a voice channel
    const allChannels = Object.values(channels).flat();
    const channel = allChannels.find((ch: any) => ch.id === channelId);
    
    if (channel && (channel.type === 'voice' || channel.type === 'video')) {
      // Join voice channel through socket and switch to voice interface
      joinVoiceChannel(channelId, channel.type === 'video' ? 'video' : 'voice');
      setActiveVoiceChannelId(channelId);
      setViewMode('voice');
      console.log(`Joining voice channel: ${channelId}`);
    } else {
      // Old video call logic for text channels
      if (webRTC.isCallActive) {
        webRTC.endCall();
      } else {
        webRTC.startCall("voice", channelId);
      }
    }
  };

  // Leave voice channel handler
  const handleLeaveVoiceChannel = () => {
    if (activeVoiceChannelId) {
      leaveVoiceChannel(activeVoiceChannelId);
    }
    setActiveVoiceChannelId(null);
    setViewMode('text');
    console.log('Left voice channel');
  };

  // Switch to text channel handler
  const handleSwitchToTextChannel = (channelId: string) => {
    setSelectedChannel(channelId);
    setViewMode('text');
    setActiveVoiceChannelId(null);
  };

  const handleStartVideoCall = () => {
    if (selectedChannel) {
      webRTC.startCall("video", selectedChannel);
    }
  };

  const handleStartVoiceCall = () => {
    if (selectedChannel) {
      webRTC.startCall("voice", selectedChannel);
    }
  };

  // Server update handler
  const handleUpdateServer = async (data: {
    name?: string;
    icon?: string;
    color?: string;
    description?: string;
  }) => {
    try {
      await updateServerMutation.mutateAsync({
        serverId: serverIdString,
        ...data,
      });
      // Trigger a refetch of server data
      window.location.reload();
    } catch (error) {
      console.error("Failed to update server:", error);
    }
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
      case "idle":
        return "bg-[#FEE75C] shadow-[0_0_6px_rgba(254,231,92,0.5)]";
      case "dnd":
        return "bg-[#ED4245] shadow-[0_0_6px_rgba(237,66,69,0.5)]";
      case "offline":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };

  // Loading state
  if (serverLoading || channelsLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0D1117] text-white">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-[#57F287]" />
          <p className="text-gray-400">Loading server...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (serverError || !server) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0D1117] text-white">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold">Server Not Found</h1>
          <p className="mb-4 text-gray-400">
            The server you're looking for doesn't exist or you don't have
            access.
          </p>
          <button
            onClick={onBack}
            className="rounded-lg bg-[#5865F2] px-4 py-2 transition-colors hover:bg-[#4752C4]"
          >
            Back to Server List
          </button>
        </div>
      </div>
    );
  }

  // Get selected channel name
  const selectedChannelObj: Channel | undefined = Object.values(channelData)
    .flat()
    .find((ch) => (ch as Channel).id === selectedChannel) as
    | Channel
    | undefined;

  // Combine database messages with real-time messages
  const allMessages = [
    ...(messageData?.pages.flatMap(
      (page: { messages: any }) => page.messages,
    ) ?? []),
    ...realtimeMessages,
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-[#0D1117] text-white">
      {/* Channel Sidebar */}
      <div className="flex w-80 flex-col border-r border-gray-800/50 bg-[#161B22]">
        {/* Server Header */}
        <div
          className="flex h-16 items-center justify-between border-b border-gray-800/50 bg-gradient-to-r px-6 shadow-lg"
          style={{
            background: `linear-gradient(135deg, ${server.color?.split(" ")[1]} 0%, ${server.color?.split(" ")[3]} 100%)`,
          }}
        >
          <div className="flex items-center space-x-3">
            <button
              onClick={onBack}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-white transition-all duration-300 hover:bg-white/20"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center space-x-2">
              <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-white/10">
                {server.icon &&
                (server.icon.startsWith("data:image/") ||
                  server.icon.startsWith("http://") ||
                  server.icon.startsWith("https://")) ? (
                  <img
                    src={server.icon}
                    alt={`${server.name} icon`}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                      target.parentElement!.innerHTML =
                        '<span class="text-xl">🎮</span>';
                    }}
                  />
                ) : (
                  <span className="text-xl">{server.icon || "🎮"}</span>
                )}
              </div>
              <h2 className="text-lg font-bold text-white drop-shadow-lg">
                {server.name}
              </h2>
            </div>
          </div>
          <ThreeDotsMenu
            onFriendsClick={handleOpenFriends}
            onSettingsClick={handleOpenSettings}
          />
        </div>

        {/* Search */}
        <div className="p-4">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
            <input
              placeholder="Search channels..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-700/50 bg-[#21262D] py-2 pr-4 pl-10 text-white placeholder-gray-400 focus:border-[#57F287] focus:ring-[#57F287]/20 focus:outline-none"
            />
          </div>
        </div>

        {/* Channels */}
        <div className="flex-1 space-y-6 overflow-y-auto px-4 pb-4">
          <ChannelManager
            channels={channels}
            onCreateChannel={handleCreateChannel}
            onEditChannel={handleEditChannel}
            onDeleteChannel={handleDeleteChannel}
            onChannelClick={(channelId, channelType) => {
              if (channelType === "voice" || channelType === "video") {
                handleJoinVoiceChannel(channelId);
              } else {
                handleChannelSelect(channelId);
              }
            }}
            selectedChannelId={selectedChannel}
            searchQuery={searchQuery}
          />
        </div>

        {/* User Panel */}
        <div className="group flex h-20 items-center border-t border-gray-800/50 bg-[#21262D] px-4">
          <div
            className="relative mr-4 cursor-pointer transition-transform duration-200 hover:scale-105"
            onClick={() => {
              const modal = createUserModal();
              document.body.appendChild(modal);
            }}
            title="Click to open profile settings"
          >
            {user?.imageUrl ? (
              <img
                src={user.imageUrl}
                alt={user.firstName || user.username || "User"}
                className="h-12 w-12 rounded-full object-cover ring-2 ring-[#57F287]/30 transition-all duration-200 group-hover:ring-[#57F287]/50"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#57F287] to-[#3BA55C] font-bold text-black ring-2 ring-[#57F287]/30 transition-all duration-200 group-hover:ring-[#57F287]/50">
                {(
                  user?.firstName?.[0] ||
                  user?.username?.[0] ||
                  "U"
                ).toUpperCase()}
              </div>
            )}
            {/* Status indicator */}
            <div className="absolute -right-1 -bottom-1 h-4 w-4 rounded-full border-2 border-[#21262D] bg-[#57F287] shadow-[0_0_6px_rgba(87,242,135,0.6)] transition-all duration-200 group-hover:shadow-[0_0_10px_rgba(87,242,135,0.8)]" />
          </div>
          <div
            className="min-w-0 flex-1 cursor-pointer transition-colors duration-200 hover:text-[#57F287]"
            onClick={() => {
              const modal = createUserModal();
              document.body.appendChild(modal);
            }}
            title="Click to open profile settings"
          >
            <div className="text-sm font-bold text-white transition-colors duration-200 group-hover:text-[#57F287]">
              {user?.firstName && user?.lastName
                ? `${user.firstName} ${user.lastName}`
                : user?.username || user?.firstName || "User"}
            </div>
            <div className="text-xs text-gray-400 transition-colors duration-200 group-hover:text-gray-300">
              @
              {user?.username ||
                (user?.firstName && user?.lastName
                  ? `${user.firstName.toLowerCase()}.${user.lastName.toLowerCase()}`
                  : user?.firstName?.toLowerCase() ||
                    user?.id?.slice(-4) ||
                    "0000")}
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              className={`flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-300 ${
                isMuted
                  ? "bg-[#ED4245] text-white shadow-[0_0_10px_rgba(237,66,69,0.5)]"
                  : "text-gray-400 hover:bg-gray-700/50 hover:text-white hover:shadow-[0_0_10px_rgba(87,242,135,0.2)]"
              }`}
              onClick={toggleMute}
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </button>

            <button
              className={`flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-300 ${
                isDeafened
                  ? "bg-[#ED4245] text-white shadow-[0_0_10px_rgba(237,66,69,0.5)]"
                  : "text-gray-400 hover:bg-gray-700/50 hover:text-white hover:shadow-[0_0_10px_rgba(87,242,135,0.2)]"
              }`}
              onClick={toggleDeafen}
              title={isDeafened ? "Undeafen" : "Deafen"}
            >
              <Headphones className="h-4 w-4" />
            </button>

            <button
              className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition-all duration-300 hover:rotate-90 hover:bg-gray-700/50 hover:text-[#57F287] hover:shadow-[0_0_10px_rgba(87,242,135,0.2)]"
              title="Profile Settings"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const modal = createSettingsModal();
                document.body.appendChild(modal);
              }}
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col bg-[#0D1117]">
        {/* Conditional Rendering: Enhanced Voice Channel Page or Text Chat */}
        {viewMode === 'voice' && activeVoiceChannelId ? (
          <VoiceChannelPage
            channelId={activeVoiceChannelId}
            channelName={Object.values(channels).flat().find((ch: any) => ch.id === activeVoiceChannelId)?.name || "Voice Channel"}
            channelEmoji={Object.values(channels).flat().find((ch: any) => ch.id === activeVoiceChannelId)?.emoji || "🔊"}
            serverId={serverIdString}
            onLeaveChannel={handleLeaveVoiceChannel}
            onSwitchToTextChannel={handleSwitchToTextChannel}
          />
        ) : (
          <>
            {/* Chat Header */}
            <div className="flex h-16 items-center justify-between border-b border-gray-800/50 bg-[#161B22]/50 px-6 backdrop-blur-sm">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-3">
                  <span className="text-xl">
                    {selectedChannelObj?.emoji || "💬"}
                  </span>
                  <Hash className="h-6 w-6 text-[#57F287]" />
                  <span className="text-lg font-bold text-white">
                    {selectedChannelObj?.name || "Select a channel"}
                  </span>
                </div>
                <div className="h-6 w-px bg-gray-700" />
                <span className="text-sm text-gray-400">
                  Welcome to #{selectedChannelObj?.name}! Share your thoughts here.
                </span>
                <div className="flex items-center space-x-2">
                  <div
                    className={`h-2 w-2 rounded-full ${isConnected ? "bg-[#57F287]" : "bg-[#ED4245]"} ${isConnected ? "shadow-[0_0_6px_rgba(87,242,135,0.6)]" : "shadow-[0_0_6px_rgba(237,66,69,0.6)]"}`}
                  />
                  <span
                    className={`text-xs ${isConnected ? "text-[#57F287]" : "text-[#ED4245]"}`}
                  >
                    {isConnected ? "Live" : "Offline"}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={handleStartVoiceCall}
                  disabled={!selectedChannel}
                  className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
                    webRTC.isCallActive && webRTC.currentCallType === "voice"
                      ? "bg-[#57F287] text-black shadow-[0_0_20px_rgba(87,242,135,0.3)]"
                      : "text-gray-400 hover:bg-gray-700/30 hover:text-[#57F287] disabled:cursor-not-allowed disabled:opacity-50"
                  }`}
                  title="Start voice call"
                >
                  <Phone className="h-5 w-5" />
                </button>
                <button
                  onClick={handleStartVideoCall}
                  disabled={!selectedChannel}
                  className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
                    webRTC.isCallActive && webRTC.currentCallType === "video"
                      ? "bg-[#57F287] text-black shadow-[0_0_20px_rgba(87,242,135,0.3)]"
                      : "text-gray-400 hover:bg-gray-700/30 hover:text-[#57F287] disabled:cursor-not-allowed disabled:opacity-50"
                  }`}
                  title="Start video call"
                >
                  <Video className="h-5 w-5" />
                </button>
                <button className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-700/30 hover:text-[#57F287]">
                  <Pin className="h-5 w-5" />
                </button>
                <button className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-700/30 hover:text-[#57F287]">
                  <Users className="h-5 w-5" />
                </button>
                <button className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-700/30 hover:text-[#57F287]">
                  <Bell className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
              {messagesLoading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-[#57F287]" />
                </div>
              )}

              {hasNextPage && (
                <div className="flex justify-center">
                  <button
                    onClick={() => fetchNextPage()}
                    className="text-sm text-[#57F287] hover:text-[#3BA55C]"
                  >
                    Load more messages
                  </button>
                </div>
              )}

              {(allMessages as Message[]).map((msg: Message) => {
                // Extract username and avatar from message user data
                let messageUser: string;
                let userAvatar: string | undefined;
                let userId: string | undefined;
                
                if (typeof msg.user === 'string') {
                  messageUser = msg.user;
                  userAvatar = undefined;
                  userId = undefined;
                } else if (msg.user && typeof msg.user === 'object') {
                  const userObj = msg.user as any;
                  messageUser = userObj.username || userObj.name || userObj.displayName || "Unknown User";
                  userAvatar = userObj.avatar || userObj.imageUrl || userObj.image;
                  userId = userObj.id || userObj.userId;
                } else {
                  messageUser = "Unknown User";
                  userAvatar = undefined;
                  userId = undefined;
                }
                
                // Find member data from server members list for avatar fallback
                const memberData = members.find(member => 
                  member.id === userId || 
                  member.username === messageUser ||
                  member.name === messageUser ||
                  (member.firstName && member.lastName && `${member.firstName} ${member.lastName}` === messageUser)
                );
                
                // Use member avatar if message doesn't have one
                if (!userAvatar && memberData) {
                  userAvatar = memberData.imageUrl || memberData.avatar;
                }
                
                return (
                  <div
                    key={msg.id}
                    className="group rounded-xl px-4 py-3 transition-all duration-200 hover:bg-[#161B22]/30"
                  >
                    <div className="flex space-x-4">
                      {/* User Avatar - Clickable */}
                      <div 
                        className="mt-1 relative cursor-pointer transition-transform duration-200 hover:scale-105"
                        onClick={() => {
                          const modal = createProfileModal(messageUser, userAvatar);
                          document.body.appendChild(modal);
                        }}
                        title="Click to view profile"
                      >
                        {userAvatar ? (
                          <img
                            src={userAvatar}
                            alt={messageUser}
                            className="h-12 w-12 rounded-full object-cover ring-2 ring-gray-700/50 transition-all duration-200 hover:ring-[#57F287]/50"
                            onError={(e) => {
                              // Fallback to initials if image fails to load
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const fallback = document.createElement('div');
                              fallback.className = 'flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#57F287] to-[#3BA55C] font-bold text-black ring-2 ring-gray-700/50';
                              fallback.textContent = messageUser ? String(messageUser)[0]?.toUpperCase() : '?';
                              target.parentNode?.insertBefore(fallback, target);
                            }}
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#57F287] to-[#3BA55C] font-bold text-black ring-2 ring-gray-700/50 transition-all duration-200 hover:ring-[#57F287]/50">
                            {messageUser ? String(messageUser)[0]?.toUpperCase() : "?"}
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex items-center space-x-3">
                          <span className="text-base font-bold text-white">
                            {messageUser}
                          </span>
                          {getRoleIcon(msg.role)}
                          <span className="rounded-full bg-[#21262D] px-2 py-1 text-xs text-gray-400">
                            {msg.time}
                          </span>
                          {msg.edited && (
                            <span className="text-xs text-gray-500">(edited)</span>
                          )}
                        </div>

                        <p className="mb-3 rounded-lg border border-gray-800/30 bg-[#161B22]/50 p-4 text-sm leading-relaxed text-gray-200">
                          {msg.content}
                        </p>

                        {msg.reactions && msg.reactions.length > 0 && (
                          <div className="mb-2 flex flex-wrap gap-2">
                            {msg.reactions.map((reaction, index) => (
                              <button
                                key={index}
                                className="rounded-full border border-gray-700/50 bg-[#21262D] px-3 py-1 text-xs font-medium text-gray-300 transition-all duration-200 hover:border-[#57F287]/50 hover:bg-[#57F287]/20 hover:text-[#57F287]"
                                title={`${reaction.users?.join(", ") || "Someone"} reacted with ${reaction.emoji}`}
                              >
                                {reaction.emoji} {reaction.count}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex space-x-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                        <button className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:text-[#57F287]">
                          <Smile className="h-4 w-4" />
                        </button>
                        <button className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:text-[#FEE75C]">
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:text-[#ED4245]">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="px-6 pb-6">
              <div className="rounded-xl border border-gray-700/50 bg-[#21262D] p-4">
                <div className="flex items-end space-x-3">
                  <button className="mb-1 flex h-10 w-10 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-700/30 hover:text-[#57F287]">
                    <Paperclip className="h-5 w-5" />
                  </button>

                  <div className="flex-1">
                    <input
                      placeholder={`Message #${selectedChannelObj?.name || "channel"}`}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      disabled={!selectedChannel}
                      className="min-h-[40px] w-full border-none bg-transparent text-sm text-white placeholder-gray-400 focus:outline-none disabled:opacity-50"
                    />
                  </div>

                  <div className="mb-1 flex items-center space-x-2">
                    <button className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-700/30 hover:text-[#57F287]">
                      <AtSign className="h-5 w-5" />
                    </button>
                    <button className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-700/30 hover:text-[#57F287]">
                      <Smile className="h-5 w-5" />
                    </button>
                    <button className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-700/30 hover:text-[#57F287]">
                      <Gift className="h-5 w-5" />
                    </button>

                    <button
                      onClick={handleSendMessage}
                      disabled={!message.trim() || !selectedChannel || sendingMessage}
                      className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#57F287] text-black shadow-[0_0_20px_rgba(87,242,135,0.3)] transition-all duration-200 hover:bg-[#3BA55C] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {sendingMessage ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Members List with Presence */}
      <ServerMembersList
        serverId={serverIdString}
        serverMembers={members}
        membersLoading={membersLoading}
        isConnected={isConnected}
      />

      {/* Voice/Video Call Interface */}
      <VoiceCallInterface
        isCallActive={webRTC.isCallActive}
        isAudioEnabled={webRTC.isAudioEnabled}
        isVideoEnabled={webRTC.isVideoEnabled}
        isScreenSharing={webRTC.isScreenSharing}
        currentCallType={webRTC.currentCallType}
        currentChannelId={webRTC.currentChannelId}
        currentChannelName={selectedChannelObj?.name}
        currentChannelEmoji={selectedChannelObj?.emoji}
        currentUserAvatar={user?.imageUrl}
        currentUserName={user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.username || user?.firstName || "You"}
        peers={webRTC.peers}
        voiceParticipants={webRTC.peers.map(peer => ({
          id: peer.id,
          username: peer.username || peer.id,
          isMuted: false,
          isDeafened: false,
          isVideoEnabled: false,
          isSpeaking: false
        }))}
        incomingCall={webRTC.incomingCall}
        localVideoRef={webRTC.localVideoRef}
        screenShareRef={webRTC.screenShareRef}
        onEndCall={webRTC.endCall}
        onToggleAudio={webRTC.toggleAudio}
        onToggleVideo={webRTC.toggleVideo}
        onToggleScreenShare={() => {
          if (webRTC.isScreenSharing) {
            webRTC.stopScreenShare();
          } else {
            webRTC.startScreenShare();
          }
        }}
        onAnswerCall={webRTC.answerCall}
        onDeclineCall={webRTC.declineCall}
        isMinimized={isCallMinimized}
        onToggleMinimize={() => setIsCallMinimized(!isCallMinimized)}
        isDeafened={isDeafened}
        cameraError={null}
        getCameraDevices={async () => {
          try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            return devices.filter(device => device.kind === 'videoinput');
          } catch (error) {
            console.error('Failed to get camera devices:', error);
            return [];
          }
        }}
        getUserMedia={async (video = false) => {
          try {
            return await navigator.mediaDevices.getUserMedia({
              audio: true,
              video: video ? { width: 1280, height: 720 } : false
            });
          } catch (error) {
            console.error('Failed to get user media:', error);
            throw error;
          }
        }}
        forceReleaseAllDevices={async () => {
          // This would need to be implemented in webRTC hook
          console.log('Force releasing all devices...');
        }}
      />

      {/* Private Voice Channel */}
      {privateCallFriend && (
        <PrivateVoiceChannel
          isActive={true}
          callType="voice"
          participants={[
            {
              id: user?.id || "",
              username: user?.username || user?.firstName || "You",
              avatar: user?.imageUrl,
              isMuted,
              isDeafened,
              isVideoEnabled: false,
              isSpeaking: false,
            },
            {
              id: privateCallFriend,
              username: privateCallFriend,
              isMuted: false,
              isDeafened: false,
              isVideoEnabled: false,
              isSpeaking: false,
            },
          ]}
          currentUserId={user?.id || ""}
          channelName="Private Call"
          onEndCall={() => setPrivateCallFriend(null)}
          onToggleMute={toggleMute}
          onToggleDeafen={toggleDeafen}
          isMinimized={isPrivateCallMinimized}
          onToggleMinimize={() =>
            setIsPrivateCallMinimized(!isPrivateCallMinimized)
          }
        />
      )}

      {/* Friends System Overlay */}
      {showFriends && (
        <div className="animate-backdrop-in fixed inset-0 z-40 bg-black/70 backdrop-blur-sm">
          <div className="animate-modal-in fixed inset-y-0 right-0 w-96 border-l border-gray-800/50 bg-[#0D1117] shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-800/50 p-4">
              <h2 className="text-xl font-bold text-white">Friends</h2>
              <button
                onClick={() => setShowFriends(false)}
                className="btn-interactive flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-700/50 hover:text-white"
              >
                ×
              </button>
            </div>
            <FriendsSystem
              onStartPrivateCall={handleStartPrivateCall}
              onStartPrivateMessage={handleStartPrivateMessage}
            />
          </div>
        </div>
      )}

      {/* Private Messaging */}
      {showPrivateMessages && (
        <PrivateMessaging
          onClose={() => setShowPrivateMessages(false)}
          onStartCall={handleStartPrivateCall}
          isMinimized={isPrivateMessagesMinimized}
          onToggleMinimize={() =>
            setIsPrivateMessagesMinimized(!isPrivateMessagesMinimized)
          }
        />
      )}
    </div>
  );
};

export default DiscordServerPage;