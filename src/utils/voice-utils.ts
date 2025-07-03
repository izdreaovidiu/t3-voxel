// src/utils/voice-utils.ts - Voice Channel Utilities
import { toast } from 'sonner';

export interface VoicePermissions {
  microphone: 'granted' | 'denied' | 'prompt';
  camera: 'granted' | 'denied' | 'prompt';
  screen: 'granted' | 'denied' | 'prompt';
}

export interface AudioDevice {
  deviceId: string;
  label: string;
  kind: 'audioinput' | 'audiooutput' | 'videoinput';
  groupId: string;
}

export interface ConnectionQualityMetrics {
  latency: number;
  jitter: number;
  packetsLost: number;
  bitrate: number;
  score: number; // 0-100
  quality: 'excellent' | 'good' | 'fair' | 'poor';
}

// Permission utilities
export class VoicePermissionManager {
  private static instance: VoicePermissionManager;
  private permissions: VoicePermissions = {
    microphone: 'prompt',
    camera: 'prompt',
    screen: 'prompt',
  };

  static getInstance(): VoicePermissionManager {
    if (!VoicePermissionManager.instance) {
      VoicePermissionManager.instance = new VoicePermissionManager();
    }
    return VoicePermissionManager.instance;
  }

  async checkPermissions(): Promise<VoicePermissions> {
    try {
      if (navigator.permissions) {
        const [micPermission, cameraPermission] = await Promise.all([
          navigator.permissions.query({ name: 'microphone' as PermissionName }),
          navigator.permissions.query({ name: 'camera' as PermissionName }),
        ]);

        this.permissions.microphone = micPermission.state;
        this.permissions.camera = cameraPermission.state;
      }
    } catch (error) {
      console.warn('Permission API not supported:', error);
    }

    return { ...this.permissions };
  }

  async requestMicrophonePermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      
      stream.getTracks().forEach(track => track.stop());
      this.permissions.microphone = 'granted';
      return true;
    } catch (error) {
      this.permissions.microphone = 'denied';
      console.error('Microphone permission denied:', error);
      return false;
    }
  }

  async requestCameraPermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        }
      });
      
      stream.getTracks().forEach(track => track.stop());
      this.permissions.camera = 'granted';
      return true;
    } catch (error) {
      this.permissions.camera = 'denied';
      console.error('Camera permission denied:', error);
      return false;
    }
  }

  async requestScreenPermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      
      stream.getTracks().forEach(track => track.stop());
      this.permissions.screen = 'granted';
      return true;
    } catch (error) {
      this.permissions.screen = 'denied';
      console.error('Screen share permission denied:', error);
      return false;
    }
  }

  getPermissions(): VoicePermissions {
    return { ...this.permissions };
  }
}

// Device management utilities
export class AudioDeviceManager {
  private static instance: AudioDeviceManager;
  private devices: AudioDevice[] = [];
  private selectedDevices = {
    microphone: '',
    speaker: '',
    camera: '',
  };

  static getInstance(): AudioDeviceManager {
    if (!AudioDeviceManager.instance) {
      AudioDeviceManager.instance = new AudioDeviceManager();
    }
    return AudioDeviceManager.instance;
  }

  async getDevices(): Promise<AudioDevice[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      this.devices = devices.map(device => ({
        deviceId: device.deviceId,
        label: device.label || `${device.kind} ${device.deviceId.slice(0, 8)}`,
        kind: device.kind as 'audioinput' | 'audiooutput' | 'videoinput',
        groupId: device.groupId,
      }));
      
      return [...this.devices];
    } catch (error) {
      console.error('Failed to enumerate devices:', error);
      return [];
    }
  }

  getMicrophones(): AudioDevice[] {
    return this.devices.filter(device => device.kind === 'audioinput');
  }

  getSpeakers(): AudioDevice[] {
    return this.devices.filter(device => device.kind === 'audiooutput');
  }

  getCameras(): AudioDevice[] {
    return this.devices.filter(device => device.kind === 'videoinput');
  }

  setSelectedMicrophone(deviceId: string): void {
    this.selectedDevices.microphone = deviceId;
    localStorage.setItem('voxel-selected-microphone', deviceId);
  }

  setSelectedSpeaker(deviceId: string): void {
    this.selectedDevices.speaker = deviceId;
    localStorage.setItem('voxel-selected-speaker', deviceId);
  }

  setSelectedCamera(deviceId: string): void {
    this.selectedDevices.camera = deviceId;
    localStorage.setItem('voxel-selected-camera', deviceId);
  }

  getSelectedDevices() {
    // Load from localStorage on first access
    if (!this.selectedDevices.microphone) {
      this.selectedDevices.microphone = localStorage.getItem('voxel-selected-microphone') || '';
      this.selectedDevices.speaker = localStorage.getItem('voxel-selected-speaker') || '';
      this.selectedDevices.camera = localStorage.getItem('voxel-selected-camera') || '';
    }
    
    return { ...this.selectedDevices };
  }

  async testMicrophone(deviceId?: string): Promise<{ level: number; working: boolean }> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
        }
      });

      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      microphone.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      return new Promise((resolve) => {
        let maxLevel = 0;
        let sampleCount = 0;
        const maxSamples = 20; // 2 seconds at 100ms intervals

        const measureLevel = () => {
          analyser.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
          maxLevel = Math.max(maxLevel, average);
          sampleCount++;

          if (sampleCount < maxSamples) {
            setTimeout(measureLevel, 100);
          } else {
            stream.getTracks().forEach(track => track.stop());
            audioContext.close();
            
            resolve({
              level: maxLevel / 255, // Normalize to 0-1
              working: maxLevel > 0
            });
          }
        };

        measureLevel();
      });
    } catch (error) {
      console.error('Microphone test failed:', error);
      return { level: 0, working: false };
    }
  }
}

// Connection quality utilities
export class ConnectionQualityAnalyzer {
  private static instance: ConnectionQualityAnalyzer;
  private metrics: ConnectionQualityMetrics = {
    latency: 0,
    jitter: 0,
    packetsLost: 0,
    bitrate: 0,
    score: 100,
    quality: 'excellent',
  };

  static getInstance(): ConnectionQualityAnalyzer {
    if (!ConnectionQualityAnalyzer.instance) {
      ConnectionQualityAnalyzer.instance = new ConnectionQualityAnalyzer();
    }
    return ConnectionQualityAnalyzer.instance;
  }

  updateMetrics(stats: Partial<ConnectionQualityMetrics>): void {
    this.metrics = { ...this.metrics, ...stats };
    this.calculateQuality();
  }

  private calculateQuality(): void {
    let score = 100;

    // Penalize high latency
    if (this.metrics.latency > 200) {
      score -= Math.min(40, (this.metrics.latency - 200) / 10);
    }

    // Penalize packet loss
    if (this.metrics.packetsLost > 0) {
      score -= Math.min(30, this.metrics.packetsLost * 5);
    }

    // Penalize high jitter
    if (this.metrics.jitter > 30) {
      score -= Math.min(20, (this.metrics.jitter - 30) / 2);
    }

    // Penalize low bitrate
    if (this.metrics.bitrate < 32000) {
      score -= Math.min(20, (32000 - this.metrics.bitrate) / 1600);
    }

    score = Math.max(0, Math.round(score));
    this.metrics.score = score;

    // Determine quality level
    if (score >= 90) {
      this.metrics.quality = 'excellent';
    } else if (score >= 70) {
      this.metrics.quality = 'good';
    } else if (score >= 50) {
      this.metrics.quality = 'fair';
    } else {
      this.metrics.quality = 'poor';
    }
  }

  getMetrics(): ConnectionQualityMetrics {
    return { ...this.metrics };
  }

  getQualityColor(): string {
    switch (this.metrics.quality) {
      case 'excellent': return '#22c55e'; // green-500
      case 'good': return '#eab308'; // yellow-500
      case 'fair': return '#f97316'; // orange-500
      case 'poor': return '#ef4444'; // red-500
      default: return '#6b7280'; // gray-500
    }
  }

  getRecommendations(): string[] {
    const recommendations: string[] = [];

    if (this.metrics.latency > 200) {
      recommendations.push('High latency detected. Try moving closer to your router or using a wired connection.');
    }

    if (this.metrics.packetsLost > 2) {
      recommendations.push('Packet loss detected. Check your network connection stability.');
    }

    if (this.metrics.jitter > 50) {
      recommendations.push('High jitter detected. Close other applications using network bandwidth.');
    }

    if (this.metrics.bitrate < 32000) {
      recommendations.push('Low bitrate detected. Consider reducing video quality or closing other voice applications.');
    }

    if (recommendations.length === 0) {
      recommendations.push('Connection quality is optimal!');
    }

    return recommendations;
  }
}

// Audio processing utilities
export class AudioProcessor {
  private static instance: AudioProcessor;
  private audioContext: AudioContext | null = null;
  private processingNodes = new Map<string, {
    analyzer: AnalyserNode;
    gainNode: GainNode;
    filterNode: BiquadFilterNode;
  }>();

  static getInstance(): AudioProcessor {
    if (!AudioProcessor.instance) {
      AudioProcessor.instance = new AudioProcessor();
    }
    return AudioProcessor.instance;
  }

  async initializeAudioContext(): Promise<AudioContext> {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    return this.audioContext;
  }

  async createProcessingChain(stream: MediaStream, userId: string): Promise<{
    analyzer: AnalyserNode;
    gainNode: GainNode;
    filterNode: BiquadFilterNode;
  }> {
    const audioContext = await this.initializeAudioContext();
    
    // Create processing nodes
    const source = audioContext.createMediaStreamSource(stream);
    const analyzer = audioContext.createAnalyser();
    const gainNode = audioContext.createGain();
    const filterNode = audioContext.createBiquadFilter();

    // Configure analyzer
    analyzer.fftSize = 2048;
    analyzer.smoothingTimeConstant = 0.8;

    // Configure filter (high-pass to reduce background noise)
    filterNode.type = 'highpass';
    filterNode.frequency.setValueAtTime(85, audioContext.currentTime); // Remove low-frequency noise

    // Configure gain
    gainNode.gain.setValueAtTime(1.0, audioContext.currentTime);

    // Connect the chain
    source.connect(filterNode);
    filterNode.connect(gainNode);
    gainNode.connect(analyzer);

    // Store processing nodes
    this.processingNodes.set(userId, { analyzer, gainNode, filterNode });

    return { analyzer, gainNode, filterNode };
  }

  setUserVolume(userId: string, volume: number): void {
    const nodes = this.processingNodes.get(userId);
    if (nodes && this.audioContext) {
      // Smooth volume transition
      nodes.gainNode.gain.setTargetAtTime(
        volume,
        this.audioContext.currentTime,
        0.1 // 100ms transition
      );
    }
  }

  muteUser(userId: string): void {
    this.setUserVolume(userId, 0);
  }

  unmuteUser(userId: string): void {
    this.setUserVolume(userId, 1);
  }

  analyzeAudioLevel(userId: string): number {
    const nodes = this.processingNodes.get(userId);
    if (!nodes) return 0;

    const dataArray = new Uint8Array(nodes.analyzer.frequencyBinCount);
    nodes.analyzer.getByteFrequencyData(dataArray);

    // Calculate RMS level
    const rms = Math.sqrt(
      dataArray.reduce((sum, value) => sum + value * value, 0) / dataArray.length
    );

    // Convert to 0-1 range
    return Math.min(1, rms / 128);
  }

  isSpeaking(userId: string, threshold = 0.1): boolean {
    const level = this.analyzeAudioLevel(userId);
    return level > threshold;
  }

  cleanup(userId: string): void {
    const nodes = this.processingNodes.get(userId);
    if (nodes) {
      nodes.analyzer.disconnect();
      nodes.gainNode.disconnect();
      nodes.filterNode.disconnect();
      this.processingNodes.delete(userId);
    }
  }

  cleanupAll(): void {
    for (const userId of this.processingNodes.keys()) {
      this.cleanup(userId);
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

// Voice channel utilities
export const VoiceUtils = {
  // Format duration
  formatDuration: (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  },

  // Generate participant initials
  getInitials: (name: string): string => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  },

  // Generate random channel colors
  getChannelColor: (channelId: string): string => {
    const colors = [
      '#f87171', '#fb923c', '#fbbf24', '#a3e635',
      '#34d399', '#22d3ee', '#60a5fa', '#a78bfa',
      '#f472b6', '#fb7185'
    ];
    
    let hash = 0;
    for (let i = 0; i < channelId.length; i++) {
      hash = channelId.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  },

  // Validate channel name
  validateChannelName: (name: string): { valid: boolean; error?: string } => {
    if (!name || name.trim().length === 0) {
      return { valid: false, error: 'Channel name cannot be empty' };
    }
    
    if (name.length > 50) {
      return { valid: false, error: 'Channel name cannot exceed 50 characters' };
    }
    
    if (!/^[a-zA-Z0-9\s\-_]+$/.test(name)) {
      return { valid: false, error: 'Channel name contains invalid characters' };
    }
    
    return { valid: true };
  },

  // Calculate optimal bitrate
  calculateOptimalBitrate: (participantCount: number, quality: 'low' | 'medium' | 'high' = 'medium'): number => {
    const baseBitrates = {
      low: 32000,      // 32 kbps
      medium: 64000,   // 64 kbps
      high: 128000,    // 128 kbps
    };

    const baseBitrate = baseBitrates[quality];
    
    // Reduce bitrate for more participants to prevent bandwidth issues
    if (participantCount > 10) {
      return Math.max(baseBitrate * 0.5, 16000);
    } else if (participantCount > 5) {
      return Math.max(baseBitrate * 0.75, 24000);
    }
    
    return baseBitrate;
  },

  // Detect browser capabilities
  getBrowserCapabilities: () => {
    const capabilities = {
      webrtc: !!(window.RTCPeerConnection || (window as any).webkitRTCPeerConnection),
      getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
      getDisplayMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia),
      audioContext: !!(window.AudioContext || (window as any).webkitAudioContext),
      mediaRecorder: !!window.MediaRecorder,
    };

    return capabilities;
  },

  // Toast helpers for voice events
  showVoiceToast: {
    joined: (username: string, channelName: string) => {
      toast.success(`${username} joined ${channelName}`, {
        duration: 3000,
        icon: '🎤',
      });
    },
    
    left: (username: string, channelName: string) => {
      toast.info(`${username} left ${channelName}`, {
        duration: 3000,
        icon: '👋',
      });
    },
    
    muted: (username: string) => {
      toast.info(`${username} muted their microphone`, {
        duration: 2000,
        icon: '🔇',
      });
    },
    
    unmuted: (username: string) => {
      toast.info(`${username} unmuted their microphone`, {
        duration: 2000,
        icon: '🎤',
      });
    },
    
    startedVideo: (username: string) => {
      toast.info(`${username} turned on their camera`, {
        duration: 2000,
        icon: '📷',
      });
    },
    
    stoppedVideo: (username: string) => {
      toast.info(`${username} turned off their camera`, {
        duration: 2000,
        icon: '📷',
      });
    },
    
    startedScreenShare: (username: string) => {
      toast.info(`${username} started screen sharing`, {
        duration: 3000,
        icon: '🖥️',
      });
    },
    
    stoppedScreenShare: (username: string) => {
      toast.info(`${username} stopped screen sharing`, {
        duration: 3000,
        icon: '🖥️',
      });
    },
    
    connectionIssue: (issue: string) => {
      toast.warning(`Connection Issue: ${issue}`, {
        duration: 5000,
        icon: '⚠️',
      });
    },
    
    permissionDenied: (permission: string) => {
      toast.error(`${permission} permission denied. Please enable it in your browser settings.`, {
        duration: 5000,
        icon: '🚫',
      });
    },
  },
};

// Export all utilities
export {
  VoicePermissionManager,
  AudioDeviceManager,
  ConnectionQualityAnalyzer,
  AudioProcessor,
};
