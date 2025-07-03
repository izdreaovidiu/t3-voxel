import React, { useState, useEffect } from 'react';
import { Monitor, AlertCircle, CheckCircle, Info, X } from 'lucide-react';

interface DebugCheck {
  name: string;
  status: 'pass' | 'fail' | 'warning' | 'info';
  message: string;
}

interface ScreenShareDebugProps {
  isOpen: boolean;
  onClose: () => void;
}

const ScreenShareDebug: React.FC<ScreenShareDebugProps> = ({ isOpen, onClose }) => {
  const [checks, setChecks] = useState<DebugCheck[]>([]);
  const [logs, setLogs] = useState<Array<{ timestamp: string; message: string; type: string }>>([]);
  const [testStream, setTestStream] = useState<MediaStream | null>(null);

  const log = (message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, message, type }]);
    console.log(`[Screen Share Debug] ${message}`);
  };

  const runEnvironmentChecks = () => {
    const newChecks: DebugCheck[] = [];

    // Browser Support
    const hasGetDisplayMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);
    newChecks.push({
      name: 'Browser Support',
      status: hasGetDisplayMedia ? 'pass' : 'fail',
      message: hasGetDisplayMedia 
        ? 'getDisplayMedia is supported' 
        : 'getDisplayMedia is not supported in this browser'
    });

    // Secure Context
    const isSecure = location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname);
    newChecks.push({
      name: 'Secure Context',
      status: isSecure ? 'pass' : 'fail',
      message: isSecure 
        ? `Secure context: ${location.protocol}//${location.hostname}`
        : `Insecure context: ${location.protocol}//${location.hostname} (HTTPS required)`
    });

    // MediaDevices API
    const hasMediaDevices = !!navigator.mediaDevices;
    newChecks.push({
      name: 'MediaDevices API',
      status: hasMediaDevices ? 'pass' : 'fail',
      message: hasMediaDevices ? 'MediaDevices API available' : 'MediaDevices API not available'
    });

    // User Agent Info
    newChecks.push({
      name: 'Browser',
      status: 'info',
      message: navigator.userAgent
    });

    // Screen Recording Permission (macOS specific)
    if (navigator.userAgent.includes('Mac')) {
      newChecks.push({
        name: 'macOS Permissions',
        status: 'warning',
        message: 'Check System Preferences > Security & Privacy > Screen Recording'
      });
    }

    setChecks(newChecks);
  };

  const testBasicScreenShare = async () => {
    log('Starting basic screen share test...', 'info');
    
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        throw new Error('getDisplayMedia not supported');
      }

      const constraints: DisplayMediaStreamConstraints = {
        video: true,
        audio: false
      };

      log(`Using constraints: ${JSON.stringify(constraints)}`, 'info');
      
      const stream = await navigator.mediaDevices.getDisplayMedia(constraints);
      
      log('✅ Successfully got display media stream!', 'success');
      log(`Stream ID: ${stream.id}`, 'info');
      log(`Video tracks: ${stream.getVideoTracks().length}`, 'info');
      log(`Audio tracks: ${stream.getAudioTracks().length}`, 'info');
      
      setTestStream(stream);
      
      // Handle stream ended
      stream.getVideoTracks()[0]?.addEventListener('ended', () => {
        log('Screen sharing ended by user', 'warning');
        setTestStream(null);
      });
      
    } catch (error: any) {
      log(`❌ Failed: ${error.name} - ${error.message}`, 'error');
      
      // Provide specific help based on error type
      if (error.name === 'NotAllowedError') {
        log('💡 Try: Check browser permissions and system screen recording settings', 'warning');
      } else if (error.name === 'NotSupportedError') {
        log('💡 Try: Use Chrome, Firefox, Safari, or Edge browser', 'warning');
      } else if (error.name === 'AbortError') {
        log('💡 User cancelled the screen sharing dialog', 'info');
      }
    }
  };

  const testAdvancedScreenShare = async () => {
    log('Starting advanced screen share test...', 'info');
    
    try {
      const constraints: DisplayMediaStreamConstraints = {
        video: {
          displaySurface: 'monitor' as DisplayCaptureSurfaceType,
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      };

      log(`Using advanced constraints: ${JSON.stringify(constraints)}`, 'info');
      
      const stream = await navigator.mediaDevices.getDisplayMedia(constraints);
      
      log('✅ Advanced screen share successful!', 'success');
      
      // Log detailed track information
      stream.getTracks().forEach((track, index) => {
        const settings = track.getSettings();
        log(`Track ${index}: ${track.kind} - ${track.label}`, 'info');
        log(`Settings: ${JSON.stringify(settings)}`, 'info');
      });
      
      setTestStream(stream);
      
      stream.getVideoTracks()[0]?.addEventListener('ended', () => {
        log('Screen sharing ended by user', 'warning');
        setTestStream(null);
      });
      
    } catch (error: any) {
      log(`❌ Advanced test failed: ${error.name} - ${error.message}`, 'error');
      log('🔄 Falling back to basic test...', 'warning');
      
      // Fallback to basic test
      setTimeout(() => testBasicScreenShare(), 1000);
    }
  };

  const stopTest = () => {
    if (testStream) {
      testStream.getTracks().forEach(track => track.stop());
      setTestStream(null);
      log('✅ Test stream stopped', 'success');
    }
  };

  const clearLogs = () => {
    setLogs([]);
    log('Logs cleared', 'info');
  };

  useEffect(() => {
    if (isOpen) {
      runEnvironmentChecks();
      log('Screen Share Debug Tool opened', 'info');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'fail': return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'warning': return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'info': return <Info className="h-5 w-5 text-blue-500" />;
      default: return <Info className="h-5 w-5 text-gray-500" />;
    }
  };

  const getLogColor = (type: string) => {
    switch (type) {
      case 'success': return 'text-green-400';
      case 'error': return 'text-red-400';
      case 'warning': return 'text-yellow-400';
      default: return 'text-gray-300';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl border border-gray-700/50 bg-[#0D1117] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-700/50 p-6">
          <div className="flex items-center space-x-3">
            <Monitor className="h-6 w-6 text-[#57F287]" />
            <h2 className="text-xl font-bold text-white">Screen Share Debug Tool</h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-700/30 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex h-[calc(90vh-5rem)]">
          {/* Left Panel - Environment Checks */}
          <div className="w-1/3 border-r border-gray-700/50 p-6">
            <h3 className="mb-4 text-lg font-semibold text-white">Environment Checks</h3>
            <div className="space-y-3">
              {checks.map((check, index) => (
                <div key={index} className="flex items-start space-x-3 rounded-lg bg-gray-800/50 p-3">
                  {getStatusIcon(check.status)}
                  <div className="flex-1">
                    <div className="font-medium text-white">{check.name}</div>
                    <div className="text-sm text-gray-400">{check.message}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Test Controls */}
            <div className="mt-6 space-y-3">
              <h4 className="font-semibold text-white">Tests</h4>
              <button
                onClick={testBasicScreenShare}
                className="w-full rounded-lg bg-[#57F287] px-4 py-2 text-black font-medium hover:bg-[#3BA55C] transition-colors"
              >
                Test Basic Screen Share
              </button>
              <button
                onClick={testAdvancedScreenShare}
                className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 transition-colors"
              >
                Test Advanced Screen Share
              </button>
              {testStream && (
                <button
                  onClick={stopTest}
                  className="w-full rounded-lg bg-red-600 px-4 py-2 text-white font-medium hover:bg-red-700 transition-colors"
                >
                  Stop Test
                </button>
              )}
              <button
                onClick={clearLogs}
                className="w-full rounded-lg bg-gray-600 px-4 py-2 text-white font-medium hover:bg-gray-700 transition-colors"
              >
                Clear Logs
              </button>
            </div>
          </div>

          {/* Right Panel - Logs */}
          <div className="flex-1 p-6">
            <h3 className="mb-4 text-lg font-semibold text-white">Debug Logs</h3>
            <div className="h-full overflow-y-auto rounded-lg bg-gray-900/50 p-4 font-mono text-sm">
              {logs.length === 0 ? (
                <div className="text-gray-500">No logs yet. Run a test to see debug information.</div>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className={`mb-2 ${getLogColor(log.type)}`}>
                    <span className="text-gray-500">[{log.timestamp}]</span> {log.message}
                  </div>
                ))
              )}
            </div>

            {/* Stream Info */}
            {testStream && (
              <div className="mt-4">
                <h4 className="mb-2 font-semibold text-white">Active Test Stream</h4>
                <div className="rounded-lg bg-gray-800/50 p-3 font-mono text-xs text-gray-300">
                  <div>Stream ID: {testStream.id}</div>
                  <div>Active: {testStream.active ? 'Yes' : 'No'}</div>
                  <div>Tracks: {testStream.getTracks().length}</div>
                  {testStream.getTracks().map((track, index) => (
                    <div key={index} className="ml-2">
                      - {track.kind}: {track.label} ({track.readyState})
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScreenShareDebug;
