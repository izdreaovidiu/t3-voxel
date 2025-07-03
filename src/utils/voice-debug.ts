// src/utils/voice-debug.ts - Voice Channel Debugging Tools
import { ConnectionQualityAnalyzer, AudioDeviceManager } from './voice-utils';

export interface DebugLogEntry {
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  category: 'socket' | 'webrtc' | 'audio' | 'permission' | 'ui';
  message: string;
  data?: any;
  stackTrace?: string;
}

export interface PerformanceMetrics {
  socketLatency: number;
  webrtcSetupTime: number;
  audioProcessingLoad: number;
  memoryUsage: number;
  cpuUsage: number;
  activeConnections: number;
  droppedFrames: number;
  avgFrameRate: number;
}

export interface VoiceDebugState {
  isRecording: boolean;
  logs: DebugLogEntry[];
  metrics: PerformanceMetrics;
  sessionStart: Date;
  totalEvents: number;
  errorCount: number;
  warningCount: number;
}

export class VoiceDebugger {
  private static instance: VoiceDebugger;
  private state: VoiceDebugState;
  private metricsInterval: NodeJS.Timeout | null = null;
  private maxLogs = 5000; // Keep last 5000 log entries

  private constructor() {
    this.state = {
      isRecording: false,
      logs: [],
      metrics: {
        socketLatency: 0,
        webrtcSetupTime: 0,
        audioProcessingLoad: 0,
        memoryUsage: 0,
        cpuUsage: 0,
        activeConnections: 0,
        droppedFrames: 0,
        avgFrameRate: 0,
      },
      sessionStart: new Date(),
      totalEvents: 0,
      errorCount: 0,
      warningCount: 0,
    };

    // Start metrics collection if in development
    if (process.env.NODE_ENV === 'development') {
      this.startRecording();
    }
  }

  static getInstance(): VoiceDebugger {
    if (!VoiceDebugger.instance) {
      VoiceDebugger.instance = new VoiceDebugger();
    }
    return VoiceDebugger.instance;
  }

  startRecording(): void {
    if (this.state.isRecording) return;

    this.state.isRecording = true;
    this.state.sessionStart = new Date();
    this.log('info', 'debug', 'Voice debugging started');

    // Start metrics collection
    this.metricsInterval = setInterval(() => {
      this.collectMetrics();
    }, 1000);
  }

  stopRecording(): void {
    if (!this.state.isRecording) return;

    this.state.isRecording = false;
    this.log('info', 'debug', 'Voice debugging stopped');

    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }
  }

  log(level: DebugLogEntry['level'], category: DebugLogEntry['category'], message: string, data?: any): void {
    const entry: DebugLogEntry = {
      timestamp: new Date(),
      level,
      category,
      message,
      data: data ? JSON.parse(JSON.stringify(data)) : undefined, // Deep clone to avoid mutations
      stackTrace: level === 'error' ? new Error().stack : undefined,
    };

    this.state.logs.push(entry);
    this.state.totalEvents++;

    if (level === 'error') this.state.errorCount++;
    if (level === 'warn') this.state.warningCount++;

    // Keep only recent logs
    if (this.state.logs.length > this.maxLogs) {
      this.state.logs = this.state.logs.slice(-this.maxLogs);
    }

    // Console output in development
    if (process.env.NODE_ENV === 'development') {
      const logMethod = level === 'error' ? console.error : 
                       level === 'warn' ? console.warn : 
                       level === 'debug' ? console.debug : console.log;
      
      logMethod(`[VoiceDebug:${category}] ${message}`, data || '');
    }
  }

  private async collectMetrics(): Promise<void> {
    const metrics: Partial<PerformanceMetrics> = {};

    // Memory usage
    if ('memory' in performance) {
      const perfMemory = (performance as any).memory;
      metrics.memoryUsage = perfMemory.usedJSHeapSize / perfMemory.jsHeapSizeLimit;
    }

    // Active connections (would need WebRTC stats)
    metrics.activeConnections = this.countActiveConnections();

    // Update metrics
    this.state.metrics = { ...this.state.metrics, ...metrics };
  }

  private countActiveConnections(): number {
    // This would be connected to actual WebRTC peer connections
    // For now, return a placeholder
    return 0;
  }

  getState(): VoiceDebugState {
    return { ...this.state };
  }

  getLogs(filter?: {
    category?: DebugLogEntry['category'];
    level?: DebugLogEntry['level'];
    since?: Date;
    limit?: number;
  }): DebugLogEntry[] {
    let logs = [...this.state.logs];

    if (filter?.category) {
      logs = logs.filter(log => log.category === filter.category);
    }

    if (filter?.level) {
      logs = logs.filter(log => log.level === filter.level);
    }

    if (filter?.since) {
      logs = logs.filter(log => log.timestamp >= filter.since);
    }

    if (filter?.limit) {
      logs = logs.slice(-filter.limit);
    }

    return logs;
  }

  exportLogs(format: 'json' | 'csv' | 'txt' = 'json'): string {
    const logs = this.state.logs;

    switch (format) {
      case 'json':
        return JSON.stringify({
          session: {
            start: this.state.sessionStart,
            duration: Date.now() - this.state.sessionStart.getTime(),
            totalEvents: this.state.totalEvents,
            errorCount: this.state.errorCount,
            warningCount: this.state.warningCount,
          },
          logs,
          metrics: this.state.metrics,
        }, null, 2);

      case 'csv':
        const csvHeader = 'Timestamp,Level,Category,Message,Data\\n';
        const csvRows = logs.map(log => 
          `${log.timestamp.toISOString()},${log.level},${log.category},"${log.message}","${log.data ? JSON.stringify(log.data).replace(/"/g, '""') : ''}"`
        ).join('\\n');
        return csvHeader + csvRows;

      case 'txt':
        return logs.map(log => 
          `[${log.timestamp.toISOString()}] ${log.level.toUpperCase()}:${log.category} - ${log.message}${log.data ? ' | ' + JSON.stringify(log.data) : ''}`
        ).join('\\n');

      default:
        return this.exportLogs('json');
    }
  }

  clearLogs(): void {
    this.state.logs = [];
    this.state.totalEvents = 0;
    this.state.errorCount = 0;
    this.state.warningCount = 0;
    this.log('info', 'debug', 'Logs cleared');
  }

  // Diagnostic methods
  async runFullDiagnostic(): Promise<{
    permissions: any;
    devices: any;
    connection: any;
    audio: any;
    webrtc: any;
    performance: any;
  }> {
    this.log('info', 'debug', 'Running full diagnostic');

    const permissionManager = await import('./voice-utils').then(m => m.VoicePermissionManager.getInstance());
    const deviceManager = await import('./voice-utils').then(m => m.AudioDeviceManager.getInstance());
    const qualityAnalyzer = await import('./voice-utils').then(m => m.ConnectionQualityAnalyzer.getInstance());

    try {
      const [permissions, devices] = await Promise.all([
        permissionManager.checkPermissions(),
        deviceManager.getDevices(),
      ]);

      const diagnostic = {
        permissions,
        devices: {
          microphones: deviceManager.getMicrophones(),
          speakers: deviceManager.getSpeakers(),
          cameras: deviceManager.getCameras(),
          selected: deviceManager.getSelectedDevices(),
        },
        connection: {
          online: navigator.onLine,
          connectionType: (navigator as any).connection?.effectiveType || 'unknown',
          quality: qualityAnalyzer.getMetrics(),
        },
        audio: {
          contextSupported: !!(window.AudioContext || (window as any).webkitAudioContext),
          contextState: this.getAudioContextState(),
        },
        webrtc: {
          supported: !!window.RTCPeerConnection,
          protocols: this.getSupportedWebRTCProtocols(),
        },
        performance: {
          ...this.state.metrics,
          memory: this.getMemoryInfo(),
          timing: performance.getEntriesByType('navigation')[0],
        },
      };

      this.log('info', 'debug', 'Full diagnostic completed', diagnostic);
      return diagnostic;
    } catch (error) {
      this.log('error', 'debug', 'Diagnostic failed', error);
      throw error;
    }
  }

  private getAudioContextState(): string {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return 'not-supported';
      
      const context = new AudioContextClass();
      const state = context.state;
      context.close();
      return state;
    } catch (error) {
      return 'error';
    }
  }

  private getSupportedWebRTCProtocols(): string[] {
    const protocols: string[] = [];
    
    try {
      const pc = new RTCPeerConnection();
      
      // Check for supported codecs
      if (pc.getSenders) protocols.push('unified-plan');
      if (pc.addTransceiver) protocols.push('transceiver');
      if (pc.getStats) protocols.push('stats');
      
      pc.close();
    } catch (error) {
      this.log('warn', 'webrtc', 'Failed to check WebRTC protocols', error);
    }

    return protocols;
  }

  private getMemoryInfo(): any {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
        usedPercent: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
      };
    }
    return null;
  }

  // Performance monitoring
  startPerformanceMonitoring(): void {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      // Monitor WebRTC performance
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (entry.name.includes('webrtc') || entry.name.includes('getUserMedia')) {
            this.log('debug', 'performance', `Performance entry: ${entry.name}`, {
              duration: entry.duration,
              startTime: entry.startTime,
            });
          }
        });
      });

      try {
        observer.observe({ entryTypes: ['measure', 'navigation', 'resource'] });
      } catch (error) {
        this.log('warn', 'debug', 'Performance observer not supported', error);
      }
    }
  }

  // Memory leak detection
  detectMemoryLeaks(): {
    suspected: boolean;
    details: any;
  } {
    if (!('memory' in performance)) {
      return { suspected: false, details: null };
    }

    const memory = (performance as any).memory;
    const usedPercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
    
    const suspected = usedPercent > 80; // Suspect leak if using >80% of heap

    return {
      suspected,
      details: {
        usedPercent,
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
        logCount: this.state.logs.length,
      }
    };
  }

  // Connection analysis
  analyzeConnectionIssues(): {
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check recent error logs
    const recentErrors = this.getLogs({
      level: 'error',
      since: new Date(Date.now() - 60000), // Last minute
    });

    if (recentErrors.length > 5) {
      issues.push('High error rate detected');
      recommendations.push('Check network connection and reload the page');
    }

    // Check socket disconnections
    const socketErrors = this.getLogs({
      category: 'socket',
      level: 'error',
      since: new Date(Date.now() - 300000), // Last 5 minutes
    });

    if (socketErrors.length > 0) {
      issues.push('Socket connection issues detected');
      recommendations.push('Refresh the page or check your internet connection');
    }

    // Check WebRTC issues
    const webrtcErrors = this.getLogs({
      category: 'webrtc',
      level: 'error',
      since: new Date(Date.now() - 300000),
    });

    if (webrtcErrors.length > 0) {
      issues.push('WebRTC connection problems detected');
      recommendations.push('Try restarting your browser or disabling VPN/proxy');
    }

    // Check audio issues
    const audioErrors = this.getLogs({
      category: 'audio',
      level: 'error',
      since: new Date(Date.now() - 300000),
    });

    if (audioErrors.length > 0) {
      issues.push('Audio processing issues detected');
      recommendations.push('Check microphone permissions and device connections');
    }

    return { issues, recommendations };
  }
}

// Debug React Hook
export function useVoiceDebugger() {
  const debugger = VoiceDebugger.getInstance();
  
  return {
    log: debugger.log.bind(debugger),
    getState: debugger.getState.bind(debugger),
    getLogs: debugger.getLogs.bind(debugger),
    exportLogs: debugger.exportLogs.bind(debugger),
    clearLogs: debugger.clearLogs.bind(debugger),
    runDiagnostic: debugger.runFullDiagnostic.bind(debugger),
    analyzeConnection: debugger.analyzeConnectionIssues.bind(debugger),
    detectMemoryLeaks: debugger.detectMemoryLeaks.bind(debugger),
    startRecording: debugger.startRecording.bind(debugger),
    stopRecording: debugger.stopRecording.bind(debugger),
  };
}

// Debug UI Component
export const VoiceDebugPanel: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const debugger = useVoiceDebugger();
  const [state, setState] = React.useState(debugger.getState());
  const [selectedCategory, setSelectedCategory] = React.useState<DebugLogEntry['category'] | 'all'>('all');
  const [autoRefresh, setAutoRefresh] = React.useState(true);

  React.useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      if (autoRefresh) {
        setState(debugger.getState());
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, autoRefresh, debugger]);

  if (!isOpen) return null;

  const filteredLogs = selectedCategory === 'all' 
    ? debugger.getLogs({ limit: 100 })
    : debugger.getLogs({ category: selectedCategory, limit: 100 });

  const memoryLeak = debugger.detectMemoryLeaks();
  const connectionAnalysis = debugger.analyzeConnection();

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm">
      <div className="fixed right-4 top-4 bottom-4 w-96 bg-gray-900 rounded-lg border border-gray-700 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h3 className="text-lg font-bold text-white">Voice Debug Panel</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Stats */}
        <div className="p-4 border-b border-gray-700">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-400">Total Events</div>
              <div className="text-white font-mono">{state.totalEvents}</div>
            </div>
            <div>
              <div className="text-gray-400">Errors</div>
              <div className="text-red-400 font-mono">{state.errorCount}</div>
            </div>
            <div>
              <div className="text-gray-400">Warnings</div>
              <div className="text-yellow-400 font-mono">{state.warningCount}</div>
            </div>
            <div>
              <div className="text-gray-400">Session</div>
              <div className="text-green-400 font-mono">
                {Math.round((Date.now() - state.sessionStart.getTime()) / 1000)}s
              </div>
            </div>
          </div>

          {/* Memory leak warning */}
          {memoryLeak.suspected && (
            <div className="mt-4 p-2 bg-red-900/20 border border-red-500/30 rounded text-red-400 text-xs">
              ⚠️ Possible memory leak detected ({memoryLeak.details.usedPercent.toFixed(1)}% heap used)
            </div>
          )}

          {/* Connection issues */}
          {connectionAnalysis.issues.length > 0 && (
            <div className="mt-2 p-2 bg-yellow-900/20 border border-yellow-500/30 rounded text-yellow-400 text-xs">
              🔧 {connectionAnalysis.issues.join(', ')}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center space-x-2 mb-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as any)}
              className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm"
            >
              <option value="all">All Categories</option>
              <option value="socket">Socket</option>
              <option value="webrtc">WebRTC</option>
              <option value="audio">Audio</option>
              <option value="permission">Permission</option>
              <option value="ui">UI</option>
            </select>
            
            <label className="flex items-center space-x-1 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              <span>Auto-refresh</span>
            </label>
          </div>

          <div className="flex space-x-2">
            <button
              onClick={() => setState(debugger.getState())}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded"
            >
              Refresh
            </button>
            <button
              onClick={debugger.clearLogs}
              className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-sm rounded"
            >
              Clear
            </button>
            <button
              onClick={() => {
                const logs = debugger.exportLogs('txt');
                navigator.clipboard.writeText(logs);
              }}
              className="px-3 py-1 bg-green-600 hover:bg-green-500 text-white text-sm rounded"
            >
              Copy
            </button>
          </div>
        </div>

        {/* Logs */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {filteredLogs.map((log, index) => (
              <div
                key={index}
                className={`text-xs p-2 rounded font-mono ${
                  log.level === 'error' ? 'bg-red-900/20 text-red-300' :
                  log.level === 'warn' ? 'bg-yellow-900/20 text-yellow-300' :
                  log.level === 'debug' ? 'bg-gray-800/50 text-gray-400' :
                  'bg-gray-800/30 text-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold">
                    {log.level.toUpperCase()}:{log.category}
                  </span>
                  <span className="text-gray-500">
                    {log.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <div className="mt-1">{log.message}</div>
                {log.data && (
                  <div className="mt-1 text-gray-500">
                    {JSON.stringify(log.data, null, 2)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// React import for VoiceDebugPanel
import React from 'react';

// Global debug instance
export const voiceDebugger = VoiceDebugger.getInstance();

// Utility function to enable debug mode
export const enableVoiceDebugging = () => {
  voiceDebugger.startRecording();
  voiceDebugger.startPerformanceMonitoring();
  
  // Add global debug functions to window in development
  if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    (window as any).voiceDebug = {
      getState: () => voiceDebugger.getState(),
      getLogs: (filter?: any) => voiceDebugger.getLogs(filter),
      exportLogs: (format?: string) => voiceDebugger.exportLogs(format as any),
      runDiagnostic: () => voiceDebugger.runFullDiagnostic(),
      clearLogs: () => voiceDebugger.clearLogs(),
    };
    
    console.log('%c🎤 Voice debugging enabled. Use window.voiceDebug to access debug functions.', 
      'color: #22c55e; font-weight: bold;');
  }
};

// Auto-enable in development
if (process.env.NODE_ENV === 'development') {
  enableVoiceDebugging();
}
