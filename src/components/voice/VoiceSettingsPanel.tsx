import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { toast } from 'sonner';
import {
  VoicePermissionManager,
  AudioDeviceManager,
  ConnectionQualityAnalyzer,
  VoiceUtils,
  type AudioDevice,
} from '~/utils/voice-utils';
import { useVoicePerformance } from '~/utils/voice-performance';
import { useVoiceDebugger } from '~/utils/voice-debug';
import {
  Settings,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Video,
  VideoOff,
  Monitor,
  Headphones,
  Sliders,
  TestTube,
  Download,
  RotateCcw,
  Check,
  X,
  AlertTriangle,
  Info,
  Smartphone,
  Speaker,
  Camera,
  Zap,
} from 'lucide-react';

interface VoiceSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (settings: VoiceSettings) => void;
}

interface VoiceSettings {
  // Audio settings
  selectedMicrophone: string;
  selectedSpeaker: string;
  selectedCamera: string;
  microphoneVolume: number;
  speakerVolume: number;
  
  // Quality settings
  audioQuality: 'low' | 'medium' | 'high' | 'auto';
  videoQuality: 'low' | 'medium' | 'high' | 'auto';
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
  
  // Advanced settings
  speakingThreshold: number;
  silenceTimeout: number;
  enableSpeakingDetection: boolean;
  enableConnectionMonitoring: boolean;
  
  // UI settings
  showConnectionQuality: boolean;
  showSpeakingIndicators: boolean;
  enableNotifications: boolean;
  enableHoverTooltips: boolean;
}

const DEFAULT_SETTINGS: VoiceSettings = {
  selectedMicrophone: '',
  selectedSpeaker: '',
  selectedCamera: '',
  microphoneVolume: 100,
  speakerVolume: 100,
  audioQuality: 'auto',
  videoQuality: 'auto',
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  speakingThreshold: 50,
  silenceTimeout: 1000,
  enableSpeakingDetection: true,
  enableConnectionMonitoring: true,
  showConnectionQuality: true,
  showSpeakingIndicators: true,
  enableNotifications: true,
  enableHoverTooltips: true,
};

const VoiceSettingsPanel: React.FC<VoiceSettingsProps> = ({ isOpen, onClose, onSave }) => {
  const { user } = useUser();
  const performance = useVoicePerformance();
  const debugger = useVoiceDebugger();
  
  // State management
  const [settings, setSettings] = useState<VoiceSettings>(DEFAULT_SETTINGS);
  const [devices, setDevices] = useState<{
    microphones: AudioDevice[];
    speakers: AudioDevice[];
    cameras: AudioDevice[];
  }>({ microphones: [], speakers: [], cameras: [] });
  
  const [testing, setTesting] = useState({
    microphone: false,
    speaker: false,
    camera: false,
  });
  
  const [testResults, setTestResults] = useState({
    microphoneLevel: 0,
    microphoneWorking: false,
    permissions: {
      microphone: 'prompt' as 'granted' | 'denied' | 'prompt',
      camera: 'prompt' as 'granted' | 'denied' | 'prompt',
      screen: 'prompt' as 'granted' | 'denied' | 'prompt',
    },
  });
  
  const [activeTab, setActiveTab] = useState<'audio' | 'video' | 'advanced' | 'debug'>('audio');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
    loadDevices();
    checkPermissions();
  }, [isOpen]);

  // Load settings from localStorage
  const loadSettings = () => {
    try {
      const savedSettings = localStorage.getItem('voxel-voice-settings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      }
    } catch (error) {
      console.error('Failed to load voice settings:', error);
    }
  };

  // Save settings to localStorage
  const saveSettings = () => {
    try {
      localStorage.setItem('voxel-voice-settings', JSON.stringify(settings));
      setHasUnsavedChanges(false);
      
      if (onSave) {
        onSave(settings);
      }
      
      toast.success('Voice settings saved successfully');
    } catch (error) {
      console.error('Failed to save voice settings:', error);
      toast.error('Failed to save settings');
    }
  };

  // Load available devices
  const loadDevices = async () => {
    try {
      const deviceManager = AudioDeviceManager.getInstance();
      const allDevices = await deviceManager.getDevices();
      
      setDevices({
        microphones: deviceManager.getMicrophones(),
        speakers: deviceManager.getSpeakers(),
        cameras: deviceManager.getCameras(),
      });
      
      // Load selected devices
      const selectedDevices = deviceManager.getSelectedDevices();
      setSettings(prev => ({
        ...prev,
        selectedMicrophone: selectedDevices.microphone,
        selectedSpeaker: selectedDevices.speaker,
        selectedCamera: selectedDevices.camera,
      }));
    } catch (error) {
      console.error('Failed to load devices:', error);
      toast.error('Failed to load audio devices');
    }
  };

  // Check permissions
  const checkPermissions = async () => {
    try {
      const permissionManager = VoicePermissionManager.getInstance();
      const permissions = await permissionManager.checkPermissions();
      
      setTestResults(prev => ({
        ...prev,
        permissions,
      }));
    } catch (error) {
      console.error('Failed to check permissions:', error);
    }
  };

  // Update setting and mark as changed
  const updateSetting = <K extends keyof VoiceSettings>(key: K, value: VoiceSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasUnsavedChanges(true);
  };

  // Test microphone
  const testMicrophone = async () => {
    if (testing.microphone) return;
    
    setTesting(prev => ({ ...prev, microphone: true }));
    
    try {
      const deviceManager = AudioDeviceManager.getInstance();
      const result = await deviceManager.testMicrophone(settings.selectedMicrophone);
      
      setTestResults(prev => ({
        ...prev,
        microphoneLevel: result.level,
        microphoneWorking: result.working,
      }));
      
      if (result.working) {
        toast.success('Microphone test successful!');
      } else {
        toast.warning('Microphone not detecting audio. Please speak or check your device.');
      }
    } catch (error) {
      console.error('Microphone test failed:', error);
      toast.error('Microphone test failed. Check permissions and device connection.');
    } finally {
      setTesting(prev => ({ ...prev, microphone: false }));
    }
  };

  // Test speaker
  const testSpeaker = async () => {
    if (testing.speaker) return;
    
    setTesting(prev => ({ ...prev, speaker: true }));
    
    try {
      // Play test sound
      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4 note
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.5);
      
      toast.success('Speaker test sound played!');
    } catch (error) {
      console.error('Speaker test failed:', error);
      toast.error('Speaker test failed');
    } finally {
      setTimeout(() => {
        setTesting(prev => ({ ...prev, speaker: false }));
      }, 600);
    }
  };

  // Test camera
  const testCamera = async () => {
    if (testing.camera) return;
    
    setTesting(prev => ({ ...prev, camera: true }));
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: settings.selectedCamera ? { exact: settings.selectedCamera } : undefined,
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });
      
      // Stop stream immediately after successful test
      stream.getTracks().forEach(track => track.stop());
      
      toast.success('Camera test successful!');
    } catch (error) {
      console.error('Camera test failed:', error);
      toast.error('Camera test failed. Check permissions and device connection.');
    } finally {
      setTesting(prev => ({ ...prev, camera: false }));
    }
  };

  // Request permission
  const requestPermission = async (type: 'microphone' | 'camera' | 'screen') => {
    try {
      const permissionManager = VoicePermissionManager.getInstance();
      let granted = false;
      
      switch (type) {
        case 'microphone':
          granted = await permissionManager.requestMicrophonePermission();
          break;
        case 'camera':
          granted = await permissionManager.requestCameraPermission();
          break;
        case 'screen':
          granted = await permissionManager.requestScreenPermission();
          break;
      }
      
      if (granted) {
        toast.success(`${type} permission granted!`);
        await checkPermissions();
        if (type === 'microphone' || type === 'camera') {
          await loadDevices();
        }
      } else {
        toast.error(`${type} permission denied. Please enable it in your browser settings.`);
      }
    } catch (error) {
      console.error(`Failed to request ${type} permission:`, error);
      toast.error(`Failed to request ${type} permission`);
    }
  };

  // Reset to defaults
  const resetToDefaults = () => {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      setSettings(DEFAULT_SETTINGS);
      setHasUnsavedChanges(true);
      toast.info('Settings reset to defaults');
    }
  };

  // Export settings
  const exportSettings = () => {
    try {
      const dataStr = JSON.stringify(settings, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `voxel-voice-settings-${user?.username || 'user'}-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      toast.success('Settings exported successfully');
    } catch (error) {
      console.error('Failed to export settings:', error);
      toast.error('Failed to export settings');
    }
  };

  // Import settings
  const importSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        setSettings({ ...DEFAULT_SETTINGS, ...imported });
        setHasUnsavedChanges(true);
        toast.success('Settings imported successfully');
      } catch (error) {
        console.error('Failed to import settings:', error);
        toast.error('Failed to import settings. Invalid file format.');
      }
    };
    reader.readAsText(file);
  };

  if (!isOpen) return null;

  const tabs = [
    { id: 'audio', label: 'Audio', icon: Mic },
    { id: 'video', label: 'Video', icon: Video },
    { id: 'advanced', label: 'Advanced', icon: Sliders },
    { id: 'debug', label: 'Debug', icon: TestTube },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm">
      <div className="fixed inset-4 bg-gray-900 rounded-lg border border-gray-700 flex flex-col max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <Settings className="h-6 w-6 text-blue-400" />
            <h2 className="text-xl font-bold text-white">Voice Settings</h2>
            {hasUnsavedChanges && (
              <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded">
                Unsaved changes
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={exportSettings}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded"
              title="Export settings"
            >
              <Download className="h-4 w-4" />
            </button>
            
            <label className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded cursor-pointer">
              <input
                type="file"
                accept=".json"
                onChange={importSettings}
                className="hidden"
              />
              <span title="Import settings">📁</span>
            </label>
            
            <button
              onClick={resetToDefaults}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded"
              title="Reset to defaults"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-500/10'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Audio Tab */}
          {activeTab === 'audio' && (
            <div className="space-y-6">
              {/* Permissions Status */}
              <div className="bg-gray-800/50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-4">Permissions</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex items-center justify-between p-3 bg-gray-800 rounded">
                    <div className="flex items-center space-x-2">
                      <Mic className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-white">Microphone</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {testResults.permissions.microphone === 'granted' ? (
                        <Check className="h-4 w-4 text-green-400" />
                      ) : testResults.permissions.microphone === 'denied' ? (
                        <X className="h-4 w-4 text-red-400" />
                      ) : (
                        <button
                          onClick={() => requestPermission('microphone')}
                          className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded"
                        >
                          Grant
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-gray-800 rounded">
                    <div className="flex items-center space-x-2">
                      <Camera className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-white">Camera</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {testResults.permissions.camera === 'granted' ? (
                        <Check className="h-4 w-4 text-green-400" />
                      ) : testResults.permissions.camera === 'denied' ? (
                        <X className="h-4 w-4 text-red-400" />
                      ) : (
                        <button
                          onClick={() => requestPermission('camera')}
                          className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded"
                        >
                          Grant
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-gray-800 rounded">
                    <div className="flex items-center space-x-2">
                      <Monitor className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-white">Screen Share</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {testResults.permissions.screen === 'granted' ? (
                        <Check className="h-4 w-4 text-green-400" />
                      ) : (
                        <button
                          onClick={() => requestPermission('screen')}
                          className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded"
                        >
                          Test
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Device Selection */}
              <div className="bg-gray-800/50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-4">Audio Devices</h3>
                
                {/* Microphone */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Microphone
                  </label>
                  <div className="flex items-center space-x-3">
                    <select
                      value={settings.selectedMicrophone}
                      onChange={(e) => updateSetting('selectedMicrophone', e.target.value)}
                      className="flex-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white"
                    >
                      <option value="">Default Microphone</option>
                      {devices.microphones.map((device) => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.label}
                        </option>
                      ))}
                    </select>
                    
                    <button
                      onClick={testMicrophone}
                      disabled={testing.microphone}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 text-white rounded transition-colors"
                    >
                      {testing.microphone ? 'Testing...' : 'Test'}
                    </button>
                  </div>
                  
                  {/* Microphone Level */}
                  {testResults.microphoneLevel > 0 && (
                    <div className="mt-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-400">Level:</span>
                        <div className="flex-1 bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-green-400 h-2 rounded-full transition-all duration-100"
                            style={{ width: `${testResults.microphoneLevel * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-400">
                          {Math.round(testResults.microphoneLevel * 100)}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Speaker */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Speaker
                  </label>
                  <div className="flex items-center space-x-3">
                    <select
                      value={settings.selectedSpeaker}
                      onChange={(e) => updateSetting('selectedSpeaker', e.target.value)}
                      className="flex-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white"
                    >
                      <option value="">Default Speaker</option>
                      {devices.speakers.map((device) => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.label}
                        </option>
                      ))}
                    </select>
                    
                    <button
                      onClick={testSpeaker}
                      disabled={testing.speaker}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 text-white rounded transition-colors"
                    >
                      {testing.speaker ? 'Playing...' : 'Test'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Volume Controls */}
              <div className="bg-gray-800/50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-4">Volume</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Microphone Volume: {settings.microphoneVolume}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="200"
                      value={settings.microphoneVolume}
                      onChange={(e) => updateSetting('microphoneVolume', parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Speaker Volume: {settings.speakerVolume}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="200"
                      value={settings.speakerVolume}
                      onChange={(e) => updateSetting('speakerVolume', parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Audio Processing */}
              <div className="bg-gray-800/50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-4">Audio Processing</h3>
                
                <div className="space-y-3">
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={settings.echoCancellation}
                      onChange={(e) => updateSetting('echoCancellation', e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-white">Echo Cancellation</span>
                    <Info className="h-4 w-4 text-gray-400" title="Reduces echo from speakers" />
                  </label>
                  
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={settings.noiseSuppression}
                      onChange={(e) => updateSetting('noiseSuppression', e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-white">Noise Suppression</span>
                    <Info className="h-4 w-4 text-gray-400" title="Reduces background noise" />
                  </label>
                  
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={settings.autoGainControl}
                      onChange={(e) => updateSetting('autoGainControl', e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-white">Auto Gain Control</span>
                    <Info className="h-4 w-4 text-gray-400" title="Automatically adjusts microphone volume" />
                  </label>
                </div>
              </div>
              
              {/* Audio Quality */}
              <div className="bg-gray-800/50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-4">Audio Quality</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Quality Setting
                  </label>
                  <select
                    value={settings.audioQuality}
                    onChange={(e) => updateSetting('audioQuality', e.target.value as any)}
                    className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white"
                  >
                    <option value="auto">Auto (Recommended)</option>
                    <option value="low">Low (32 kbps)</option>
                    <option value="medium">Medium (64 kbps)</option>
                    <option value="high">High (128 kbps)</option>
                  </select>
                  <p className="text-xs text-gray-400 mt-1">
                    Higher quality uses more bandwidth
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Video Tab */}
          {activeTab === 'video' && (
            <div className="space-y-6">
              {/* Camera Selection */}
              <div className="bg-gray-800/50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-4">Camera</h3>
                
                <div className="flex items-center space-x-3">
                  <select
                    value={settings.selectedCamera}
                    onChange={(e) => updateSetting('selectedCamera', e.target.value)}
                    className="flex-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white"
                  >
                    <option value="">Default Camera</option>
                    {devices.cameras.map((device) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label}
                      </option>
                    ))}
                  </select>
                  
                  <button
                    onClick={testCamera}
                    disabled={testing.camera}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 text-white rounded transition-colors"
                  >
                    {testing.camera ? 'Testing...' : 'Test'}
                  </button>
                </div>
              </div>

              {/* Video Quality */}
              <div className="bg-gray-800/50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-4">Video Quality</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Quality Setting
                  </label>
                  <select
                    value={settings.videoQuality}
                    onChange={(e) => updateSetting('videoQuality', e.target.value as any)}
                    className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white"
                  >
                    <option value="auto">Auto (Recommended)</option>
                    <option value="low">Low (480p)</option>
                    <option value="medium">Medium (720p)</option>
                    <option value="high">High (1080p)</option>
                  </select>
                  <p className="text-xs text-gray-400 mt-1">
                    Higher quality requires more processing power and bandwidth
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Advanced Tab */}
          {activeTab === 'advanced' && (
            <div className="space-y-6">
              {/* Speaking Detection */}
              <div className="bg-gray-800/50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-4">Speaking Detection</h3>
                
                <div className="space-y-4">
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={settings.enableSpeakingDetection}
                      onChange={(e) => updateSetting('enableSpeakingDetection', e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-white">Enable Speaking Detection</span>
                  </label>
                  
                  {settings.enableSpeakingDetection && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Speaking Threshold: {settings.speakingThreshold}%
                        </label>
                        <input
                          type="range"
                          min="10"
                          max="90"
                          value={settings.speakingThreshold}
                          onChange={(e) => updateSetting('speakingThreshold', parseInt(e.target.value))}
                          className="w-full"
                        />
                        <p className="text-xs text-gray-400 mt-1">
                          Lower values are more sensitive
                        </p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Silence Timeout: {settings.silenceTimeout}ms
                        </label>
                        <input
                          type="range"
                          min="500"
                          max="5000"
                          step="100"
                          value={settings.silenceTimeout}
                          onChange={(e) => updateSetting('silenceTimeout', parseInt(e.target.value))}
                          className="w-full"
                        />
                        <p className="text-xs text-gray-400 mt-1">
                          How long to wait before stopping speaking indicator
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Connection Monitoring */}
              <div className="bg-gray-800/50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-4">Connection Monitoring</h3>
                
                <div className="space-y-3">
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={settings.enableConnectionMonitoring}
                      onChange={(e) => updateSetting('enableConnectionMonitoring', e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-white">Enable Connection Monitoring</span>
                  </label>
                  
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={settings.showConnectionQuality}
                      onChange={(e) => updateSetting('showConnectionQuality', e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-white">Show Connection Quality Indicators</span>
                  </label>
                </div>
              </div>

              {/* UI Settings */}
              <div className="bg-gray-800/50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-4">Interface</h3>
                
                <div className="space-y-3">
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={settings.showSpeakingIndicators}
                      onChange={(e) => updateSetting('showSpeakingIndicators', e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-white">Show Speaking Indicators</span>
                  </label>
                  
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={settings.enableNotifications}
                      onChange={(e) => updateSetting('enableNotifications', e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-white">Enable Notifications</span>
                  </label>
                  
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={settings.enableHoverTooltips}
                      onChange={(e) => updateSetting('enableHoverTooltips', e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-white">Enable Hover Tooltips</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Debug Tab */}
          {activeTab === 'debug' && (
            <div className="space-y-6">
              {/* System Information */}
              <div className="bg-gray-800/50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-4">System Information</h3>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Browser:</span>
                    <span className="text-white ml-2">{navigator.userAgent.split(' ')[0]}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Platform:</span>
                    <span className="text-white ml-2">{navigator.platform}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">CPU Cores:</span>
                    <span className="text-white ml-2">{navigator.hardwareConcurrency || 'Unknown'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Language:</span>
                    <span className="text-white ml-2">{navigator.language}</span>
                  </div>
                </div>
              </div>

              {/* Browser Capabilities */}
              <div className="bg-gray-800/50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-4">Browser Capabilities</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(VoiceUtils.getBrowserCapabilities()).map(([feature, supported]) => (
                    <div key={feature} className="flex items-center justify-between">
                      <span className="text-gray-300 capitalize">{feature.replace(/([A-Z])/g, ' $1')}</span>
                      {supported ? (
                        <Check className="h-4 w-4 text-green-400" />
                      ) : (
                        <X className="h-4 w-4 text-red-400" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Debug Actions */}
              <div className="bg-gray-800/50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-4">Debug Actions</h3>
                
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => debugger.runDiagnostic()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded"
                  >
                    Run Full Diagnostic
                  </button>
                  
                  <button
                    onClick={() => {
                      const logs = debugger.exportLogs('txt');
                      navigator.clipboard.writeText(logs);
                      toast.success('Debug logs copied to clipboard');
                    }}
                    className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded"
                  >
                    Copy Debug Logs
                  </button>
                  
                  <button
                    onClick={() => debugger.clearLogs()}
                    className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded"
                  >
                    Clear Debug Logs
                  </button>
                  
                  <button
                    onClick={() => {
                      const memoryInfo = debugger.detectMemoryLeaks();
                      if (memoryInfo.suspected) {
                        toast.warning(`Memory leak suspected: ${memoryInfo.details.usedPercent.toFixed(1)}% heap used`);
                      } else {
                        toast.success('No memory leaks detected');
                      }
                    }}
                    className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded"
                  >
                    Check Memory Usage
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-700">
          <div className="text-sm text-gray-400">
            {hasUnsavedChanges && (
              <span className="flex items-center space-x-1 text-yellow-400">
                <AlertTriangle className="h-4 w-4" />
                <span>You have unsaved changes</span>
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
            >
              Cancel
            </button>
            
            <button
              onClick={saveSettings}
              disabled={!hasUnsavedChanges}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:text-gray-400 text-white rounded transition-colors"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceSettingsPanel;
