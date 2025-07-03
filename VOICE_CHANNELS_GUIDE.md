# Enhanced Voice Channels - Implementation Guide

## 🎯 Overview

Această implementare oferă un sistem complet de voice channels similar cu Discord, cu următoarele funcționalități:

- **WebSocket Signaling** pentru real-time communication
- **WebRTC** pentru audio/video peer-to-peer
- **Speaking Detection** cu analiză audio în timp real
- **Connection Quality Monitoring** și diagnostics
- **Multi-participant Support** cu până la 20 utilizatori
- **Screen Sharing** și video calls
- **Enhanced UI Components** cu drag & drop

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Client App    │    │  Enhanced Socket │    │   WebRTC P2P    │
│                 │    │     Server       │    │   Connections   │
│ - React Hooks   │◄──►│                  │    │                 │
│ - Voice UI      │    │ - Signaling      │    │ - Audio Stream  │
│ - WebRTC Logic  │    │ - Speaking Det.  │    │ - Video Stream  │
│ - Audio Context │    │ - Stats Monitor  │    │ - Screen Share  │
└─────────────────┘    └──────────────────┘    └─────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    Data Flow Diagram                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ 1. User joins voice channel                                     │
│    └── WebSocket: voice:join                                   │
│                                                                 │
│ 2. Server creates/updates voice channel                        │
│    └── Broadcasts: voice:participants_updated                  │
│                                                                 │
│ 3. WebRTC peer connections established                         │
│    └── WebSocket: webrtc:offer/answer/ice-candidate           │
│                                                                 │
│ 4. Audio analysis and speaking detection                       │
│    └── WebSocket: voice:speaking_update (100ms intervals)     │
│                                                                 │
│ 5. Connection quality monitoring                               │
│    └── WebSocket: voice:connection_stats (5s intervals)       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### 1. Setup Enhanced Socket Context

```tsx
// app/layout.tsx sau _app.tsx
import { EnhancedSocketProvider } from '~/contexts/EnhancedSocketContext';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <EnhancedSocketProvider>
      {children}
    </EnhancedSocketProvider>
  );
}
```

### 2. Basic Voice Channel Implementation

```tsx
import { useVoiceChannel } from '~/hooks/useVoiceChannel';
import EnhancedVoiceChannel from '~/components/voice/EnhancedVoiceChannel';

function MyVoiceChannel() {
  const [voiceState, voiceControls] = useVoiceChannel({
    channelId: 'my-channel-id',
    enableSpeakingDetection: true,
    onParticipantJoin: (participant) => {
      console.log(`${participant.username} joined`);
    },
  });

  return (
    <EnhancedVoiceChannel
      channelId="my-channel-id"
      channelName="General Voice"
      channelEmoji="🔊"
      isInChannel={voiceState.isConnected}
      participants={voiceState.participants}
      currentUser={{
        id: 'user-id',
        username: 'User',
        isAudioEnabled: voiceState.isAudioEnabled,
        isVideoEnabled: voiceState.isVideoEnabled,
        isScreenSharing: voiceState.isScreenSharing,
        isDeafened: voiceState.isDeafened,
        isSpeaking: voiceState.isSpeaking,
        connectionQuality: voiceState.connectionQuality,
      }}
      onJoinChannel={voiceControls.joinChannel}
      onLeaveChannel={voiceControls.leaveChannel}
      onToggleAudio={voiceControls.toggleAudio}
      onToggleVideo={voiceControls.toggleVideo}
      onToggleDeafen={voiceControls.toggleDeafen}
      onToggleScreenShare={voiceControls.startScreenShare}
    />
  );
}
```

### 3. Advanced Usage with Multiple Channels

```tsx
import { useVoiceChannels, useVoicePresence } from '~/hooks/useVoiceChannel';

function ServerWithVoiceChannels() {
  const channels = useVoiceChannels(['channel-1', 'channel-2', 'channel-3']);
  const presence = useVoicePresence();

  return (
    <div>
      {/* Voice presence indicator */}
      {presence.activeChannels.length > 0 && (
        <div className="voice-indicator">
          Connected to {presence.activeChannels.length} channels
          {presence.isSpeaking && ' • Speaking'}
        </div>
      )}

      {/* Voice channels */}
      {Object.entries(channels).map(([channelId, { state, controls }]) => (
        <EnhancedVoiceChannel
          key={channelId}
          channelId={channelId}
          // ... other props
        />
      ))}
    </div>
  );
}
```

## 🎛️ API Reference

### Enhanced Socket Context

```tsx
interface EnhancedSocketContextType {
  // Connection
  socket: Socket | null;
  isConnected: boolean;
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'failed';
  
  // Voice Channels
  voiceChannelData: { [channelId: string]: VoiceChannelData };
  joinVoiceChannel: (channelId: string, callType?: 'voice' | 'video' | 'screen') => void;
  leaveVoiceChannel: (channelId: string) => void;
  updateSpeakingStatus: (channelId: string, isSpeaking: boolean, volume: number) => void;
  
  // Subscriptions
  subscribeToVoiceUpdates: (channelId: string, listener: Function) => () => void;
  subscribeToSpeakingUpdates: (channelId: string, listener: Function) => () => void;
  subscribeToConnectionWarnings: (listener: Function) => () => void;
}
```

### Voice Channel Hook

```tsx
const [voiceState, voiceControls] = useVoiceChannel({
  channelId: string;
  autoJoin?: boolean;
  defaultQuality?: 'auto' | 'high' | 'medium' | 'low';
  enableSpeakingDetection?: boolean;
  enableConnectionMonitoring?: boolean;
  onConnectionWarning?: (warning: any) => void;
  onParticipantJoin?: (participant: any) => void;
  onParticipantLeave?: (participant: any) => void;
  onSpeakingChange?: (userId: string, isSpeaking: boolean) => void;
  onError?: (error: Error) => void;
});
```

### Voice State Object

```tsx
interface VoiceChannelState {
  isConnected: boolean;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  isDeafened: boolean;
  isSpeaking: boolean;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
  participants: VoiceParticipant[];
  settings: VoiceChannelSettings;
  stats: {
    totalParticipants: number;
    speakingCount: number;
    videoCount: number;
    screenShareCount: number;
  };
}
```

### Voice Controls Object

```tsx
interface VoiceChannelControls {
  // Connection
  joinChannel: (channelId: string, type?: 'voice' | 'video' | 'screen') => Promise<void>;
  leaveChannel: () => void;
  
  // Audio/Video
  toggleAudio: () => void;
  toggleVideo: () => void;
  toggleDeafen: () => void;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => void;
  
  // Advanced
  changeQuality: (quality: 'auto' | 'high' | 'medium' | 'low') => void;
  setVolume: (userId: string, volume: number) => void;
  
  // Diagnostics
  runDiagnostics: () => Promise<any>;
  exportLogs: () => string;
}
```

## 🔧 Configuration Options

### Socket Configuration

```tsx
// src/contexts/EnhancedSocketContext.tsx
const ENHANCED_SOCKET_CONFIG = {
  path: "/api/socket/io",
  transports: ['polling', 'websocket'],
  reconnectionAttempts: 15,
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e8, // 100MB for enhanced features
};
```

### WebRTC Configuration

```tsx
// src/hooks/useEnhancedWebRTC.ts
const PEER_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    // Add TURN servers for production
  ],
  iceCandidatePoolSize: 10,
  bundlePolicy: "max-bundle",
};
```

### Audio Analysis Configuration

```tsx
const AUDIO_ANALYSIS_CONFIG = {
  fftSize: 256,
  smoothingTimeConstant: 0.8,
  speakingThreshold: -50, // dB
  silenceTimeout: 1000, // ms
};
```

## 📊 Speaking Detection

Speaking detection analizează audio în timp real folosind Web Audio API:

```tsx
// Setup audio context
const audioContext = new AudioContext();
const analyser = audioContext.createAnalyser();
analyser.fftSize = 256;

// Connect microphone
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
const source = audioContext.createMediaStreamSource(stream);
source.connect(analyser);

// Analyze audio levels
const dataArray = new Uint8Array(analyser.frequencyBinCount);
analyser.getByteFrequencyData(dataArray);

const rms = Math.sqrt(
  dataArray.reduce((sum, value) => sum + value * value, 0) / dataArray.length
);

const dB = 20 * Math.log10(rms / 255);
const isSpeaking = dB > -50; // Threshold
```

## 🔊 Connection Quality Monitoring

Sistemul monitorizează automat calitatea conexiunii:

```tsx
// Metrici monitorizate
interface ConnectionStats {
  packetsLost: number;
  jitter: number;
  bitrate: number;
  roundTripTime: number;
}

// Calitatea este calculată automat
const quality = calculateQuality(stats);
// 'excellent' | 'good' | 'fair' | 'poor'
```

## 🎨 UI Components

### EnhancedVoiceChannel Props

```tsx
interface EnhancedVoiceChannelProps {
  channelId: string;
  channelName: string;
  channelEmoji?: string;
  isInChannel: boolean;
  participants: VoiceParticipant[];
  currentUser: CurrentUserState;
  
  // Event handlers
  onJoinChannel: (channelId: string, type: 'voice' | 'video' | 'screen') => void;
  onLeaveChannel: () => void;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleDeafen: () => void;
  onToggleScreenShare: () => void;
  
  // Settings
  maxParticipants?: number;
  allowVideo?: boolean;
  allowScreenShare?: boolean;
  isLocked?: boolean;
  showInSidebar?: boolean;
}
```

### VoiceCallInterface Props

Extended version of existing props with enhanced features.

## 🚨 Error Handling

```tsx
// Hook error handling
const [voiceState, voiceControls] = useVoiceChannel({
  channelId: 'my-channel',
  onError: (error) => {
    console.error('Voice error:', error);
    
    // Handle specific errors
    if (error.message.includes('Media access denied')) {
      toast.error('Microphone permission required');
    } else if (error.message.includes('Connection failed')) {
      toast.error('Network connection issue');
    }
  },
});

// Connection warnings
subscribeToConnectionWarnings((warning) => {
  toast.warning(`Connection Issue: ${warning.suggestion}`);
});
```

## 🔍 Debugging și Diagnostics

```tsx
// Run diagnostics
const diagnostics = await voiceControls.runDiagnostics();
console.log('Voice diagnostics:', diagnostics);

// Export logs
const logs = voiceControls.exportLogs();
console.log('Voice logs:', logs);

// Connection info
const info = socket.getConnectionInfo();
console.log('Connection info:', info);
```

## 📈 Performance Optimization

### Speaking Detection Optimization

```tsx
// Reduce speaking update frequency for better performance
const SPEAKING_UPDATE_INTERVAL = 200; // ms (instead of 100ms)

// Use Web Workers for audio analysis (advanced)
const audioWorker = new Worker('/workers/audio-analyzer.js');
```

### Connection Optimization

```tsx
// Batch multiple events
const batchedUpdates = [];
const flushInterval = setInterval(() => {
  if (batchedUpdates.length > 0) {
    socket.emit('voice:batch_update', batchedUpdates);
    batchedUpdates.length = 0;
  }
}, 1000);
```

## 🔒 Security Considerations

1. **Authentication**: Toate conexiunile sunt autentificate prin Clerk
2. **Channel Permissions**: Server-side validation pentru join/leave
3. **Media Access**: Proper permission handling pentru microphone/camera
4. **Rate Limiting**: Socket events sunt rate-limited
5. **Input Validation**: Toate datele sunt validate pe server

## 🚀 Deployment

### Environment Variables

```bash
# .env.local
NEXT_PUBLIC_SOCKET_URL=http://localhost:3000
NEXT_PUBLIC_ICE_SERVERS=stun:stun.l.google.com:19302
NEXT_PUBLIC_TURN_SERVER=turn:your-turn-server.com
NEXT_PUBLIC_TURN_USERNAME=username
NEXT_PUBLIC_TURN_CREDENTIAL=password
```

### Production Considerations

1. **TURN Servers**: Necesare pentru connections behind NAT/firewall
2. **Load Balancing**: Socket.IO sticky sessions
3. **Monitoring**: Voice channel statistics și health checks
4. **Scaling**: Horizontal scaling cu Redis adapter

## 📝 Migration Guide

Pentru a migra de la implementarea existentă:

1. **Replace Socket Context**:
   ```tsx
   // Înlocuiește
   import { useSocketContext } from '~/contexts/SocketContext';
   
   // Cu
   import { useEnhancedSocketContext } from '~/contexts/EnhancedSocketContext';
   ```

2. **Update Voice Components**:
   ```tsx
   // Înlocuiește componenta existentă
   import VoiceChannel from '~/components/VoiceChannel';
   
   // Cu noua componentă
   import EnhancedVoiceChannel from '~/components/voice/EnhancedVoiceChannel';
   ```

3. **Use New Hooks**:
   ```tsx
   // Adaugă hook-ul nou
   import { useVoiceChannel } from '~/hooks/useVoiceChannel';
   ```

## 🐛 Common Issues

### Issue: Audio Permission Denied
```tsx
// Solution: Proper error handling
try {
  await navigator.mediaDevices.getUserMedia({ audio: true });
} catch (error) {
  if (error.name === 'NotAllowedError') {
    toast.error('Microphone permission required');
  }
}
```

### Issue: WebRTC Connection Failed
```tsx
// Solution: Add TURN servers
const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { 
    urls: "turn:your-turn-server.com:3478",
    username: "username",
    credential: "password"
  }
];
```

### Issue: Speaking Detection Not Working
```tsx
// Solution: Check audio context state
if (audioContext.state === 'suspended') {
  await audioContext.resume();
}
```

## 📚 Additional Resources

- [WebRTC Documentation](https://webrtc.org/getting-started/)
- [Web Audio API Guide](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [Socket.IO Documentation](https://socket.io/docs/v4/)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)

## 🤝 Contributing

Pentru contribuții la această implementare:

1. Fork repository-ul
2. Creează feature branch
3. Testează toate funcționalitățile
4. Submit pull request

## 📄 License

MIT License - vezi fișierul LICENSE pentru detalii.
