import { useCallback, useEffect, useRef, useState } from "react";
import { Socket } from "socket.io-client";

interface Peer {
  id: string;
  connection: RTCPeerConnection;
  stream?: MediaStream;
  username?: string;
}

interface UseSimpleWebRTCProps {
  socket: Socket | null;
  userId: string;
  username: string;
}

interface CallData {
  type: "voice" | "video" | "screen";
  channelId: string;
  from: string;
  to?: string;
  username: string;
}

// ICE servers configuration
const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

let connections: Record<string, RTCPeerConnection> = {};
let socketId: string | null = null;

export function useSimpleWebRTC({ socket, userId, username }: UseSimpleWebRTCProps) {
  // States
  const [isCallActive, setIsCallActive] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [currentCallType, setCurrentCallType] = useState<"voice" | "video" | "screen" | null>(null);
  const [currentChannelId, setCurrentChannelId] = useState<string | null>(null);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [incomingCall, setIncomingCall] = useState<CallData | null>(null);

  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const screenShareRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Clean up media tracks
  const stopMediaTracks = useCallback((stream: MediaStream | null) => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  }, []);

  // Get user media
  const getUserMedia = useCallback(async (video = false, audio = true): Promise<MediaStream> => {
    try {
      const constraints: MediaStreamConstraints = {
        audio: audio ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } : false,
        video: video ? {
          width: { ideal: 1280, min: 320 },
          height: { ideal: 720, min: 240 },
          frameRate: { ideal: 30, min: 10 },
        } : false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;

      if (localVideoRef.current && video) {
        localVideoRef.current.srcObject = stream;
      }

      return stream;
    } catch (error) {
      console.error("Failed to get user media:", error);
      throw error;
    }
  }, []);

  // Get screen share
  const getScreenShare = useCallback(async (): Promise<MediaStream> => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      if (screenShareRef.current) {
        screenShareRef.current.srcObject = stream;
      }

      return stream;
    } catch (error) {
      console.error("Failed to get screen share:", error);
      throw error;
    }
  }, []);

  // Create peer connection
  const createPeerConnection = useCallback((peerId: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit("signal", peerId, JSON.stringify({ ice: event.candidate }));
      }
    };

    pc.ontrack = (event) => {
      const remoteStream = event.streams[0];
      setPeers(prev => prev.map(peer => 
        peer.id === peerId 
          ? { ...peer, stream: remoteStream }
          : peer
      ));

      // Create audio element for remote stream
      const audio = document.createElement("audio");
      audio.id = `audio-${peerId}`;
      audio.autoplay = true;
      audio.srcObject = remoteStream;
      document.body.appendChild(audio);
    };

    pc.onconnectionstatechange = () => {
      console.log(`Connection state with ${peerId}: ${pc.connectionState}`);
    };

    return pc;
  }, [socket]);

  // Add peer
  const addPeer = useCallback((peerId: string, username?: string) => {
    if (connections[peerId]) return;

    const connection = createPeerConnection(peerId);
    connections[peerId] = connection;

    setPeers(prev => [...prev, {
      id: peerId,
      connection,
      username,
    }]);

    // Add local stream to connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        connection.addTrack(track, localStreamRef.current!);
      });
    }
  }, [createPeerConnection]);

  // Remove peer
  const removePeer = useCallback((peerId: string) => {
    if (connections[peerId]) {
      connections[peerId].close();
      delete connections[peerId];
    }

    // Remove audio element
    const audioElement = document.getElementById(`audio-${peerId}`);
    if (audioElement) {
      audioElement.remove();
    }

    setPeers(prev => prev.filter(peer => peer.id !== peerId));
  }, []);

  // Start call
  const startCall = useCallback(async (
    type: "voice" | "video" | "screen",
    channelId?: string
  ) => {
    try {
      let stream: MediaStream;

      if (type === "screen") {
        stream = await getScreenShare();
        setIsScreenSharing(true);
      } else {
        stream = await getUserMedia(type === "video", true);
        setIsVideoEnabled(type === "video");
      }

      setIsAudioEnabled(true);
      setCurrentCallType(type);
      setCurrentChannelId(channelId || null);
      setIsCallActive(true);

      // Emit join call event
      socket?.emit("webrtc:join-call", {
        type,
        channelId,
        username,
      });

      // Join voice channel
      if (channelId) {
        socket?.emit("voice:join", {
          channelId,
          userId,
          username,
          callType: type,
        });
      }
    } catch (error) {
      console.error("Failed to start call:", error);
      setIsCallActive(false);
      setIsAudioEnabled(false);
      setIsVideoEnabled(false);
      setIsScreenSharing(false);
      setCurrentCallType(null);
    }
  }, [getUserMedia, getScreenShare, socket, username, userId]);

  // End call
  const endCall = useCallback(() => {
    // Stop all media tracks
    stopMediaTracks(localStreamRef.current);
    localStreamRef.current = null;

    // Clear video elements
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (screenShareRef.current) {
      screenShareRef.current.srcObject = null;
    }

    // Close all peer connections
    Object.values(connections).forEach(pc => pc.close());
    connections = {};

    // Remove all audio elements
    peers.forEach(peer => {
      const audioElement = document.getElementById(`audio-${peer.id}`);
      if (audioElement) {
        audioElement.remove();
      }
    });

    // Reset states
    setIsCallActive(false);
    setIsAudioEnabled(false);
    setIsVideoEnabled(false);
    setIsScreenSharing(false);
    setCurrentCallType(null);
    setCurrentChannelId(null);
    setPeers([]);

    // Emit leave events
    socket?.emit("webrtc:leave-call");
    if (currentChannelId) {
      socket?.emit("voice:leave", { channelId: currentChannelId, userId });
    }
  }, [stopMediaTracks, peers, socket, currentChannelId, userId]);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  }, []);

  // Toggle video
  const toggleVideo = useCallback(async () => {
    if (currentCallType === "voice" && !isVideoEnabled) {
      // Switch from voice to video
      try {
        stopMediaTracks(localStreamRef.current);
        const stream = await getUserMedia(true, true);
        setIsVideoEnabled(true);
        setCurrentCallType("video");

        // Update all peer connections with new stream
        Object.values(connections).forEach(pc => {
          stream.getTracks().forEach(track => {
            pc.addTrack(track, stream);
          });
        });
      } catch (error) {
        console.error("Failed to enable video:", error);
      }
    } else if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  }, [currentCallType, isVideoEnabled, getUserMedia, stopMediaTracks]);

  // Start screen share
  const startScreenShare = useCallback(async () => {
    if (isScreenSharing) return;

    try {
      const screenStream = await getScreenShare();
      setIsScreenSharing(true);

      // Replace video track in all peer connections
      Object.values(connections).forEach(pc => {
        const sender = pc.getSenders().find(s => s.track?.kind === "video");
        if (sender) {
          sender.replaceTrack(screenStream.getVideoTracks()[0]);
        }
      });

      // Handle screen share end
      screenStream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };
    } catch (error) {
      console.error("Failed to start screen share:", error);
    }
  }, [isScreenSharing, getScreenShare]);

  // Stop screen share
  const stopScreenShare = useCallback(async () => {
    if (!isScreenSharing) return;

    setIsScreenSharing(false);

    if (screenShareRef.current) {
      screenShareRef.current.srcObject = null;
    }

    // If we were in a video call, restart camera
    if (currentCallType === "video" || currentCallType === "screen") {
      try {
        const stream = await getUserMedia(currentCallType === "video", true);
        
        // Replace screen share track with camera track
        Object.values(connections).forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === "video");
          if (sender && stream.getVideoTracks()[0]) {
            sender.replaceTrack(stream.getVideoTracks()[0]);
          }
        });
      } catch (error) {
        console.error("Failed to restart camera after screen share:", error);
      }
    }
  }, [isScreenSharing, currentCallType, getUserMedia]);

  // Answer call
  const answerCall = useCallback(async () => {
    if (!incomingCall) return;
    await startCall(incomingCall.type, incomingCall.channelId);
    setIncomingCall(null);
  }, [incomingCall, startCall]);

  // Decline call
  const declineCall = useCallback(() => {
    if (incomingCall) {
      socket?.emit("webrtc:call-declined", { to: incomingCall.from });
    }
    setIncomingCall(null);
  }, [incomingCall, socket]);

  // Handle WebRTC signaling
  const handleSignal = useCallback((fromId: string, message: string) => {
    const signal = JSON.parse(message);

    if (fromId === socketId) return;

    if (signal.sdp) {
      const pc = connections[fromId];
      if (!pc) return;

      pc.setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(() => {
        if (signal.sdp.type === "offer") {
          pc.createAnswer().then(description => {
            pc.setLocalDescription(description).then(() => {
              socket?.emit("signal", fromId, JSON.stringify({ sdp: pc.localDescription }));
            });
          });
        }
      });
    }

    if (signal.ice) {
      const pc = connections[fromId];
      if (pc) {
        pc.addIceCandidate(new RTCIceCandidate(signal.ice));
      }
    }
  }, [socket]);

  // Socket event handlers
  useEffect(() => {
    if (!socket) return;

    // Store socket ID
    socket.on("connect", () => {
      socketId = socket.id;
    });

    // WebRTC signaling
    socket.on("signal", handleSignal);

    // Incoming call
    socket.on("webrtc:incoming-call", setIncomingCall);

    // User joined
    socket.on("webrtc:user-joined", ({ userId: uid, username: uname }) => {
      addPeer(uid, uname);
    });

    // User left
    socket.on("webrtc:user-left", ({ userId: uid }) => {
      removePeer(uid);
    });

    // Handle offers
    socket.on("webrtc:offer", async ({ offer, from }) => {
      if (from === userId) return;
      
      addPeer(from);
      const pc = connections[from];
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("webrtc:answer", { answer, to: from });
      }
    });

    // Handle answers
    socket.on("webrtc:answer", async ({ answer, from }) => {
      const pc = connections[from];
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    // Handle ICE candidates
    socket.on("webrtc:ice-candidate", async ({ candidate, from }) => {
      const pc = connections[from];
      if (pc) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    // Call declined
    socket.on("webrtc:call-declined", () => {
      setIncomingCall(null);
    });

    return () => {
      socket.off("connect");
      socket.off("signal", handleSignal);
      socket.off("webrtc:incoming-call");
      socket.off("webrtc:user-joined");
      socket.off("webrtc:user-left");
      socket.off("webrtc:offer");
      socket.off("webrtc:answer");
      socket.off("webrtc:ice-candidate");
      socket.off("webrtc:call-declined");
    };
  }, [socket, userId, addPeer, removePeer, handleSignal]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isCallActive) {
        endCall();
      }
    };
  }, []);

  return {
    // States
    isCallActive,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    currentCallType,
    currentChannelId,
    peers,
    incomingCall,

    // Refs
    localVideoRef,
    screenShareRef,

    // Actions
    startCall,
    endCall,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    answerCall,
    declineCall,
  };
}