import React, { useState, useRef, useEffect } from 'react';
import { 
  Phone, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Users,
  Volume2,
  VolumeX,
  Headphones,
  Settings,
  Monitor,
  MonitorOff,
  Maximize2,
  Minimize2,
  Signal,
  Wifi,
  WifiOff,
  PersonStanding,
  Crown,
  Shield,
  UserCheck,
  Activity,
} from 'lucide-react';

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
  role?: 'admin' | 'moderator' | 'member';
}

interface EnhancedVoiceChannelProps {
  channelId: string;
  channelName: string;
  channelEmoji?: string;
  isInChannel: boolean;
  participants: VoiceParticipant[];
  currentUser: {
    id: string;
    username: string;
    avatar?: string;
    isAudioEnabled: boolean;
    isVideoEnabled: boolean;
    isScreenSharing: boolean;
    isDeafened: boolean;
    isSpeaking: boolean;
    connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
  };
  onJoinChannel: (channelId: string, callType: 'voice' | 'video' | 'screen') => void;
  onLeaveChannel: () => void;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleDeafen: () => void;
  onToggleScreenShare: () => void;
  onOpenSettings?: () => void;
  maxParticipants?: number;
  allowVideo?: boolean;
  allowScreenShare?: boolean;
  isLocked?: boolean;
  showInSidebar?: boolean;
  className?: string;
}

const EnhancedVoiceChannel: React.FC<EnhancedVoiceChannelProps> = ({
  channelId,
  channelName,
  channelEmoji = '🔊',
  isInChannel,
  participants,
  currentUser,
  onJoinChannel,
  onLeaveChannel,
  onToggleAudio,
  onToggleVideo,
  onToggleDeafen,
  onToggleScreenShare,
  onOpenSettings,
  maxParticipants = 20,
  allowVideo = true,
  allowScreenShare = true,
  isLocked = false,
  showInSidebar = true,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hoveredParticipant, setHoveredParticipant] = useState<string | null>(null);
  const [showConnectionInfo, setShowConnectionInfo] = useState(false);
  const [callType, setCallType] = useState<'voice' | 'video' | 'screen'>('voice');
  
  const audioVisualizationRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();

  // Connection quality indicators
  const getConnectionIcon = (quality: 'excellent' | 'good' | 'fair' | 'poor') => {
    switch (quality) {
      case 'excellent':
        return <Signal className="h-3 w-3 text-green-400" />;
      case 'good':
        return <Signal className="h-3 w-3 text-yellow-400" />;
      case 'fair':
        return <Wifi className="h-3 w-3 text-orange-400" />;
      case 'poor':
        return <WifiOff className="h-3 w-3 text-red-400" />;
      default:
        return <Signal className="h-3 w-3 text-gray-400" />;
    }
  };

  // Role icons
  const getRoleIcon = (role?: string) => {
    switch (role) {
      case 'admin':
        return <Crown className="h-3 w-3 text-yellow-400" />;
      case 'moderator':
        return <Shield className="h-3 w-3 text-blue-400" />;
      default:
        return null;
    }
  };

  // Audio visualization for speaking participants
  useEffect(() => {
    if (!isInChannel || !audioVisualizationRef.current) return;

    const canvas = audioVisualizationRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawAudioVisualization = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw speaking indicators for participants
      participants.forEach((participant, index) => {
        if (participant.isSpeaking && participant.volume > 0) {
          const barHeight = Math.max(2, participant.volume * 20);
          const x = index * 8;
          const y = (canvas.height - barHeight) / 2;
          
          // Gradient based on volume
          const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
          gradient.addColorStop(0, '#57F287');
          gradient.addColorStop(1, '#3BA55C');
          
          ctx.fillStyle = gradient;
          ctx.fillRect(x, y, 4, barHeight);
        }
      });
      
      // Add current user if speaking
      if (currentUser.isSpeaking) {
        const barHeight = Math.max(2, 20);
        const x = participants.length * 8;
        const y = (canvas.height - barHeight) / 2;
        
        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
        gradient.addColorStop(0, '#57F287');
        gradient.addColorStop(1, '#3BA55C');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, 4, barHeight);
      }
      
      animationFrameRef.current = requestAnimationFrame(drawAudioVisualization);
    };

    if (isInChannel) {
      drawAudioVisualization();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isInChannel, participants, currentUser.isSpeaking]);

  const handleJoinChannel = (type: 'voice' | 'video' | 'screen') => {
    if (participants.length >= maxParticipants) {
      // Show error message
      return;
    }
    
    setCallType(type);
    onJoinChannel(channelId, type);
  };

  const totalParticipants = participants.length + (isInChannel ? 1 : 0);
  const speakingCount = participants.filter(p => p.isSpeaking).length + (isInChannel && currentUser.isSpeaking ? 1 : 0);
  const videoCount = participants.filter(p => p.isVideoEnabled).length + (isInChannel && currentUser.isVideoEnabled ? 1 : 0);
  const screenShareCount = participants.filter(p => p.isScreenSharing).length + (isInChannel && currentUser.isScreenSharing ? 1 : 0);

  // Sidebar version (compact)
  if (showInSidebar) {
    return (
      <div className={`group relative rounded-lg transition-all duration-200 hover:bg-gray-700/30 ${className}`}>
        <div className="flex items-center justify-between p-2">
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            <div className="flex-shrink-0">
              {channelEmoji}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-1">
                <span className="text-sm font-medium text-gray-200 truncate">
                  {channelName}
                </span>
                {isLocked && (
                  <div className="text-gray-400" title="Channel is locked">
                    🔒
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-2 text-xs text-gray-400">
                <span>{totalParticipants}/{maxParticipants}</span>
                {speakingCount > 0 && (
                  <span className="flex items-center space-x-1 text-green-400">
                    <Activity className="h-3 w-3" />
                    <span>{speakingCount}</span>
                  </span>
                )}
                {videoCount > 0 && (
                  <span className="flex items-center space-x-1 text-blue-400">
                    <Video className="h-3 w-3" />
                    <span>{videoCount}</span>
                  </span>
                )}
                {screenShareCount > 0 && (
                  <span className="flex items-center space-x-1 text-purple-400">
                    <Monitor className="h-3 w-3" />
                    <span>{screenShareCount}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {!isInChannel ? (
              <div className="flex space-x-1">
                <button
                  onClick={() => handleJoinChannel('voice')}
                  className="p-1 rounded hover:bg-gray-600 text-gray-400 hover:text-green-400 transition-colors"
                  title="Join voice"
                >
                  <Phone className="h-3 w-3" />
                </button>
                {allowVideo && (
                  <button
                    onClick={() => handleJoinChannel('video')}
                    className="p-1 rounded hover:bg-gray-600 text-gray-400 hover:text-blue-400 transition-colors"
                    title="Join with video"
                  >
                    <Video className="h-3 w-3" />
                  </button>
                )}
                {allowScreenShare && (
                  <button
                    onClick={() => handleJoinChannel('screen')}
                    className="p-1 rounded hover:bg-gray-600 text-gray-400 hover:text-purple-400 transition-colors"
                    title="Join and share screen"
                  >
                    <Monitor className="h-3 w-3" />
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={onLeaveChannel}
                className="p-1 rounded hover:bg-red-600 text-red-400 hover:text-white transition-colors"
                title="Leave channel"
              >
                <PhoneOff className="h-3 w-3" />
              </button>
            )}
            {onOpenSettings && (
              <button
                onClick={onOpenSettings}
                className="p-1 rounded hover:bg-gray-600 text-gray-400 hover:text-white transition-colors"
                title="Channel settings"
              >
                <Settings className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
        
        {isInChannel && (
          <div className="border-t border-gray-700/50 p-2">
            {/* Audio visualization */}
            <div className="mb-2">
              <canvas
                ref={audioVisualizationRef}
                width={200}
                height={20}
                className="w-full h-5 rounded bg-gray-800/50"
              />
            </div>
            
            {/* Participants list */}
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {/* Current user */}
              <div className="flex items-center space-x-2 text-xs">
                <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-all duration-200 ${
                  currentUser.isSpeaking 
                    ? 'bg-gradient-to-br from-[#57F287] to-[#3BA55C] text-black ring-2 ring-[#57F287] shadow-lg animate-pulse' 
                    : 'bg-gradient-to-br from-[#57F287] to-[#3BA55C] text-black'
                }`}>
                  {currentUser.avatar ? (
                    <img 
                      src={currentUser.avatar} 
                      alt={currentUser.username} 
                      className="h-full w-full object-cover rounded-full"
                    />
                  ) : (
                    currentUser.username[0]?.toUpperCase()
                  )}
                </div>
                <span className="text-green-400 font-medium truncate flex-1">
                  {currentUser.username} (You)
                </span>
                <div className="flex items-center space-x-1">
                  {getConnectionIcon(currentUser.connectionQuality)}
                  {!currentUser.isAudioEnabled && <MicOff className="h-3 w-3 text-red-400" />}
                  {currentUser.isDeafened && <VolumeX className="h-3 w-3 text-red-400" />}
                  {currentUser.isVideoEnabled && <Video className="h-3 w-3 text-blue-400" />}
                  {currentUser.isScreenSharing && <Monitor className="h-3 w-3 text-purple-400" />}
                </div>
              </div>
              
              {/* Other participants */}
              {participants.map((participant) => (
                <div 
                  key={participant.userId}
                  className="flex items-center space-x-2 text-xs"
                  onMouseEnter={() => setHoveredParticipant(participant.userId)}
                  onMouseLeave={() => setHoveredParticipant(null)}
                >
                  <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-all duration-200 ${
                    participant.isSpeaking 
                      ? 'bg-gradient-to-br from-[#5865F2] to-[#4752C4] text-white ring-2 ring-[#57F287] shadow-lg animate-pulse' 
                      : 'bg-gradient-to-br from-[#5865F2] to-[#4752C4] text-white'
                  }`}>
                    {participant.avatar ? (
                      <img 
                        src={participant.avatar} 
                        alt={participant.username} 
                        className="h-full w-full object-cover rounded-full"
                      />
                    ) : (
                      participant.username[0]?.toUpperCase()
                    )}
                  </div>
                  <span className="text-gray-200 truncate flex-1 flex items-center space-x-1">
                    <span>{participant.username}</span>
                    {getRoleIcon(participant.role)}
                  </span>
                  <div className="flex items-center space-x-1">
                    {getConnectionIcon(participant.connectionQuality)}
                    {!participant.isAudioEnabled && <MicOff className="h-3 w-3 text-red-400" />}
                    {participant.isVideoEnabled && <Video className="h-3 w-3 text-blue-400" />}
                    {participant.isScreenSharing && <Monitor className="h-3 w-3 text-purple-400" />}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Controls */}
            <div className="flex items-center justify-center space-x-1 mt-2 pt-2 border-t border-gray-700/50">
              <button
                onClick={onToggleAudio}
                className={`flex h-6 w-6 items-center justify-center rounded text-xs transition-all duration-200 ${
                  currentUser.isAudioEnabled
                    ? 'bg-gray-600 text-white hover:bg-gray-500'
                    : 'bg-red-500 text-white hover:bg-red-400 shadow-lg'
                }`}
                title={currentUser.isAudioEnabled ? 'Mute' : 'Unmute'}
              >
                {currentUser.isAudioEnabled ? (
                  <Mic className="h-3 w-3" />
                ) : (
                  <MicOff className="h-3 w-3" />
                )}
              </button>

              <button
                onClick={onToggleDeafen}
                className={`flex h-6 w-6 items-center justify-center rounded text-xs transition-all duration-200 ${
                  currentUser.isDeafened
                    ? 'bg-red-500 text-white hover:bg-red-400 shadow-lg'
                    : 'bg-gray-600 text-white hover:bg-gray-500'
                }`}
                title={currentUser.isDeafened ? 'Undeafen' : 'Deafen'}
              >
                {currentUser.isDeafened ? (
                  <VolumeX className="h-3 w-3" />
                ) : (
                  <Headphones className="h-3 w-3" />
                )}
              </button>

              {allowVideo && (
                <button
                  onClick={onToggleVideo}
                  className={`flex h-6 w-6 items-center justify-center rounded text-xs transition-all duration-200 ${
                    currentUser.isVideoEnabled
                      ? 'bg-blue-500 text-white hover:bg-blue-400 shadow-lg'
                      : 'bg-gray-600 text-white hover:bg-gray-500'
                  }`}
                  title={currentUser.isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
                >
                  {currentUser.isVideoEnabled ? (
                    <Video className="h-3 w-3" />
                  ) : (
                    <VideoOff className="h-3 w-3" />
                  )}
                </button>
              )}

              {allowScreenShare && (
                <button
                  onClick={onToggleScreenShare}
                  className={`flex h-6 w-6 items-center justify-center rounded text-xs transition-all duration-200 ${
                    currentUser.isScreenSharing
                      ? 'bg-purple-500 text-white hover:bg-purple-400 shadow-lg'
                      : 'bg-gray-600 text-white hover:bg-gray-500'
                  }`}
                  title={currentUser.isScreenSharing ? 'Stop screen share' : 'Share screen'}
                >
                  {currentUser.isScreenSharing ? (
                    <MonitorOff className="h-3 w-3" />
                  ) : (
                    <Monitor className="h-3 w-3" />
                  )}
                </button>
              )}
              
              <button
                onClick={() => setShowConnectionInfo(!showConnectionInfo)}
                className="flex h-6 w-6 items-center justify-center rounded text-xs bg-gray-600 text-white hover:bg-gray-500 transition-colors"
                title="Connection info"
              >
                {getConnectionIcon(currentUser.connectionQuality)}
              </button>
            </div>
            
            {/* Connection info */}
            {showConnectionInfo && (
              <div className="mt-2 p-2 bg-gray-800/50 rounded text-xs">
                <div className="flex justify-between items-center">
                  <span>Connection Quality:</span>
                  <span className={`font-medium ${
                    currentUser.connectionQuality === 'excellent' ? 'text-green-400' :
                    currentUser.connectionQuality === 'good' ? 'text-yellow-400' :
                    currentUser.connectionQuality === 'fair' ? 'text-orange-400' :
                    'text-red-400'
                  }`}>
                    {currentUser.connectionQuality.charAt(0).toUpperCase() + currentUser.connectionQuality.slice(1)}
                  </span>
                </div>
                <div className="text-gray-400 mt-1">
                  {totalParticipants} participants • {speakingCount} speaking
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Full version (for main content area)
  return (
    <div className={`bg-gray-800 rounded-lg shadow-lg ${className}`}>
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">{channelEmoji}</div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <span>{channelName}</span>
                {isLocked && <span className="text-gray-400">🔒</span>}
              </h3>
              <p className="text-sm text-gray-400">
                {totalParticipants}/{maxParticipants} participants
                {speakingCount > 0 && (
                  <span className="ml-2 text-green-400">
                    • {speakingCount} speaking
                  </span>
                )}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {!isInChannel ? (
              <>
                <button
                  onClick={() => handleJoinChannel('voice')}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors"
                >
                  <Phone className="h-4 w-4" />
                  <span>Join Voice</span>
                </button>
                {allowVideo && (
                  <button
                    onClick={() => handleJoinChannel('video')}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
                  >
                    <Video className="h-4 w-4" />
                    <span>Join Video</span>
                  </button>
                )}
              </>
            ) : (
              <button
                onClick={onLeaveChannel}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors"
              >
                <PhoneOff className="h-4 w-4" />
                <span>Leave</span>
              </button>
            )}
          </div>
        </div>
      </div>
      
      {isInChannel && (
        <div className="p-4">
          {/* Audio visualization */}
          <div className="mb-4">
            <canvas
              ref={audioVisualizationRef}
              width={600}
              height={40}
              className="w-full h-10 rounded bg-gray-900/50"
            />
          </div>
          
          {/* Participants grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Current user */}
            <div className="bg-gray-700 rounded-lg p-3">
              <div className="flex flex-col items-center space-y-2">
                <div className={`relative flex h-12 w-12 items-center justify-center rounded-full font-bold transition-all duration-200 ${
                  currentUser.isSpeaking 
                    ? 'bg-gradient-to-br from-[#57F287] to-[#3BA55C] text-black ring-4 ring-[#57F287] shadow-xl animate-pulse scale-110' 
                    : 'bg-gradient-to-br from-[#57F287] to-[#3BA55C] text-black'
                }`}>
                  {currentUser.avatar ? (
                    <img 
                      src={currentUser.avatar} 
                      alt={currentUser.username} 
                      className="h-full w-full object-cover rounded-full"
                    />
                  ) : (
                    currentUser.username[0]?.toUpperCase()
                  )}
                  <div className="absolute -bottom-1 -right-1 flex items-center space-x-1">
                    {getConnectionIcon(currentUser.connectionQuality)}
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-green-400 truncate">
                    {currentUser.username} (You)
                  </p>
                  <div className="flex items-center justify-center space-x-1 mt-1">
                    {!currentUser.isAudioEnabled && <MicOff className="h-3 w-3 text-red-400" />}
                    {currentUser.isDeafened && <VolumeX className="h-3 w-3 text-red-400" />}
                    {currentUser.isVideoEnabled && <Video className="h-3 w-3 text-blue-400" />}
                    {currentUser.isScreenSharing && <Monitor className="h-3 w-3 text-purple-400" />}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Other participants */}
            {participants.map((participant) => (
              <div 
                key={participant.userId}
                className="bg-gray-700 rounded-lg p-3 hover:bg-gray-600 transition-colors"
              >
                <div className="flex flex-col items-center space-y-2">
                  <div className={`relative flex h-12 w-12 items-center justify-center rounded-full font-bold transition-all duration-200 ${
                    participant.isSpeaking 
                      ? 'bg-gradient-to-br from-[#5865F2] to-[#4752C4] text-white ring-4 ring-[#57F287] shadow-xl animate-pulse scale-110' 
                      : 'bg-gradient-to-br from-[#5865F2] to-[#4752C4] text-white'
                  }`}>
                    {participant.avatar ? (
                      <img 
                        src={participant.avatar} 
                        alt={participant.username} 
                        className="h-full w-full object-cover rounded-full"
                      />
                    ) : (
                      participant.username[0]?.toUpperCase()
                    )}
                    <div className="absolute -bottom-1 -right-1 flex items-center space-x-1">
                      {getConnectionIcon(participant.connectionQuality)}
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-white truncate flex items-center justify-center space-x-1">
                      <span>{participant.username}</span>
                      {getRoleIcon(participant.role)}
                    </p>
                    <div className="flex items-center justify-center space-x-1 mt-1">
                      {!participant.isAudioEnabled && <MicOff className="h-3 w-3 text-red-400" />}
                      {participant.isVideoEnabled && <Video className="h-3 w-3 text-blue-400" />}
                      {participant.isScreenSharing && <Monitor className="h-3 w-3 text-purple-400" />}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Controls */}
          <div className="flex items-center justify-center space-x-3 mt-6 pt-4 border-t border-gray-700">
            <button
              onClick={onToggleAudio}
              className={`flex h-12 w-12 items-center justify-center rounded-full transition-all duration-200 ${
                currentUser.isAudioEnabled
                  ? 'bg-gray-600 text-white hover:bg-gray-500'
                  : 'bg-red-500 text-white hover:bg-red-400 shadow-lg'
              }`}
              title={currentUser.isAudioEnabled ? 'Mute' : 'Unmute'}
            >
              {currentUser.isAudioEnabled ? (
                <Mic className="h-5 w-5" />
              ) : (
                <MicOff className="h-5 w-5" />
              )}
            </button>

            <button
              onClick={onToggleDeafen}
              className={`flex h-12 w-12 items-center justify-center rounded-full transition-all duration-200 ${
                currentUser.isDeafened
                  ? 'bg-red-500 text-white hover:bg-red-400 shadow-lg'
                  : 'bg-gray-600 text-white hover:bg-gray-500'
              }`}
              title={currentUser.isDeafened ? 'Undeafen' : 'Deafen'}
            >
              {currentUser.isDeafened ? (
                <VolumeX className="h-5 w-5" />
              ) : (
                <Headphones className="h-5 w-5" />
              )}
            </button>

            {allowVideo && (
              <button
                onClick={onToggleVideo}
                className={`flex h-12 w-12 items-center justify-center rounded-full transition-all duration-200 ${
                  currentUser.isVideoEnabled
                    ? 'bg-blue-500 text-white hover:bg-blue-400 shadow-lg'
                    : 'bg-gray-600 text-white hover:bg-gray-500'
                }`}
                title={currentUser.isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
              >
                {currentUser.isVideoEnabled ? (
                  <Video className="h-5 w-5" />
                ) : (
                  <VideoOff className="h-5 w-5" />
                )}
              </button>
            )}

            {allowScreenShare && (
              <button
                onClick={onToggleScreenShare}
                className={`flex h-12 w-12 items-center justify-center rounded-full transition-all duration-200 ${
                  currentUser.isScreenSharing
                    ? 'bg-purple-500 text-white hover:bg-purple-400 shadow-lg'
                    : 'bg-gray-600 text-white hover:bg-gray-500'
                }`}
                title={currentUser.isScreenSharing ? 'Stop screen share' : 'Share screen'}
              >
                {currentUser.isScreenSharing ? (
                  <MonitorOff className="h-5 w-5" />
                ) : (
                  <Monitor className="h-5 w-5" />
                )}
              </button>
            )}
            
            {onOpenSettings && (
              <button
                onClick={onOpenSettings}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-600 text-white hover:bg-gray-500 transition-colors"
                title="Channel settings"
              >
                <Settings className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedVoiceChannel;
