import { useCallback, useEffect, useRef, useState } from "react";
import { Socket } from "socket.io-client";

interface Peer {
  id: string;
  username: string;
  connection: RTCPeerConnection;
  stream?: MediaStream;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  isSpeaking: boolean;
  volume: number;
  audioAnalyzer?: AnalyserNode;
}

interface UseEnhancedWebRTCProps {
  socket: Socket | null;
  userId: string;
  username: string;
}

// Optimized ICE servers for group calls
const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  // Add TURN servers for better connectivity in production
];

// Enhanced WebRTC configuration for group calls
const PEER_CONFIG: RTCConfiguration = {
  iceServers: ICE_SERVERS,
  iceCandidatePoolSize: 10,
  rtcpMuxPolicy: "require",
  bundlePolicy: "max-bundle",
  iceTransportPolicy: "all",
};

// Audio analysis settings for speaking detection
const AUDIO_ANALYSIS_CONFIG = {
  fftSize: 256,
  smoothingTimeConstant: 0.8,
  speakingThreshold: -50, // dB
  silenceTimeout: 1000, // ms
};

export function useEnhancedWebRTC({ socket, userId, username }: UseEnhancedWebRTCProps) {
  // Enhanced states
  const [isCallActive, setIsCallActive] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentChannelId, setCurrentChannelId] = useState<string | null>(null);
  const [peers, setPeers] = useState<Map<string, Peer>>(new Map());
  const [connectionStates, setConnectionStates] = useState<Map<string, RTCPeerConnectionState>>(new Map());
  
  // Audio context and analysis
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [localAnalyzer, setLocalAnalyzer] = useState<AnalyserNode | null>(null);
  
  // Refs
  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const screenShareRef = useRef<HTMLVideoElement>(null);
  const speakingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioLevelIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize audio context for analysis
  const initAudioContext = useCallback(async () => {
    if (!audioContext) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      setAudioContext(ctx);
      return ctx;
    }
    return audioContext;
  }, [audioContext]);

  // Enhanced speaking detection
  const setupSpeakingDetection = useCallback((stream: MediaStream, isLocal = false) => {
    initAudioContext().then((ctx) => {
      const audioTrack = stream.getAudioTracks()[0];
      if (!audioTrack) return;

      const source = ctx.createMediaStreamSource(stream);
      const analyzer = ctx.createAnalyser();
      
      analyzer.fftSize = AUDIO_ANALYSIS_CONFIG.fftSize;
      analyzer.smoothingTimeConstant = AUDIO_ANALYSIS_CONFIG.smoothingTimeConstant;
      
      source.connect(analyzer);
      
      if (isLocal) {
        setLocalAnalyzer(analyzer);
        
        // Start monitoring local audio levels
        const checkAudioLevel = () => {
          const dataArray = new Uint8Array(analyzer.frequencyBinCount);
          analyzer.getByteFrequencyData(dataArray);
          
          // Calculate RMS (Root Mean Square) for volume
          const rms = Math.sqrt(
            dataArray.reduce((sum, value) => sum + value * value, 0) / dataArray.length
          );
          
          // Convert to dB
          const dB = 20 * Math.log10(rms / 255);
          
          const speaking = dB > AUDIO_ANALYSIS_CONFIG.speakingThreshold && isAudioEnabled && !isDeafened;
          
          if (speaking !== isSpeaking) {
            setIsSpeaking(speaking);
            
            // Emit speaking status to other participants
            if (currentChannelId && socket) {
              socket.emit('voice:speaking_update', {
                channelId: currentChannelId,
                userId,
                isSpeaking: speaking,
                volume: Math.max(0, (dB + 60) / 60), // Normalize to 0-1
              });
            }
          }
          
          // Clear timeout and set new one for silence detection
          if (speakingTimeoutRef.current) {
            clearTimeout(speakingTimeoutRef.current);
          }
          
          if (speaking) {
            speakingTimeoutRef.current = setTimeout(() => {
              setIsSpeaking(false);
              if (currentChannelId && socket) {
                socket.emit('voice:speaking_update', {
                  channelId: currentChannelId,
                  userId,
                  isSpeaking: false,
                  volume: 0,
                });
              }
            }, AUDIO_ANALYSIS_CONFIG.silenceTimeout);
          }
        };
        
        audioLevelIntervalRef.current = setInterval(checkAudioLevel, 100);
      }
      
      return analyzer;
    });
  }, [audioContext, initAudioContext, isSpeaking, isAudioEnabled, isDeafened, currentChannelId, socket, userId]);

  // Enhanced getUserMedia with better error handling
  const getUserMedia = useCallback(async (video = false, audio = true): Promise<MediaStream> => {
    try {
      const constraints: MediaStreamConstraints = {
        audio: audio ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1,
        } : false,
        video: video ? {
          width: { ideal: 1280, max: 1920, min: 640 },
          height: { ideal: 720, max: 1080, min: 480 },
          frameRate: { ideal: 30, max: 60, min: 15 },
          facingMode: "user",
        } : false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Store reference
      localStreamRef.current = stream;
      
      // Setup video if requested
      if (video && localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      // Setup speaking detection for audio
      if (audio) {
        setupSpeakingDetection(stream, true);
      }
      
      return stream;
    } catch (error) {
      console.error("Failed to get user media:", error);
      throw new Error(`Media access denied: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [setupSpeakingDetection]);

  // Enhanced screen sharing
  const getScreenShare = useCallback(async (): Promise<MediaStream> => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: "always",
          displaySurface: "monitor",
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 48000,
        },
      });

      if (screenShareRef.current) {
        screenShareRef.current.srcObject = stream;
      }

      // Handle screen share end detection
      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };

      return stream;
    } catch (error) {
      console.error("Failed to get screen share:", error);
      throw error;
    }
  }, []);

  // Enhanced peer connection creation
  const createPeerConnection = useCallback((peerId: string, username: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection(PEER_CONFIG);

    // Enhanced ICE candidate handling
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit("webrtc:ice-candidate", {
          candidate: event.candidate,
          to: peerId,
        });
      }
    };

    // Enhanced track handling
    pc.ontrack = (event) => {
      const remoteStream = event.streams[0];
      
      setPeers(prev => {
        const updated = new Map(prev);
        const peer = updated.get(peerId);
        if (peer) {
          peer.stream = remoteStream;
          // Setup speaking detection for remote stream
          setupSpeakingDetection(remoteStream, false);
        }
        return updated;
      });
    };

    // Connection state monitoring
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      console.log(`Peer ${peerId} connection state: ${state}`);
      
      setConnectionStates(prev => new Map(prev.set(peerId, state)));
      
      if (state === 'failed' || state === 'disconnected') {
        console.log(`Attempting to restart ICE for peer ${peerId}`);
        pc.restartIce();
      }
    };

    // ICE connection state monitoring  
    pc.oniceconnectionstatechange = () => {
      console.log(`Peer ${peerId} ICE state: ${pc.iceConnectionState}`);
    };

    // Add local stream tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    return pc;
  }, [socket, setupSpeakingDetection]);

  // Enhanced join voice channel
  const joinVoiceChannel = useCallback(async (
    channelId: string,
    callType: "voice" | "video" | "screen" = "voice"
  ) => {
    try {
      // Get user media based on call type
      let stream: MediaStream;
      
      if (callType === "screen") {
        stream = await getScreenShare();
        setIsScreenSharing(true);
      } else {
        // Always start with audio only, user can enable video later
        stream = await getUserMedia(false, true); // video=false, audio=true
        setIsVideoEnabled(false); // Start with video disabled
        
        // Log the call type for debugging
        console.log(`Joining ${callType} call - video starts disabled, user can enable manually`);
      }

      setCurrentChannelId(channelId);
      setIsCallActive(true);

      // Join voice channel via socket
      if (socket) {
        socket.emit("voice:join", {
          channelId,
          userId,
          username,
          callType: callType === "video" ? "voice" : callType, // Start as voice even for video calls
        });
      }

    } catch (error) {
      console.error("Failed to join voice channel:", error);
      throw error;
    }
  }, [getUserMedia, getScreenShare, socket, userId, username]);

  // Enhanced leave voice channel
  const leaveVoiceChannel = useCallback(() => {
    // Stop all media tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    // Clear video elements
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (screenShareRef.current) screenShareRef.current.srcObject = null;

    // Close all peer connections
    peers.forEach((peer) => {
      peer.connection.close();
    });

    // Clear intervals and timeouts
    if (audioLevelIntervalRef.current) {
      clearInterval(audioLevelIntervalRef.current);
      audioLevelIntervalRef.current = null;
    }
    
    if (speakingTimeoutRef.current) {
      clearTimeout(speakingTimeoutRef.current);
      speakingTimeoutRef.current = null;
    }

    // Reset states
    setPeers(new Map());
    setConnectionStates(new Map());
    setIsCallActive(false);
    setIsAudioEnabled(true);
    setIsVideoEnabled(false);
    setIsScreenSharing(false);
    setIsDeafened(false);
    setIsSpeaking(false);

    // Leave via socket
    if (socket && currentChannelId) {
      socket.emit("voice:leave", {
        channelId: currentChannelId,
        userId,
      });
    }

    setCurrentChannelId(null);
  }, [peers, socket, currentChannelId, userId]);

  // Enhanced audio toggle
  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
        
        // Update voice status
        if (socket && currentChannelId) {
          socket.emit("voice:status_update", {
            channelId: currentChannelId,
            userId,
            isAudioEnabled: audioTrack.enabled,
          });
        }
      }
    }
  }, [socket, currentChannelId, userId]);

  // Enhanced video toggle
  const toggleVideo = useCallback(async () => {
    try {
      if (isVideoEnabled) {
        // Disable video - stop video tracks
        if (localStreamRef.current) {
          const videoTracks = localStreamRef.current.getVideoTracks();
          videoTracks.forEach(track => {
            track.stop();
            localStreamRef.current?.removeTrack(track);
          });
        }
        
        // Clear video element
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = null;
        }
        
        setIsVideoEnabled(false);
        
        // Update all peer connections to remove video track
        peers.forEach((peer) => {
          const videoSender = peer.connection.getSenders().find(s => s.track?.kind === "video");
          if (videoSender) {
            peer.connection.removeTrack(videoSender);
          }
        });
        
      } else {
        // Enable video - get new video stream
        try {
          const videoConstraints: MediaStreamConstraints = {
            video: {
              width: { ideal: 1280, max: 1920, min: 640 },
              height: { ideal: 720, max: 1080, min: 480 },
              frameRate: { ideal: 30, max: 60, min: 15 },
              facingMode: "user",
            },
            audio: false // Only get video, keep existing audio
          };
          
          const videoStream = await navigator.mediaDevices.getUserMedia(videoConstraints);
          const videoTrack = videoStream.getVideoTracks()[0];
          
          if (videoTrack && localStreamRef.current) {
            // Add video track to local stream
            localStreamRef.current.addTrack(videoTrack);
            
            // Update video element
            if (localVideoRef.current) {
              localVideoRef.current.srcObject = localStreamRef.current;
            }
            
            // Add video track to all peer connections
            peers.forEach((peer) => {
              peer.connection.addTrack(videoTrack, localStreamRef.current!);
            });
          }
          
          setIsVideoEnabled(true);
          
        } catch (videoError) {
          console.error('Failed to enable video:', videoError);
          throw new Error(`Failed to access camera: ${videoError instanceof Error ? videoError.message : 'Unknown error'}`);
        }
      }
      
      // Update voice status
      if (socket && currentChannelId) {
        socket.emit("voice:status_update", {
          channelId: currentChannelId,
          userId,
          isVideoEnabled: !isVideoEnabled,
        });
      }
      
    } catch (error) {
      console.error('Failed to toggle video:', error);
      throw error;
    }
  }, [isVideoEnabled, localStreamRef, localVideoRef, peers, socket, currentChannelId, userId]);

  // Enhanced deafen toggle
  const toggleDeafen = useCallback(() => {
    const newDeafenState = !isDeafened;
    setIsDeafened(newDeafenState);
    
    // Mute all remote audio when deafened
    peers.forEach((peer) => {
      if (peer.stream) {
        peer.stream.getAudioTracks().forEach(track => {
          track.enabled = !newDeafenState;
        });
      }
    });
    
    // Also mute local audio when deafened
    if (newDeafenState && isAudioEnabled) {
      toggleAudio();
    }
  }, [isDeafened, peers, isAudioEnabled, toggleAudio]);

  // Stop screen share
  const stopScreenShare = useCallback(() => {
    if (!isScreenSharing) return;

    setIsScreenSharing(false);
    
    if (screenShareRef.current) {
      screenShareRef.current.srcObject = null;
    }

    // Switch back to camera if in video call
    if (isVideoEnabled) {
      getUserMedia(true, true).then((newStream) => {
        // Replace tracks in all peer connections
        peers.forEach((peer) => {
          const videoSender = peer.connection.getSenders().find(s => s.track?.kind === "video");
          if (videoSender && newStream.getVideoTracks()[0]) {
            videoSender.replaceTrack(newStream.getVideoTracks()[0]);
          }
        });
      }).catch(console.error);
    }
  }, [isScreenSharing, isVideoEnabled, getUserMedia, peers]);

  // Socket event handlers
  useEffect(() => {
    if (!socket) return;

    // Handle WebRTC offers
    const handleOffer = async ({ offer, from }: { offer: RTCSessionDescriptionInit; from: string }) => {
      if (from === userId) return;
      
      const peer = peers.get(from);
      if (!peer) return;
      
      try {
        await peer.connection.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peer.connection.createAnswer();
        await peer.connection.setLocalDescription(answer);
        
        socket.emit("webrtc:answer", { answer, to: from });
      } catch (error) {
        console.error("Error handling offer:", error);
      }
    };

    // Handle WebRTC answers
    const handleAnswer = async ({ answer, from }: { answer: RTCSessionDescriptionInit; from: string }) => {
      const peer = peers.get(from);
      if (peer) {
        try {
          await peer.connection.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (error) {
          console.error("Error handling answer:", error);
        }
      }
    };

    // Handle ICE candidates
    const handleIceCandidate = async ({ candidate, from }: { candidate: RTCIceCandidateInit; from: string }) => {
      const peer = peers.get(from);
      if (peer) {
        try {
          await peer.connection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
          console.error("Error handling ICE candidate:", error);
        }
      }
    };

    // Handle voice participants updates
    const handleVoiceParticipants = ({ channelId, participants }: { 
      channelId: string; 
      participants: Array<{
        userId: string;
        username: string;
        avatar?: string;
        isAudioEnabled: boolean;
        isVideoEnabled: boolean;
        isScreenSharing: boolean;
      }> 
    }) => {
      if (channelId !== currentChannelId) return;
      
      const currentPeerIds = new Set(peers.keys());
      const newPeerIds = new Set(participants.map(p => p.userId).filter(id => id !== userId));
      
      // Remove peers that left
      currentPeerIds.forEach(peerId => {
        if (!newPeerIds.has(peerId)) {
          const peer = peers.get(peerId);
          if (peer) {
            peer.connection.close();
            setPeers(prev => {
              const updated = new Map(prev);
              updated.delete(peerId);
              return updated;
            });
          }
        }
      });
      
      // Add new peers
      newPeerIds.forEach(peerId => {
        if (!currentPeerIds.has(peerId)) {
          const participant = participants.find(p => p.userId === peerId);
          if (participant) {
            const connection = createPeerConnection(peerId, participant.username);
            
            setPeers(prev => new Map(prev.set(peerId, {
              id: peerId,
              username: participant.username,
              connection,
              isAudioEnabled: participant.isAudioEnabled,
              isVideoEnabled: participant.isVideoEnabled,
              isScreenSharing: participant.isScreenSharing,
              isSpeaking: false,
              volume: 0,
            })));
            
            // Create and send offer
            connection.createOffer().then(async (offer) => {
              await connection.setLocalDescription(offer);
              socket.emit("webrtc:offer", { offer, to: peerId });
            }).catch(console.error);
          }
        }
      });
    };

    // Handle speaking updates
    const handleSpeakingUpdate = ({ userId: speakingUserId, isSpeaking: speaking, volume }: {
      userId: string;
      isSpeaking: boolean;
      volume: number;
    }) => {
      setPeers(prev => {
        const peer = prev.get(speakingUserId);
        if (peer) {
          const updated = new Map(prev);
          updated.set(speakingUserId, {
            ...peer,
            isSpeaking: speaking,
            volume,
          });
          return updated;
        }
        return prev;
      });
    };

    // Register event handlers
    socket.on("webrtc:offer", handleOffer);
    socket.on("webrtc:answer", handleAnswer);
    socket.on("webrtc:ice-candidate", handleIceCandidate);
    socket.on("voice:participants_updated", handleVoiceParticipants);
    socket.on("voice:speaking_update", handleSpeakingUpdate);

    return () => {
      socket.off("webrtc:offer", handleOffer);
      socket.off("webrtc:answer", handleAnswer);
      socket.off("webrtc:ice-candidate", handleIceCandidate);
      socket.off("voice:participants_updated", handleVoiceParticipants);
      socket.off("voice:speaking_update", handleSpeakingUpdate);
    };
  }, [socket, userId, peers, currentChannelId, createPeerConnection]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isCallActive) {
        leaveVoiceChannel();
      }
      if (audioContext) {
        audioContext.close();
      }
    };
  }, []);

  return {
    // States
    isCallActive,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    isDeafened,
    isSpeaking,
    currentChannelId,
    peers: Array.from(peers.values()),
    connectionStates,
    localAnalyzer,

    // Refs
    localVideoRef,
    screenShareRef,

    // Actions
    joinVoiceChannel,
    leaveVoiceChannel,
    toggleAudio,
    toggleVideo,
    toggleDeafen,
    stopScreenShare,
    startScreenShare: async () => {
      try {
        const stream = await getScreenShare();
        setIsScreenSharing(true);
        
        // Replace video track in all peer connections
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          peers.forEach((peer) => {
            const videoSender = peer.connection.getSenders().find(s => s.track?.kind === "video");
            if (videoSender) {
              videoSender.replaceTrack(videoTrack);
            } else {
              peer.connection.addTrack(videoTrack, stream);
            }
          });
        }
        
        // Update socket
        if (socket && currentChannelId) {
          socket.emit("voice:status_update", {
            channelId: currentChannelId,
            userId,
            isScreenSharing: true,
          });
        }
        
      } catch (error) {
        console.error('Failed to start screen share:', error);
        throw error;
      }
    },
    
    // Utils
    getConnectionStats: () => ({
      peersCount: peers.size,
      connectedPeers: Array.from(connectionStates.entries())
        .filter(([_, state]) => state === 'connected').length,
      failedPeers: Array.from(connectionStates.entries())
        .filter(([_, state]) => state === 'failed').length,
    }),
  };
}
