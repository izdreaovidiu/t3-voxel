import React, { useState } from 'react';
import { 
  Phone, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Monitor,
  MonitorOff,
  Minimize2,
  Maximize2,
} from 'lucide-react';

interface Peer {
  id: string;
  stream?: MediaStream;
  username?: string;
}

interface SimpleVoiceCallInterfaceProps {
  isCallActive: boolean;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  currentCallType: 'voice' | 'video' | 'screen' | null;
  currentChannelId: string | null;
  currentChannelName?: string;
  currentUserName?: string;
  peers: Peer[];
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
  onStartScreenShare: () => void;
  onStopScreenShare: () => void;
  onAnswerCall: () => void;
  onDeclineCall: () => void;
}

const SimpleVoiceCallInterface: React.FC<SimpleVoiceCallInterfaceProps> = ({
  isCallActive,
  isAudioEnabled,
  isVideoEnabled,
  isScreenSharing,
  currentCallType,
  currentChannelName,
  currentUserName,
  peers,
  incomingCall,
  localVideoRef,
  screenShareRef,
  onEndCall,
  onToggleAudio,
  onToggleVideo,
  onStartScreenShare,
  onStopScreenShare,
  onAnswerCall,
  onDeclineCall,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);

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
    return (
      <div className={`fixed z-40 transition-all duration-200 ${
        isMinimized 
          ? 'bottom-4 right-4 h-16 w-80'
          : 'inset-4 h-auto w-auto'
      }`}>
        <div className={`h-full w-full rounded-2xl border border-gray-700/50 bg-[#0D1117]/95 backdrop-blur-xl shadow-2xl ${
          isMinimized ? 'p-3' : 'p-6'
        }`}>
          
          {/* Minimized Mode */}
          {isMinimized ? (
            <div className="flex items-center justify-between h-full">
              <div className="flex items-center space-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#57F287] to-[#3BA55C] text-black text-sm font-bold">
                  {currentUserName?.[0]?.toUpperCase() || 'Y'}
                  {!isAudioEnabled && (
                    <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#ED4245] text-white">
                      <MicOff className="h-2 w-2" />
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-xs font-medium text-white">
                    {currentChannelName || (currentCallType === 'video' ? 'Video Call' : currentCallType === 'screen' ? 'Screen Share' : 'Voice Call')}
                  </div>
                  <div className="text-xs text-gray-400">
                    {peers.length + 1} participant{peers.length !== 0 ? 's' : ''}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={onToggleAudio}
                  className={`flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 ${
                    isAudioEnabled
                      ? 'bg-gray-700 text-white hover:bg-gray-600'
                      : 'bg-[#ED4245] text-white hover:bg-[#C23237]'
                  }`}
                >
                  {isAudioEnabled ? <Mic className="h-3 w-3" /> : <MicOff className="h-3 w-3" />}
                </button>

                <button
                  onClick={onEndCall}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ED4245] text-white transition-all duration-200 hover:bg-[#C23237]"
                >
                  <PhoneOff className="h-3 w-3" />
                </button>
                
                <button
                  onClick={() => setIsMinimized(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-700/30 hover:text-white"
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
                      <Phone className="h-4 w-4 text-[#57F287]" />
                    )}
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      {currentChannelName || (currentCallType === 'video' ? 'Video Call' : currentCallType === 'screen' ? 'Screen Share' : 'Voice Call')}
                    </h3>
                    <p className="text-sm text-gray-400">
                      {peers.length + 1} participant{peers.length !== 0 ? 's' : ''}
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={() => setIsMinimized(true)}
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-700/30 hover:text-white"
                >
                  <Minimize2 className="h-5 w-5" />
                </button>
              </div>

              {/* Video Content */}
              <div className="mb-6">
                {/* Screen Share Display */}
                {isScreenSharing && (
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
                  </div>
                )}
                
                {/* Video Grid */}
                {(currentCallType === 'video' || isVideoEnabled) && !isScreenSharing && (
                  <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                    {/* Local video */}
                    <div className="relative overflow-hidden rounded-xl border border-gray-700/50 bg-gray-900 aspect-video">
                      <video
                        ref={localVideoRef}
                        autoPlay
                        muted
                        playsInline
                        className={`h-full w-full object-cover ${!isVideoEnabled ? 'opacity-0' : ''}`}
                      />
                      
                      {!isVideoEnabled && (
                        <div className="absolute inset-0 flex h-full w-full items-center justify-center">
                          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#57F287] to-[#3BA55C] text-black text-xl font-bold">
                            {currentUserName?.[0]?.toUpperCase() || 'Y'}
                          </div>
                        </div>
                      )}
                      
                      <div className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-1 text-xs text-white backdrop-blur-sm">
                        {currentUserName || 'You'} {!isAudioEnabled && '(muted)'}
                      </div>
                    </div>

                    {/* Remote videos */}
                    {peers.map((peer) => (
                      <RemoteVideo key={peer.id} peer={peer} />
                    ))}
                  </div>
                )}

                {/* Voice-only participants */}
                {currentCallType === 'voice' && !isVideoEnabled && !isScreenSharing && (
                  <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {/* Local user */}
                    <div className="flex flex-col items-center space-y-2 rounded-xl border border-gray-700/50 bg-gray-900/30 p-4">
                      <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#57F287] to-[#3BA55C] text-black font-bold text-xl">
                        {currentUserName?.[0]?.toUpperCase() || 'Y'}
                        {!isAudioEnabled && (
                          <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#ED4245] text-white">
                            <MicOff className="h-3 w-3" />
                          </div>
                        )}
                      </div>
                      <span className="text-sm text-white font-medium">{currentUserName || 'You'}</span>
                    </div>

                    {/* Remote users */}
                    {peers.map((peer) => (
                      <div key={peer.id} className="flex flex-col items-center space-y-2 rounded-xl border border-gray-700/50 bg-gray-900/30 p-4">
                        <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#5865F2] to-[#4752C4] text-white font-bold text-xl">
                          {peer.username?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <span className="text-sm text-white font-medium truncate w-full text-center">
                          {peer.username || 'Unknown'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="flex justify-center space-x-4">
                <button
                  onClick={onToggleAudio}
                  className={`flex h-12 w-12 items-center justify-center rounded-full transition-all duration-200 ${
                    isAudioEnabled
                      ? 'bg-gray-700 text-white hover:bg-gray-600'
                      : 'bg-[#ED4245] text-white hover:bg-[#C23237]'
                  }`}
                  title={isAudioEnabled ? 'Mute' : 'Unmute'}
                >
                  {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                </button>

                <button
                  onClick={onToggleVideo}
                  className={`flex h-12 w-12 items-center justify-center rounded-full transition-all duration-200 ${
                    isVideoEnabled
                      ? 'bg-gray-700 text-white hover:bg-gray-600'
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white'
                  }`}
                  title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
                >
                  {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                </button>

                <button
                  onClick={isScreenSharing ? onStopScreenShare : onStartScreenShare}
                  className={`flex h-12 w-12 items-center justify-center rounded-full transition-all duration-200 ${
                    isScreenSharing
                      ? 'bg-[#57F287] text-black hover:bg-[#3BA55C]'
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white'
                  }`}
                  title={isScreenSharing ? 'Stop screen share' : 'Share screen'}
                >
                  {isScreenSharing ? <MonitorOff className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
                </button>

                <button
                  onClick={onEndCall}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-[#ED4245] text-white shadow-[0_0_20px_rgba(237,66,69,0.4)] transition-all duration-200 hover:bg-[#C23237] hover:shadow-[0_0_30px_rgba(237,66,69,0.6)]"
                  title="End call"
                >
                  <PhoneOff className="h-5 w-5" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return null;
};

// Remote video component
const RemoteVideo: React.FC<{ peer: { id: string; stream?: MediaStream; username?: string } }> = ({ peer }) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);

  React.useEffect(() => {
    if (videoRef.current && peer.stream) {
      videoRef.current.srcObject = peer.stream;
    }
  }, [peer.stream]);

  return (
    <div className="relative aspect-video overflow-hidden rounded-xl border border-gray-700/50 bg-gray-900">
      {peer.stream ? (
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
        {peer.username || 'Unknown'}
      </div>
    </div>
  );
};

export default SimpleVoiceCallInterface;