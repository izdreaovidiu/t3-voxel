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
  Minimize2,
  Maximize2,
  Monitor,
  MonitorOff,
} from 'lucide-react';

interface Peer {
  id: string;
  stream?: MediaStream;
  username?: string;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
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

interface VoiceCallInterfaceProps {
  isCallActive: boolean;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  currentCallType: 'voice' | 'video' | 'screen' | null;
  currentChannelId: string | null;
  currentChannelName?: string;
  currentChannelEmoji?: string;
  currentUserAvatar?: string;
  currentUserName?: string;
  peers: Peer[];
  voiceParticipants?: VoiceParticipant[];
  incomingCall?: {
    type: 'voice' | 'video' | 'screen';
    channelId: string;
    from: string;
    username: string;
  } | null;
  localVideoRef: React.RefObject<HTMLVideoElement>;
  screenShareRef: React.RefObject<HTMLVideoElement>;
  onEndCall: () => void;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onToggleDeafen?: () => void;
  onAnswerCall: () => void;
  onDeclineCall: () => void;
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
  isDeafened?: boolean;
  isSpeaking?: boolean;
  cameraError?: string | null;
  getCameraDevices?: () => Promise<MediaDeviceInfo[]>;
  getUserMedia?: (video?: boolean) => Promise<MediaStream>;
  forceReleaseAllDevices?: () => Promise<void>;
  localStreamRef?: React.RefObject<MediaStream | null>;
}

type SnapPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top' | 'bottom' | 'left' | 'right' | 'center' | null;

const VoiceCallInterface: React.FC<VoiceCallInterfaceProps> = ({
  isCallActive,
  isAudioEnabled,
  isVideoEnabled,
  isScreenSharing,
  currentCallType,
  currentChannelId,
  currentChannelName,
  currentChannelEmoji,
  currentUserAvatar,
  currentUserName,
  peers,
  voiceParticipants = [],
  incomingCall,
  localVideoRef,
  screenShareRef,
  onEndCall,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onToggleDeafen,
  onAnswerCall,
  onDeclineCall,
  isMinimized = false,
  onToggleMinimize,
  isDeafened = false,
  isSpeaking = false,
  cameraError,
  getCameraDevices,
  getUserMedia,
  forceReleaseAllDevices,
  localStreamRef,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isSnapped, setIsSnapped] = useState(false);
  const [snapPosition, setSnapPosition] = useState<SnapPosition>(null);
  const [showSnapZones, setShowSnapZones] = useState(false);
  const [isPositionInitialized, setIsPositionInitialized] = useState(false);
  const [previewSnapPosition, setPreviewSnapPosition] = useState<SnapPosition>(null);
  const callRef = useRef<HTMLDivElement>(null);

  // Enhanced snap configuration
  const SNAP_THRESHOLD = 100; // pixels from edge to trigger snap
  const MAGNETIC_THRESHOLD = 150; // pixels from edge to show magnetic effect
  const CORNER_SNAP_THRESHOLD = 120; // pixels from corner to snap to corner
  const EDGE_PADDING = 16; // padding from screen edges

  // Calculate snap zones and positions
  const getSnapZones = () => {
    if (typeof window === 'undefined') return {};
    
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const callWidth = isMinimized ? 288 : 320;
    const callHeight = isMinimized ? 64 : (currentCallType === 'voice' && peers.length === 0) ? 400 : 500;

    return {
      'top-left': { x: EDGE_PADDING, y: EDGE_PADDING },
      'top-right': { x: windowWidth - callWidth - EDGE_PADDING, y: EDGE_PADDING },
      'bottom-left': { x: EDGE_PADDING, y: windowHeight - callHeight - EDGE_PADDING },
      'bottom-right': { x: windowWidth - callWidth - EDGE_PADDING, y: windowHeight - callHeight - EDGE_PADDING },
      'top': { x: (windowWidth - callWidth) / 2, y: EDGE_PADDING },
      'bottom': { x: (windowWidth - callWidth) / 2, y: windowHeight - callHeight - EDGE_PADDING },
      'left': { x: EDGE_PADDING, y: (windowHeight - callHeight) / 2 },
      'right': { x: windowWidth - callWidth - EDGE_PADDING, y: (windowHeight - callHeight) / 2 },
      'center': { x: (windowWidth - callWidth) / 2, y: (windowHeight - callHeight) / 2 },
    };
  };

  // Determine which snap position we're closest to
  const getClosestSnapPosition = (currentX: number, currentY: number): SnapPosition => {
    if (typeof window === 'undefined') return null;
    
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const snapZones = getSnapZones();
    
    let closestPosition: SnapPosition = null;
    let closestDistance = Infinity;
    
    Object.entries(snapZones).forEach(([position, coords]) => {
      const distance = Math.sqrt(
        Math.pow(currentX - coords.x, 2) + Math.pow(currentY - coords.y, 2)
      );
      
      // Check if within snap threshold
      const threshold = position.includes('-') ? CORNER_SNAP_THRESHOLD : SNAP_THRESHOLD;
      
      if (distance < threshold && distance < closestDistance) {
        closestDistance = distance;
        closestPosition = position as SnapPosition;
      }
    });
    
    return closestPosition;
  };

  // Enhanced mouse down handler
  const handleMouseDown = (e: React.MouseEvent) => {
    // Don't start dragging if clicking on control buttons
    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('[data-no-drag]') ||
      target.tagName === 'BUTTON'
    ) {
      return;
    }
    
    if (!callRef.current) return;
    
    const rect = callRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setIsDragging(true);
    setShowSnapZones(true);
    setIsPositionInitialized(true);
    setSnapPosition(null);
    
    // Prevent text selection while dragging
    e.preventDefault();
    document.body.style.cursor = 'grabbing';
  };

  // Enhanced mouse move handler with preview snapping
  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !callRef.current) return;
    
    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;
    
    // Keep within viewport bounds
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const rect = callRef.current.getBoundingClientRect();
    const callWidth = rect.width;
    const callHeight = rect.height;
    
    const maxX = windowWidth - callWidth;
    const maxY = windowHeight - callHeight;
    
    let finalX = Math.max(0, Math.min(newX, maxX));
    let finalY = Math.max(0, Math.min(newY, maxY));
    
    // Check for preview snap position
    const previewSnap = getClosestSnapPosition(finalX, finalY);
    setPreviewSnapPosition(previewSnap);
    
    // Apply magnetic effect when approaching snap zones
    if (previewSnap) {
      const snapZones = getSnapZones();
      const targetPos = snapZones[previewSnap];
      
      if (targetPos) {
        const distance = Math.sqrt(
          Math.pow(finalX - targetPos.x, 2) + Math.pow(finalY - targetPos.y, 2)
        );
        
        const threshold = previewSnap.includes('-') ? CORNER_SNAP_THRESHOLD : SNAP_THRESHOLD;
        const magneticStrength = Math.max(0, 1 - (distance / threshold));
        
        if (magneticStrength > 0) {
          // Smooth magnetic pull
          const pullStrength = magneticStrength * 0.3;
          finalX = finalX + (targetPos.x - finalX) * pullStrength;
          finalY = finalY + (targetPos.y - finalY) * pullStrength;
        }
      }
    }
    
    setPosition({ x: finalX, y: finalY });
  };

  // Enhanced mouse up handler with precise snapping
  const handleMouseUp = () => {
    setIsDragging(false);
    setShowSnapZones(false);
    setPreviewSnapPosition(null);
    document.body.style.cursor = 'auto';
    
    if (!callRef.current) return;
    
    // Determine final snap position
    const finalSnapPosition = getClosestSnapPosition(position.x, position.y);
    
    if (finalSnapPosition) {
      const snapZones = getSnapZones();
      const targetPos = snapZones[finalSnapPosition];
      
      if (targetPos) {
        setPosition({ x: targetPos.x, y: targetPos.y });
        setSnapPosition(finalSnapPosition);
        setIsSnapped(true);
        setIsPositionInitialized(true);
        
        // Remove snap animation state after animation completes
        setTimeout(() => {
          setIsSnapped(false);
          setSnapPosition(null);
        }, 400);
      }
    }
  };

  // Add global mouse event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none';
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.userSelect = 'auto';
        document.body.style.cursor = 'auto';
      };
    }
  }, [isDragging, dragOffset, position]);

  // Reset position when call ends
  useEffect(() => {
    if (!isCallActive) {
      setPosition({ x: 0, y: 0 });
      setIsDragging(false);
      setIsSnapped(false);
      setSnapPosition(null);
      setShowSnapZones(false);
      setPreviewSnapPosition(null);
      setIsPositionInitialized(false);
      document.body.style.cursor = 'auto';
    }
  }, [isCallActive]);
  
  // Initialize position when call starts
  useEffect(() => {
    if (isCallActive && !isPositionInitialized) {
      if (isMinimized) {
        const snapZones = getSnapZones();
        const bottomRight = snapZones['bottom-right'];
        if (bottomRight) {
          setPosition(bottomRight);
          setSnapPosition('bottom-right');
        }
      }
      setIsPositionInitialized(true);
    }
  }, [isCallActive, isMinimized, isPositionInitialized]);

  // Incoming call modal
  if (incomingCall) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="mx-4 w-full max-w-md rounded-2xl border border-gray-700/50 bg-[#161B22] p-8 shadow-2xl">
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#57F287] to-[#3BA55C] text-black">
              {incomingCall.type === 'video' ? (
                <Video className="h-8 w-8" />
              ) : incomingCall.type === 'screen' ? (
                <Monitor className="h-8 w-8" />
              ) : (
                <Phone className="h-8 w-8" />
              )}
            </div>
            
            <h3 className="mb-2 text-xl font-bold text-white">
              Incoming {incomingCall.type === 'screen' ? 'screen share' : `${incomingCall.type} call`}
            </h3>
            
            <p className="mb-6 text-gray-400">
              {incomingCall.username} is calling you
            </p>
            
            <div className="flex justify-center space-x-4">
              <button
                onClick={onDeclineCall}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-[#ED4245] text-white shadow-[0_0_20px_rgba(237,66,69,0.4)] transition-all duration-200 hover:bg-[#C23237] hover:shadow-[0_0_30px_rgba(237,66,69,0.6)]"
              >
                <PhoneOff className="h-6 w-6" />
              </button>
              
              <button
                onClick={onAnswerCall}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-[#57F287] text-black shadow-[0_0_20px_rgba(87,242,135,0.4)] transition-all duration-200 hover:bg-[#3BA55C] hover:shadow-[0_0_30px_rgba(87,242,135,0.6)]"
              >
                <Phone className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active call interface
  if (isCallActive) {
    const isSingleUser = peers.length === 0;

    return (
      <>
        {/* Viewport glow effect when dragging */}
        {showSnapZones && (
          <div className="fixed inset-0 z-20 pointer-events-none">
            {/* Subtle glow from all edges */}
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-[#57F287]/20 via-[#57F287]/10 to-transparent animate-pulse" />
            <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-[#57F287]/20 via-[#57F287]/10 to-transparent animate-pulse" />
            <div className="absolute left-0 top-0 h-full w-32 bg-gradient-to-r from-[#57F287]/20 via-[#57F287]/10 to-transparent animate-pulse" />
            <div className="absolute right-0 top-0 h-full w-32 bg-gradient-to-l from-[#57F287]/20 via-[#57F287]/10 to-transparent animate-pulse" />
            {/* Subtle background tint */}
            <div className="absolute inset-0 bg-[#57F287]/3" />
          </div>
        )}

        {/* Enhanced snap zones overlay */}
        {showSnapZones && (
          <div className="fixed inset-0 z-30 pointer-events-none">
            {/* Corner zones */}
            <div className={`absolute top-4 left-4 w-20 h-20 rounded-2xl border-2 border-dashed transition-all duration-200 ${
              previewSnapPosition === 'top-left' 
                ? 'border-[#57F287] bg-[#57F287]/20 shadow-[0_0_30px_rgba(87,242,135,0.4)]' 
                : 'border-[#57F287]/40 bg-[#57F287]/10'
            }`} />
            
            <div className={`absolute top-4 right-4 w-20 h-20 rounded-2xl border-2 border-dashed transition-all duration-200 ${
              previewSnapPosition === 'top-right' 
                ? 'border-[#57F287] bg-[#57F287]/20 shadow-[0_0_30px_rgba(87,242,135,0.4)]' 
                : 'border-[#57F287]/40 bg-[#57F287]/10'
            }`} />
            
            <div className={`absolute bottom-4 left-4 w-20 h-20 rounded-2xl border-2 border-dashed transition-all duration-200 ${
              previewSnapPosition === 'bottom-left' 
                ? 'border-[#57F287] bg-[#57F287]/20 shadow-[0_0_30px_rgba(87,242,135,0.4)]' 
                : 'border-[#57F287]/40 bg-[#57F287]/10'
            }`} />
            
            <div className={`absolute bottom-4 right-4 w-20 h-20 rounded-2xl border-2 border-dashed transition-all duration-200 ${
              previewSnapPosition === 'bottom-right' 
                ? 'border-[#57F287] bg-[#57F287]/20 shadow-[0_0_30px_rgba(87,242,135,0.4)]' 
                : 'border-[#57F287]/40 bg-[#57F287]/10'
            }`} />

            {/* Edge zones */}
            <div className={`absolute top-4 left-1/2 transform -translate-x-1/2 w-16 h-8 rounded-xl border-2 border-dashed transition-all duration-200 ${
              previewSnapPosition === 'top' 
                ? 'border-[#57F287] bg-[#57F287]/20 shadow-[0_0_30px_rgba(87,242,135,0.4)]' 
                : 'border-[#57F287]/40 bg-[#57F287]/10'
            }`} />
            
            <div className={`absolute bottom-4 left-1/2 transform -translate-x-1/2 w-16 h-8 rounded-xl border-2 border-dashed transition-all duration-200 ${
              previewSnapPosition === 'bottom' 
                ? 'border-[#57F287] bg-[#57F287]/20 shadow-[0_0_30px_rgba(87,242,135,0.4)]' 
                : 'border-[#57F287]/40 bg-[#57F287]/10'
            }`} />
            
            <div className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-8 h-16 rounded-xl border-2 border-dashed transition-all duration-200 ${
              previewSnapPosition === 'left' 
                ? 'border-[#57F287] bg-[#57F287]/20 shadow-[0_0_30px_rgba(87,242,135,0.4)]' 
                : 'border-[#57F287]/40 bg-[#57F287]/10'
            }`} />
            
            <div className={`absolute right-4 top-1/2 transform -translate-y-1/2 w-8 h-16 rounded-xl border-2 border-dashed transition-all duration-200 ${
              previewSnapPosition === 'right' 
                ? 'border-[#57F287] bg-[#57F287]/20 shadow-[0_0_30px_rgba(87,242,135,0.4)]' 
                : 'border-[#57F287]/40 bg-[#57F287]/10'
            }`} />

            {/* Center zone (only for full mode) */}
            {!isMinimized && (
              <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-16 rounded-2xl border-2 border-dashed transition-all duration-200 ${
                previewSnapPosition === 'center' 
                  ? 'border-[#57F287] bg-[#57F287]/20 shadow-[0_0_30px_rgba(87,242,135,0.4)]' 
                  : 'border-[#57F287]/40 bg-[#57F287]/10'
              }`} />
            )}
          </div>
        )}
        
        <div 
          ref={callRef}
          className={`fixed z-40 transition-all ${
            isSnapped 
              ? 'duration-400 ease-out' 
              : isDragging 
              ? 'duration-100 ease-linear'
              : 'duration-200 ease-in-out'
          } ${
            isDragging 
              ? 'cursor-grabbing shadow-2xl scale-105 rotate-2' 
              : isSnapped 
              ? 'cursor-grab shadow-xl'
              : 'cursor-grab shadow-lg hover:shadow-xl'
          } ${
            isMinimized 
              ? 'h-16 w-72' 
              : isPositionInitialized  
              ? 'h-auto w-80' 
              : isSingleUser && currentCallType === 'voice'
              ? 'top-1/2 left-1/2 h-auto w-80 -translate-x-1/2 -translate-y-1/2'
              : 'inset-4 h-auto w-auto'
          }`}
          style={(isMinimized || isPositionInitialized) ? {
            left: position.x,
            top: position.y,
            right: 'auto',
            bottom: 'auto',
            transform: isDragging ? 'rotate(2deg) scale(1.05)' : isSnapped ? 'scale(1.02)' : 'rotate(0deg) scale(1)',
          } : {}}
          onMouseDown={handleMouseDown}
        >
          <div className={`h-full w-full rounded-2xl border transition-all duration-200 backdrop-blur-xl ${
            isDragging 
              ? 'border-[#57F287]/60 bg-[#0D1117]/98 shadow-[0_0_40px_rgba(87,242,135,0.4)]'
              : previewSnapPosition
              ? 'border-[#57F287]/50 bg-[#0D1117]/96 shadow-[0_0_30px_rgba(87,242,135,0.3)]'
              : isSnapped
              ? 'border-[#57F287]/40 bg-[#0D1117]/95 shadow-[0_0_25px_rgba(87,242,135,0.25)]'
              : 'border-gray-700/50 bg-[#0D1117]/95 shadow-2xl'
          } ${
            isMinimized ? 'p-3' : 'p-6'
          }`}>
          
          {/* Enhanced Video Debugging Info */}
          {!isMinimized && currentCallType === 'video' && (
            <div className="mb-2 space-y-2">
              <div className="text-xs text-gray-400 font-mono bg-black/20 rounded p-2">
                🎥 Video Debug: enabled={isVideoEnabled ? '✅' : '❌'} | localStream={localVideoRef.current?.srcObject ? '✅' : '❌'} | playing={localVideoRef.current?.currentTime > 0 ? '✅' : '❌'}
              </div>
              {cameraError && (
                <div className="text-xs text-red-400 bg-red-900/20 rounded p-2 flex items-center justify-between">
                  <span>❌ {cameraError}</span>
                  <button
                    onClick={async () => {
                      try {
                        await getUserMedia(true);
                      } catch (error) {
                        console.error('Manual camera retry failed:', error);
                      }
                    }}
                    className="ml-2 px-2 py-1 bg-red-600 hover:bg-red-500 text-white text-xs rounded transition-colors"
                  >
                    Retry
                  </button>
                </div>
              )}
              <div className="flex space-x-2">
                <button
                  onClick={async () => {
                    console.log('🔍 Running camera diagnostics...');
                    console.log('Available cameras:', await getCameraDevices());
                    console.log('Local stream:', localVideoRef.current?.srcObject);
                    console.log('Video element state:', {
                      currentTime: localVideoRef.current?.currentTime,
                      readyState: localVideoRef.current?.readyState,
                      videoWidth: localVideoRef.current?.videoWidth,
                      videoHeight: localVideoRef.current?.videoHeight,
                      paused: localVideoRef.current?.paused
                    });
                    if (localStreamRef.current) {
                      const tracks = localStreamRef.current.getTracks();
                      console.log('Stream tracks:', tracks.map(t => ({
                        kind: t.kind,
                        label: t.label,
                        enabled: t.enabled,
                        readyState: t.readyState,
                        muted: t.muted
                      })));
                    }
                  }}
                  className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded transition-colors"
                >
                  🔍 Diagnose
                </button>
                <button
                  onClick={async () => {
                    console.log('🧹 Force releasing camera...');
                    await forceReleaseAllDevices();
                    console.log('✅ Camera released');
                  }}
                  className="px-2 py-1 bg-orange-600 hover:bg-orange-500 text-white text-xs rounded transition-colors"
                >
                  🧹 Release
                </button>
                <button
                  onClick={async () => {
                    console.log('🔄 Restarting camera...');
                    await forceReleaseAllDevices();
                    try {
                      await getUserMedia(currentCallType === 'video');
                      console.log('✅ Camera restarted successfully');
                    } catch (error) {
                      console.error('❌ Camera restart failed:', error);
                    }
                  }}
                  className="px-2 py-1 bg-green-600 hover:bg-green-500 text-white text-xs rounded transition-colors"
                >
                  🔄 Restart
                </button>
              </div>
            </div>
          )}
          
          {/* Minimized Mode */}
          {isMinimized ? (
            <div className="flex items-center justify-between h-full">
              {/* Avatar and info */}
              {/* Screen Share Mini Preview */}
              {isScreenSharing && (
                <div className="flex h-10 w-16 items-center justify-center rounded border border-gray-600 bg-gray-800 overflow-hidden mr-3">
                  <video
                    ref={screenShareRef}
                    autoPlay
                    playsInline
                    muted
                    className="h-full w-full object-contain"
                  />
                  <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400">
                    <Monitor className="h-3 w-3" />
                  </div>
                </div>
              )}
              
              <div className="flex items-center space-x-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#57F287] to-[#3BA55C] text-black text-sm font-bold relative overflow-hidden transition-all duration-300 ${
                  isSpeaking ? 'ring-2 ring-[#57F287] shadow-[0_0_20px_rgba(87,242,135,0.6)] animate-pulse' : ''
                }`}>
                  {currentUserAvatar ? (
                    <img 
                      src={currentUserAvatar} 
                      alt={currentUserName || 'You'} 
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    (currentUserName?.[0] || 'Y').toUpperCase()
                  )}
                  {!isAudioEnabled && (
                    <div className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-[#ED4245] text-white border border-gray-800">
                      <MicOff className="h-2 w-2" />
                    </div>
                  )}
                  {isDeafened && (
                    <div className="absolute top-0 left-0 flex h-4 w-4 items-center justify-center rounded-full bg-[#ED4245] text-white border border-gray-800">
                      <VolumeX className="h-2 w-2" />
                    </div>
                  )}
                  {isScreenSharing && (
                    <div className="absolute bottom-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-purple-500 text-white border border-gray-800">
                      <Monitor className="h-2 w-2" />
                    </div>
                  )}
                  {currentCallType === 'video' && isVideoEnabled && !isScreenSharing && (
                    <div className="absolute bottom-0 left-0 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-white border border-gray-800">
                      <Video className="h-2 w-2" />
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-xs font-medium text-white flex items-center space-x-1">
                    {currentChannelEmoji && <span>{currentChannelEmoji}</span>}
                    <span>{currentChannelName || (currentCallType === 'video' ? 'Video Call' : currentCallType === 'screen' ? 'Screen Share' : 'Voice Call')}</span>
                  </div>
                  <div className="text-xs text-gray-400 flex items-center space-x-1">
                    <span>{voiceParticipants.length + 1} participant{voiceParticipants.length !== 0 ? 's' : ''}</span>
                    {isScreenSharing && <span className="text-purple-400">🖥️</span>}
                    {currentCallType === 'video' && !isScreenSharing && <span className="text-blue-400">📹</span>}
                    {voiceParticipants.some(p => p.status.isScreenSharing) && (
                      <span className="text-purple-400" title="Someone is sharing screen">👁️</span>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Controls */}
              <div className="flex items-center space-x-2" data-no-drag>
                <button
                  onClick={onToggleAudio}
                  className={`flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 ${
                    isAudioEnabled
                      ? 'bg-gray-700 text-white hover:bg-gray-600'
                      : 'bg-[#ED4245] text-white shadow-[0_0_10px_rgba(237,66,69,0.4)] hover:bg-[#C23237]'
                  }`}
                  title={isAudioEnabled ? 'Mute' : 'Unmute'}
                  data-no-drag
                >
                  {isAudioEnabled ? (
                    <Mic className="h-3 w-3" />
                  ) : (
                    <MicOff className="h-3 w-3" />
                  )}
                </button>

                {onToggleDeafen && (
                  <button
                    onClick={onToggleDeafen}
                    className={`flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 ${
                      isDeafened
                        ? 'bg-[#ED4245] text-white shadow-[0_0_10px_rgba(237,66,69,0.4)] hover:bg-[#C23237]'
                        : 'bg-gray-700 text-white hover:bg-gray-600'
                    }`}
                    title={isDeafened ? 'Undeafen' : 'Deafen'}
                    data-no-drag
                  >
                    {isDeafened ? (
                      <VolumeX className="h-3 w-3" />
                    ) : (
                      <Headphones className="h-3 w-3" />
                    )}
                  </button>
                )}

                {/* Video toggle - available for all call types */}
                <button
                  onClick={onToggleVideo}
                  className={`flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 ${
                    isVideoEnabled
                      ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.4)]'
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white'
                  }`}
                  title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
                  data-no-drag
                >
                  {isVideoEnabled ? (
                    <Video className="h-3 w-3" />
                  ) : (
                    <VideoOff className="h-3 w-3" />
                  )}
                </button>

                {(currentCallType === 'video' || currentCallType === 'voice') && (
                  <button
                    onClick={onToggleScreenShare}
                    className={`flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 ${
                      isScreenSharing
                        ? 'bg-[#57F287] text-black shadow-[0_0_10px_rgba(87,242,135,0.4)] hover:bg-[#3BA55C]'
                        : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white'
                    }`}
                    title={isScreenSharing ? 'Stop screen share' : 'Share screen'}
                    data-no-drag
                  >
                    {isScreenSharing ? (
                      <MonitorOff className="h-3 w-3" />
                    ) : (
                      <Monitor className="h-3 w-3" />
                    )}
                  </button>
                )}

                <button
                  onClick={onEndCall}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ED4245] text-white shadow-[0_0_10px_rgba(237,66,69,0.4)] transition-all duration-200 hover:bg-[#C23237]"
                  title="End call"
                  data-no-drag
                >
                  <PhoneOff className="h-3 w-3" />
                </button>
                
                <button
                  onClick={onToggleMinimize}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-700/30 hover:text-white"
                  data-no-drag
                >
                  <Maximize2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ) : (
            /* Full Mode */
            <>
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#57F287]/20">
                    {currentCallType === 'video' ? (
                      <Video className="h-4 w-4 text-[#57F287]" />
                    ) : currentCallType === 'screen' ? (
                      <Monitor className="h-4 w-4 text-[#57F287]" />
                    ) : (
                      <Volume2 className="h-4 w-4 text-[#57F287]" />
                    )}
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                      {currentChannelEmoji && <span>{currentChannelEmoji}</span>}
                      <span>{currentChannelName || (currentCallType === 'video' ? 'Video Call' : currentCallType === 'screen' ? 'Screen Share' : 'Voice Call')}</span>
                    </h3>
                    <p className="text-sm text-gray-400 flex items-center space-x-2">
                      <span>{voiceParticipants.length + 1} participant{voiceParticipants.length !== 0 ? 's' : ''}</span>
                      {voiceParticipants.some(p => p.status.isScreenSharing) && (
                        <span className="text-purple-400" title="Someone is sharing screen">🖥️</span>
                      )}
                      {voiceParticipants.some(p => p.status.isVideoEnabled) && (
                        <span className="text-blue-400" title="Someone has video on">📹</span>
                      )}
                      {voiceParticipants.some(p => !p.status.isAudioEnabled) && (
                        <span className="text-red-400" title="Someone is muted">🔇</span>
                      )}
                    </p>
                    {(isDragging || showSnapZones) && (
                      <p className="text-xs text-[#57F287] mt-1 animate-pulse">
                        🎯 Drop in highlighted zones to snap
                      </p>
                    )}
                    {isPositionInitialized && !isDragging && !showSnapZones && (
                      <p className="text-xs text-[#57F287]/70 mt-1">
                        💡 Drag to reposition
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={onToggleMinimize}
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-700/30 hover:text-white"
                    title="Minimize call - then drag to move"
                  >
                    <Minimize2 className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className={`${isSingleUser ? 'text-center' : ''} mb-6`}>
                {/* Screen Share Display */}
                {currentCallType === 'screen' && (
                  <div className="mb-6">
                    <div className="relative overflow-hidden rounded-xl border border-gray-700/50 bg-gray-900 aspect-video">
                      <video
                        ref={screenShareRef}
                        autoPlay
                        playsInline
                        className="h-full w-full object-contain"
                      />
                      <div className="absolute top-4 left-4 rounded bg-black/70 px-3 py-2 text-sm text-white backdrop-blur-sm">
                        <div className="flex items-center space-x-2">
                          <Monitor className="h-4 w-4 text-[#57F287]" />
                          <span>{currentUserName || 'You'} is sharing screen</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Small video grid for participants */}
                    {peers.length > 0 && (
                      <div className="mt-4 grid grid-cols-4 gap-2">
                        {/* Local user small video */}
                        <div className="relative overflow-hidden rounded-lg border border-gray-700/50 bg-gray-900 aspect-video">
                          <div className="flex h-full w-full items-center justify-center">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#57F287] to-[#3BA55C] text-black text-xs font-bold overflow-hidden">
                              {currentUserAvatar ? (
                                <img 
                                  src={currentUserAvatar} 
                                  alt={currentUserName || 'You'} 
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                (currentUserName?.[0] || 'Y').toUpperCase()
                              )}
                            </div>
                          </div>
                          {!isAudioEnabled && (
                            <div className="absolute bottom-1 right-1 flex h-3 w-3 items-center justify-center rounded-full bg-[#ED4245] text-white">
                              <MicOff className="h-1.5 w-1.5" />
                            </div>
                          )}
                        </div>
                        
                        {/* Remote participants */}
                        {peers.slice(0, 3).map((peer) => (
                          <div key={peer.id} className="relative overflow-hidden rounded-lg border border-gray-700/50 bg-gray-900 aspect-video">
                            <div className="flex h-full w-full items-center justify-center">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#5865F2] to-[#4752C4] text-white text-xs font-bold">
                                {peer.username?.[0]?.toUpperCase() || 'U'}
                              </div>
                            </div>
                            {!peer.isAudioEnabled && (
                              <div className="absolute bottom-1 right-1 flex h-3 w-3 items-center justify-center rounded-full bg-[#ED4245] text-white">
                                <MicOff className="h-1.5 w-1.5" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Video Grid */}
                {currentCallType === 'video' && (
                  <div className={`grid gap-4 ${
                    isSingleUser
                      ? 'grid-cols-1 justify-items-center'
                      : peers.length === 1 
                      ? 'grid-cols-2' 
                      : 'grid-cols-2 md:grid-cols-3'
                  }`}>
                    {/* Enhanced Local video with debugging */}
                    <div className={`relative overflow-hidden rounded-xl border border-gray-700/50 bg-gray-900 ${
                      isSingleUser ? 'aspect-video w-80' : 'aspect-video'
                    }`}>
                      <video
                        ref={localVideoRef}
                        autoPlay
                        muted
                        playsInline
                        className={`h-full w-full object-cover transition-opacity duration-300 ${
                          !isVideoEnabled ? 'opacity-0' : 'opacity-100'
                        }`}
                        onLoadedMetadata={() => {
                          console.log('🎥 Video metadata loaded');
                          if (localVideoRef.current) {
                            console.log('📹 Video dimensions:', 
                              localVideoRef.current.videoWidth, 'x', 
                              localVideoRef.current.videoHeight
                            );
                          }
                        }}
                        onLoadStart={() => console.log('🎬 Video load started')}
                        onPlay={() => console.log('▶️ Video playing')}
                        onError={(e) => {
                          console.error('❌ Video error:', e);
                          const video = e.target as HTMLVideoElement;
                          console.log('Video error details:', {
                            error: video.error,
                            networkState: video.networkState,
                            readyState: video.readyState,
                            src: video.srcObject
                          });
                        }}
                      />
                      
                      {/* Always show avatar overlay, but with different opacity based on video state */}
                      <div className={`absolute inset-0 flex h-full w-full items-center justify-center transition-opacity duration-300 ${
                        isVideoEnabled ? 'opacity-0 pointer-events-none' : 'opacity-100'
                      }`}>
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#57F287] to-[#3BA55C] text-black text-xl font-bold overflow-hidden ring-4 ring-[#57F287]/30">
                          {currentUserAvatar ? (
                            <img 
                              src={currentUserAvatar} 
                              alt={currentUserName || 'You'} 
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                target.parentElement!.innerHTML = (currentUserName?.[0] || 'Y').toUpperCase();
                              }}
                            />
                          ) : (
                            (currentUserName?.[0] || 'Y').toUpperCase()
                          )}
                        </div>
                      </div>
                      
                      {/* Video status overlay */}
                      <div className="absolute top-2 left-2 flex space-x-1">
                        {!isVideoEnabled && (
                          <div className="flex items-center justify-center rounded-full bg-gray-800/80 p-2 text-white">
                            <VideoOff className="h-3 w-3" />
                          </div>
                        )}
                        {!isAudioEnabled && (
                          <div className="flex items-center justify-center rounded-full bg-red-500/80 p-2 text-white">
                            <MicOff className="h-3 w-3" />
                          </div>
                        )}
                      </div>
                      
                      <div className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-1 text-xs text-white backdrop-blur-sm">
                        {currentUserName || 'You'} {!isAudioEnabled && '(muted)'} {isVideoEnabled && '📹'}
                      </div>
                    </div>

                    {/* Remote videos */}
                    {peers.map((peer) => (
                      <RemoteVideo key={peer.id} peer={peer} />
                    ))}
                  </div>
                )}

                {/* Voice-only participants */}
                {currentCallType === 'voice' && (
                  <div className={`grid gap-4 ${
                    isSingleUser 
                      ? 'grid-cols-1 justify-items-center' 
                      : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
                  }`}>
                    {/* Local user */}
                    <div className="flex flex-col items-center space-y-2 rounded-xl border border-gray-700/50 bg-gray-900/30 p-4">
                      <div className={`relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#57F287] to-[#3BA55C] text-black font-bold text-xl overflow-hidden transition-all duration-300 ${
                        isSpeaking ? 'ring-4 ring-[#57F287] shadow-[0_0_30px_rgba(87,242,135,0.8)] animate-pulse scale-110' : ''
                      }`}>
                        {currentUserAvatar ? (
                          <img 
                            src={currentUserAvatar} 
                            alt={currentUserName || 'You'} 
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          (currentUserName?.[0] || 'Y').toUpperCase()
                        )}
                        {!isAudioEnabled && (
                          <div className="absolute top-0 right-0 flex h-6 w-6 items-center justify-center rounded-full bg-[#ED4245] text-white border-2 border-gray-900">
                            <MicOff className="h-3 w-3" />
                          </div>
                        )}
                        {isDeafened && (
                          <div className="absolute top-0 left-0 flex h-6 w-6 items-center justify-center rounded-full bg-[#ED4245] text-white border-2 border-gray-900">
                            <VolumeX className="h-3 w-3" />
                          </div>
                        )}
                      </div>
                      <span className="text-sm text-white font-medium">{currentUserName || 'You'}</span>
                    </div>

                    {/* Remote users from voice participants */}
                    {voiceParticipants.map((participant) => {
                      // Check if participant is speaking (you'll need to implement this logic)
                      const isParticipantSpeaking = false; // TODO: Implement real-time speaking detection
                      
                      return (
                        <div key={participant.userId} className="flex flex-col items-center space-y-2 rounded-xl border border-gray-700/50 bg-gray-900/30 p-4">
                          <div className={`relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#5865F2] to-[#4752C4] text-white font-bold text-xl overflow-hidden transition-all duration-300 ${
                            isParticipantSpeaking ? 'ring-4 ring-[#57F287] shadow-[0_0_30px_rgba(87,242,135,0.8)] animate-pulse scale-110' : ''
                          }`}>
                            {participant.avatar ? (
                              <img 
                                src={participant.avatar} 
                                alt={participant.username} 
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              participant.username?.[0]?.toUpperCase() || 'U'
                            )}
                            {!participant.status.isAudioEnabled && (
                              <div className="absolute top-0 right-0 flex h-6 w-6 items-center justify-center rounded-full bg-[#ED4245] text-white border-2 border-gray-900">
                                <MicOff className="h-3 w-3" />
                              </div>
                            )}
                            {participant.status.isScreenSharing && (
                              <div className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full bg-purple-500 text-white border-2 border-gray-900">
                                <Monitor className="h-3 w-3" />
                              </div>
                            )}
                            {participant.status.isVideoEnabled && !participant.status.isScreenSharing && (
                              <div className="absolute bottom-0 left-0 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-white border-2 border-gray-900">
                                <Video className="h-3 w-3" />
                              </div>
                            )}
                          </div>
                          <span className="text-sm text-white font-medium truncate w-full text-center">
                            {participant.username}
                          </span>
                          <div className="flex items-center space-x-1 text-xs">
                            {participant.status.isScreenSharing && <span className="text-purple-400">🖥️</span>}
                            {participant.status.isVideoEnabled && !participant.status.isScreenSharing && <span className="text-blue-400">📹</span>}
                            {!participant.status.isAudioEnabled && <span className="text-red-400">🔇</span>}
                            {participant.status.isAudioEnabled && !participant.status.isVideoEnabled && !participant.status.isScreenSharing && <span className="text-green-400">🎤</span>}
                          </div>
                        </div>
                      );
                    })}
                    
                    {/* Legacy WebRTC peers (fallback) */}
                    {peers.filter(peer => !voiceParticipants.some(vp => vp.userId === peer.id)).map((peer) => (
                      <div key={peer.id} className="flex flex-col items-center space-y-2 rounded-xl border border-gray-700/50 bg-gray-900/30 p-4">
                        <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#5865F2] to-[#4752C4] text-white font-bold text-xl">
                          {peer.username?.[0]?.toUpperCase() || 'U'}
                          {!peer.isAudioEnabled && (
                            <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#ED4245] text-white">
                              <MicOff className="h-3 w-3" />
                            </div>
                          )}
                        </div>
                        <span className="text-sm text-white font-medium truncate w-full text-center">
                          {peer.username || 'Unknown'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Controls - Always center-bottom */}
              <div className={`${isSingleUser ? 'flex justify-center' : 'flex justify-center'} space-x-4`} data-no-drag>
                <button
                  onClick={onToggleAudio}
                  className={`flex h-12 w-12 items-center justify-center rounded-full transition-all duration-200 ${
                    isAudioEnabled
                      ? 'bg-gray-700 text-white hover:bg-gray-600'
                      : 'bg-[#ED4245] text-white shadow-[0_0_20px_rgba(237,66,69,0.4)] hover:bg-[#C23237]'
                  }`}
                  title={isAudioEnabled ? 'Mute' : 'Unmute'}
                  data-no-drag
                >
                  {isAudioEnabled ? (
                    <Mic className="h-5 w-5" />
                  ) : (
                    <MicOff className="h-5 w-5" />
                  )}
                </button>

                {onToggleDeafen && (
                  <button
                    onClick={onToggleDeafen}
                    className={`flex h-12 w-12 items-center justify-center rounded-full transition-all duration-200 ${
                      isDeafened
                        ? 'bg-[#ED4245] text-white shadow-[0_0_20px_rgba(237,66,69,0.4)] hover:bg-[#C23237]'
                        : 'bg-gray-700 text-white hover:bg-gray-600'
                    }`}
                    title={isDeafened ? 'Undeafen' : 'Deafen'}
                    data-no-drag
                  >
                    {isDeafened ? (
                      <VolumeX className="h-5 w-5" />
                    ) : (
                      <Headphones className="h-5 w-5" />
                    )}
                  </button>
                )}

                <button
                  onClick={onToggleVideo}
                  className={`flex h-12 w-12 items-center justify-center rounded-full transition-all duration-200 ${
                    isVideoEnabled
                      ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.4)]'
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white'
                  }`}
                  title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
                  data-no-drag
                >
                  {isVideoEnabled ? (
                    <Video className="h-5 w-5" />
                  ) : (
                    <VideoOff className="h-5 w-5" />
                  )}
                </button>

                <button
                  onClick={onToggleScreenShare}
                  className={`flex h-12 w-12 items-center justify-center rounded-full transition-all duration-200 ${
                    isScreenSharing
                      ? 'bg-[#57F287] text-black shadow-[0_0_20px_rgba(87,242,135,0.4)] hover:bg-[#3BA55C]'
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white'
                  }`}
                  title={isScreenSharing ? 'Stop screen share' : 'Share screen'}
                  data-no-drag
                >
                  {isScreenSharing ? (
                    <MonitorOff className="h-5 w-5" />
                  ) : (
                    <Monitor className="h-5 w-5" />
                  )}
                </button>

                <button
                  onClick={onEndCall}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-[#ED4245] text-white shadow-[0_0_20px_rgba(237,66,69,0.4)] transition-all duration-200 hover:bg-[#C23237] hover:shadow-[0_0_30px_rgba(237,66,69,0.6)]"
                  title="End call"
                  data-no-drag
                >
                  <PhoneOff className="h-5 w-5" />
                </button>
              </div>
            </>
          )}
        </div>
        </div>
      </>
    );
  }

  return null;
};

// Remote video component
const RemoteVideo: React.FC<{ peer: Peer }> = ({ peer }) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);

  React.useEffect(() => {
    if (videoRef.current && peer.stream) {
      videoRef.current.srcObject = peer.stream;
    }
  }, [peer.stream]);

  return (
    <div className="relative aspect-video overflow-hidden rounded-xl border border-gray-700/50 bg-gray-900">
      {peer.stream && peer.isVideoEnabled ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#5865F2] to-[#4752C4] text-white text-xl font-bold">
            {peer.username?.[0]?.toUpperCase() || 'U'}
          </div>
        </div>
      )}
      <div className="absolute bottom-2 left-2 rounded bg-black/50 px-2 py-1 text-xs text-white backdrop-blur-sm">
        {peer.username || 'Unknown'} {!peer.isAudioEnabled && '(muted)'}
      </div>
    </div>
  );
};

export default VoiceCallInterface;