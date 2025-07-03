# Enhanced Voice Channel System - Implementation Guide

## Overview

Your Voxel project now includes a comprehensive voice channel system with enhanced features including:

- **Real-time voice communication** with WebRTC
- **Speaking detection** with visual indicators
- **Connection quality monitoring** with automatic warnings
- **Video and screen sharing** support
- **Enhanced UI components** with beautiful animations
- **Comprehensive logging and diagnostics**
- **Database persistence** for voice sessions and statistics

## Quick Start

### 1. Context Provider Setup ✅

The Enhanced Socket Context is already configured in your `layout.tsx`:

```tsx
import { EnhancedSocketProvider } from "~/contexts/EnhancedSocketContext";

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <TRPCReactProvider>
            <EnhancedSocketProvider>
              {children}
            </EnhancedSocketProvider>
          </TRPCReactProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
```

### 2. Using Voice Channels in Your Components

```tsx
import { useVoiceChannel } from '~/hooks/useVoiceChannel';
import EnhancedVoiceChannel from '~/components/voice/EnhancedVoiceChannel';

function YourServerPage() {
  const [voiceState, voiceControls] = useVoiceChannel({
    channelId: 'your-channel-id',
    enableSpeakingDetection: true,
    enableConnectionMonitoring: true,
    onConnectionWarning: (warning) => {
      console.log('Connection warning:', warning);
    },
    onParticipantJoin: (participant) => {
      console.log('Participant joined:', participant);
    },
    onParticipantLeave: (participant) => {
      console.log('Participant left:', participant);
    },
  });

  const currentUser = {
    id: user.id,
    username: user.username || 'Unknown',
    avatar: user.imageUrl,
    isAudioEnabled: voiceState.isAudioEnabled,
    isVideoEnabled: voiceState.isVideoEnabled,
    isScreenSharing: voiceState.isScreenSharing,
    isDeafened: voiceState.isDeafened,
    isSpeaking: voiceState.isSpeaking,
    connectionQuality: voiceState.connectionQuality,
  };

  return (
    <EnhancedVoiceChannel
      channelId="your-channel-id"
      channelName="General Voice"
      channelEmoji="🎤"
      isInChannel={voiceState.isConnected}
      participants={voiceState.participants}
      currentUser={currentUser}
      onJoinChannel={voiceControls.joinChannel}
      onLeaveChannel={voiceControls.leaveChannel}
      onToggleAudio={voiceControls.toggleAudio}
      onToggleVideo={voiceControls.toggleVideo}
      onToggleDeafen={voiceControls.toggleDeafen}
      onToggleScreenShare={voiceState.isScreenSharing ? voiceControls.stopScreenShare : voiceControls.startScreenShare}
      maxParticipants={20}
      allowVideo={true}
      allowScreenShare={true}
      showInSidebar={false} // or true for sidebar version
    />
  );
}
```

### 3. Database Setup

To set up the enhanced database schema:

```bash
# Make the setup script executable
chmod +x setup-enhanced-voice.sh

# Run the setup script
./setup-enhanced-voice.sh
```

Or manually:

```bash
# Apply the enhanced Prisma schema
cp ENHANCED_SCHEMA.prisma prisma/schema.prisma

# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push
```

## Features

### Enhanced Socket Context

The `EnhancedSocketContext` provides:

- **Real-time communication** with Socket.IO
- **Voice channel management** with participant tracking
- **Speaking detection** with volume and audio level monitoring
- **Connection monitoring** with quality warnings
- **Enhanced error handling** and reconnection logic

### Voice Channel Hook

The `useVoiceChannel` hook offers:

```tsx
const [voiceState, voiceControls] = useVoiceChannel({
  channelId: 'channel-id',
  autoJoin: false,
  defaultQuality: 'auto', // 'low' | 'medium' | 'high' | 'auto'
  enableSpeakingDetection: true,
  enableConnectionMonitoring: true,
  onConnectionWarning: (warning) => void,
  onParticipantJoin: (participant) => void,
  onParticipantLeave: (participant) => void,
  onSpeakingChange: (userId, isSpeaking) => void,
  onError: (error) => void,
});
```

**Voice State includes:**
- `isConnected`: Connection status
- `isAudioEnabled`: Audio status
- `isVideoEnabled`: Video status
- `isScreenSharing`: Screen sharing status
- `isDeafened`: Deafen status
- `isSpeaking`: Speaking detection
- `connectionQuality`: Connection quality ('excellent' | 'good' | 'fair' | 'poor')
- `participants`: List of other participants
- `settings`: Channel settings
- `stats`: Channel statistics

**Voice Controls include:**
- `joinChannel(channelId, type)`: Join voice/video/screen
- `leaveChannel()`: Leave the channel
- `toggleAudio()`: Toggle microphone
- `toggleVideo()`: Toggle camera
- `toggleDeafen()`: Toggle deafen
- `startScreenShare()`: Start screen sharing
- `stopScreenShare()`: Stop screen sharing
- `runDiagnostics()`: Run system diagnostics
- `exportLogs()`: Export debug logs

### Enhanced Voice Channel Component

The `EnhancedVoiceChannel` component provides:

- **Beautiful animations** and visual feedback
- **Speaking indicators** with audio visualization
- **Connection quality indicators**
- **Participant management** with roles and permissions
- **Responsive design** with sidebar and full-screen modes
- **Real-time statistics** display

### Database Models

The enhanced schema includes:

- **VoiceChannelSettings**: Channel configuration
- **VoiceChannelStats**: Usage analytics
- **VoiceSession**: User session tracking
- **UserVoicePreferences**: User preferences
- **VoiceChannelPermission**: Permission system
- **VoiceConnectionLog**: Debug and monitoring logs

## Testing

Visit the demo page to test the voice channel system:

```
http://localhost:3000/voice-demo
```

The demo page includes:
- Full voice channel interface
- Connection diagnostics
- Log export functionality
- Real-time statistics
- Control examples

## Architecture

### Real-time Communication Flow

1. **Client connects** to Enhanced Socket Context
2. **User joins voice channel** via `joinVoiceChannel`
3. **WebRTC connection established** for audio/video
4. **Speaking detection** monitors audio levels
5. **Connection monitoring** tracks quality metrics
6. **Server broadcasts** participant updates to all clients

### Component Hierarchy

```
EnhancedSocketProvider
├── useVoiceChannel hook
├── EnhancedVoiceChannel component
├── useEnhancedWebRTC hook
└── useSpeakingDetection hook
```

### Database Flow

1. **VoiceSession** created when user joins
2. **VoiceConnectionLog** tracks all events
3. **VoiceChannelStats** aggregated daily
4. **UserVoicePreferences** stored per user

## Customization

### Adding Custom Events

```tsx
// Subscribe to custom voice events
useEffect(() => {
  const unsubscribe = socket.subscribeToVoiceUpdates(channelId, (data) => {
    // Handle custom voice events
    console.log('Custom voice event:', data);
  });
  
  return unsubscribe;
}, [socket, channelId]);
```

### Custom Permissions

```tsx
// Check voice permissions
const hasPermission = (userId: string, permission: VoicePermissionType) => {
  // Implement your permission logic
  return checkVoicePermission(userId, channelId, permission);
};
```

### Custom UI Components

```tsx
// Create custom voice component
const CustomVoiceComponent = ({ channelId }) => {
  const [voiceState, voiceControls] = useVoiceChannel({ channelId });
  
  return (
    <div>
      {/* Your custom UI */}
      <button onClick={voiceControls.toggleAudio}>
        {voiceState.isAudioEnabled ? 'Mute' : 'Unmute'}
      </button>
    </div>
  );
};
```

## Troubleshooting

### Common Issues

1. **Socket not connecting**
   - Check if the server is running
   - Verify environment variables
   - Check browser developer tools for errors

2. **Audio not working**
   - Check browser permissions for microphone
   - Run diagnostics with `voiceControls.runDiagnostics()`
   - Check audio device settings

3. **Speaking detection not working**
   - Ensure `enableSpeakingDetection: true`
   - Check microphone permissions
   - Verify audio context is running

### Debug Tools

```tsx
// Run diagnostics
const diagnostics = await voiceControls.runDiagnostics();
console.log('Diagnostics:', diagnostics);

// Export logs
const logs = voiceControls.exportLogs();
console.log('Voice logs:', logs);

// Check connection info
const connectionInfo = socket.getConnectionInfo();
console.log('Connection:', connectionInfo);
```

## Next Steps

1. **Test the voice demo** at `/voice-demo`
2. **Integrate into your server pages**
3. **Customize the UI** to match your design
4. **Add permission system** for voice channels
5. **Implement voice channel creation** in your admin panel
6. **Add notifications** for voice events
7. **Set up analytics** using the voice stats

For additional help or questions, check the existing documentation files in your project or review the comprehensive component implementations.
