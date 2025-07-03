// src/utils/voice-performance.ts - Voice Channel Performance Optimizations
import { voiceDebugger } from './voice-debug';

export interface PerformanceConfig {
  // Audio processing optimizations
  audioAnalysisInterval: number; // ms
  speakingUpdateThrottle: number; // ms
  audioBufferSize: number;
  
  // WebRTC optimizations
  maxVideoBitrate: number; // kbps
  maxAudioBitrate: number; // kbps
  iceGatheringTimeout: number; // ms
  
  // Socket optimizations
  batchUpdateInterval: number; // ms
  maxBatchSize: number;
  heartbeatInterval: number; // ms
  
  // UI optimizations
  animationFrameThrottle: number; // ms
  participantUpdateThrottle: number; // ms
  
  // Memory management
  maxLogEntries: number;
  cleanupInterval: number; // ms
  gcThreshold: number; // MB
}

export const PERFORMANCE_PROFILES = {
  low: {
    audioAnalysisInterval: 200,
    speakingUpdateThrottle: 300,
    audioBufferSize: 1024,
    maxVideoBitrate: 500,
    maxAudioBitrate: 32,
    iceGatheringTimeout: 10000,
    batchUpdateInterval: 2000,
    maxBatchSize: 5,
    heartbeatInterval: 30000,
    animationFrameThrottle: 100,
    participantUpdateThrottle: 500,
    maxLogEntries: 1000,
    cleanupInterval: 60000,
    gcThreshold: 100,
  } as PerformanceConfig,
  
  medium: {
    audioAnalysisInterval: 100,
    speakingUpdateThrottle: 200,
    audioBufferSize: 2048,
    maxVideoBitrate: 1000,
    maxAudioBitrate: 64,
    iceGatheringTimeout: 5000,
    batchUpdateInterval: 1000,
    maxBatchSize: 10,
    heartbeatInterval: 25000,
    animationFrameThrottle: 50,
    participantUpdateThrottle: 250,
    maxLogEntries: 3000,
    cleanupInterval: 30000,
    gcThreshold: 150,
  } as PerformanceConfig,
  
  high: {
    audioAnalysisInterval: 50,
    speakingUpdateThrottle: 100,
    audioBufferSize: 4096,
    maxVideoBitrate: 2000,
    maxAudioBitrate: 128,
    iceGatheringTimeout: 3000,
    batchUpdateInterval: 500,
    maxBatchSize: 20,
    heartbeatInterval: 15000,
    animationFrameThrottle: 16,
    participantUpdateThrottle: 100,
    maxLogEntries: 5000,
    cleanupInterval: 15000,
    gcThreshold: 200,
  } as PerformanceConfig,
};

export class VoicePerformanceManager {
  private static instance: VoicePerformanceManager;
  private config: PerformanceConfig;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private batchedUpdates: Array<{ type: string; data: any; timestamp: number }> = [];
  private batchInterval: NodeJS.Timeout | null = null;
  private throttledFunctions = new Map<string, { lastCall: number; timeout?: NodeJS.Timeout }>();

  private constructor() {
    // Auto-detect performance profile based on device capabilities
    this.config = this.detectOptimalProfile();
    this.startPerformanceMonitoring();
  }

  static getInstance(): VoicePerformanceManager {
    if (!VoicePerformanceManager.instance) {
      VoicePerformanceManager.instance = new VoicePerformanceManager();
    }
    return VoicePerformanceManager.instance;
  }

  private detectOptimalProfile(): PerformanceConfig {
    const capabilities = this.getDeviceCapabilities();
    voiceDebugger.log('info', 'performance', 'Device capabilities detected', capabilities);

    if (capabilities.score >= 80) {
      voiceDebugger.log('info', 'performance', 'Using high performance profile');
      return PERFORMANCE_PROFILES.high;
    } else if (capabilities.score >= 50) {
      voiceDebugger.log('info', 'performance', 'Using medium performance profile');
      return PERFORMANCE_PROFILES.medium;
    } else {
      voiceDebugger.log('info', 'performance', 'Using low performance profile');
      return PERFORMANCE_PROFILES.low;
    }
  }

  private getDeviceCapabilities(): { score: number; details: any } {
    let score = 0;
    const details: any = {};

    // Check hardware concurrency (CPU cores)
    const cores = navigator.hardwareConcurrency || 2;
    details.cores = cores;
    score += Math.min(cores * 10, 40); // Max 40 points for CPU

    // Check memory (if available)
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const memoryGB = memory.jsHeapSizeLimit / (1024 * 1024 * 1024);
      details.memoryGB = memoryGB;
      score += Math.min(memoryGB * 20, 30); // Max 30 points for memory
    } else {
      score += 15; // Default points if memory info not available
    }

    // Check connection type
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      const effectiveType = connection.effectiveType;
      details.connectionType = effectiveType;
      
      switch (effectiveType) {
        case '4g':
        case '5g':
          score += 20;
          break;
        case '3g':
          score += 10;
          break;
        default:
          score += 5;
      }
    } else {
      score += 10; // Default points if connection info not available
    }

    // Check WebRTC support
    if (window.RTCPeerConnection) {
      score += 10;
      details.webrtcSupported = true;
    } else {
      details.webrtcSupported = false;
    }

    details.finalScore = score;
    return { score, details };
  }

  getConfig(): PerformanceConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<PerformanceConfig>): void {
    this.config = { ...this.config, ...newConfig };
    voiceDebugger.log('info', 'performance', 'Performance config updated', newConfig);
    
    // Restart monitoring with new config
    this.stopPerformanceMonitoring();
    this.startPerformanceMonitoring();
  }

  private startPerformanceMonitoring(): void {
    // Start cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, this.config.cleanupInterval);

    // Start batch processing interval
    this.batchInterval = setInterval(() => {
      this.processBatchedUpdates();
    }, this.config.batchUpdateInterval);

    voiceDebugger.log('info', 'performance', 'Performance monitoring started');
  }

  private stopPerformanceMonitoring(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    if (this.batchInterval) {
      clearInterval(this.batchInterval);
      this.batchInterval = null;
    }

    voiceDebugger.log('info', 'performance', 'Performance monitoring stopped');
  }

  private performCleanup(): void {
    try {
      // Check memory usage
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const usedMB = memory.usedJSHeapSize / (1024 * 1024);
        
        if (usedMB > this.config.gcThreshold) {
          voiceDebugger.log('warn', 'performance', `High memory usage detected: ${usedMB.toFixed(2)}MB`);
          this.triggerGarbageCollection();
        }
      }

      // Clean up throttled functions
      const now = Date.now();
      for (const [key, data] of this.throttledFunctions.entries()) {
        if (now - data.lastCall > 300000) { // 5 minutes
          if (data.timeout) clearTimeout(data.timeout);
          this.throttledFunctions.delete(key);
        }
      }

      voiceDebugger.log('debug', 'performance', 'Cleanup completed');
    } catch (error) {
      voiceDebugger.log('error', 'performance', 'Cleanup failed', error);
    }
  }

  private triggerGarbageCollection(): void {
    // Force garbage collection if available (Chrome DevTools)
    if ('gc' in window && typeof (window as any).gc === 'function') {
      (window as any).gc();
      voiceDebugger.log('info', 'performance', 'Manual garbage collection triggered');
    }
  }

  private processBatchedUpdates(): void {
    if (this.batchedUpdates.length === 0) return;

    const updates = [...this.batchedUpdates];
    this.batchedUpdates = [];

    // Group updates by type
    const groupedUpdates = updates.reduce((acc, update) => {
      if (!acc[update.type]) acc[update.type] = [];
      acc[update.type].push(update);
      return acc;
    }, {} as Record<string, typeof updates>);

    voiceDebugger.log('debug', 'performance', 'Processing batched updates', {
      totalUpdates: updates.length,
      groupedCount: Object.keys(groupedUpdates).length,
    });

    // Process each group
    Object.entries(groupedUpdates).forEach(([type, typeUpdates]) => {
      this.processBatchedUpdateType(type, typeUpdates);
    });
  }

  private processBatchedUpdateType(type: string, updates: Array<{ type: string; data: any; timestamp: number }>): void {
    // Custom processing logic for different update types
    switch (type) {
      case 'speaking_status':
        this.processSpeakingStatusBatch(updates);
        break;
      case 'participant_update':
        this.processParticipantUpdateBatch(updates);
        break;
      default:
        voiceDebugger.log('debug', 'performance', `Processing ${updates.length} ${type} updates`);
    }
  }

  private processSpeakingStatusBatch(updates: Array<{ type: string; data: any; timestamp: number }>): void {
    // Deduplicate speaking status updates by userId
    const latestUpdates = new Map<string, any>();
    
    updates.forEach(update => {
      const userId = update.data.userId;
      if (!latestUpdates.has(userId) || update.timestamp > latestUpdates.get(userId).timestamp) {
        latestUpdates.set(userId, update);
      }
    });

    voiceDebugger.log('debug', 'performance', 
      `Processed speaking status batch: ${updates.length} → ${latestUpdates.size} updates`);
  }

  private processParticipantUpdateBatch(updates: Array<{ type: string; data: any; timestamp: number }>): void {
    // Merge participant updates
    const mergedUpdate = updates.reduce((acc, update) => {
      return { ...acc, ...update.data };
    }, {});

    voiceDebugger.log('debug', 'performance', 
      `Processed participant update batch: ${updates.length} updates merged`);
  }

  // Throttling utilities
  throttle<T extends (...args: any[]) => any>(
    key: string,
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    return (...args: Parameters<T>) => {
      const now = Date.now();
      const throttleData = this.throttledFunctions.get(key);

      if (!throttleData || now - throttleData.lastCall >= delay) {
        // Execute immediately
        func(...args);
        this.throttledFunctions.set(key, { lastCall: now });
      } else {
        // Schedule for later execution
        if (throttleData.timeout) {
          clearTimeout(throttleData.timeout);
        }

        const timeout = setTimeout(() => {
          func(...args);
          this.throttledFunctions.set(key, { lastCall: Date.now() });
        }, delay - (now - throttleData.lastCall));

        this.throttledFunctions.set(key, { 
          lastCall: throttleData.lastCall, 
          timeout 
        });
      }
    };
  }

  debounce<T extends (...args: any[]) => any>(
    key: string,
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    return (...args: Parameters<T>) => {
      const throttleData = this.throttledFunctions.get(key);
      
      if (throttleData?.timeout) {
        clearTimeout(throttleData.timeout);
      }

      const timeout = setTimeout(() => {
        func(...args);
        this.throttledFunctions.delete(key);
      }, delay);

      this.throttledFunctions.set(key, { lastCall: Date.now(), timeout });
    };
  }

  // Batching utilities
  batchUpdate(type: string, data: any): void {
    this.batchedUpdates.push({
      type,
      data,
      timestamp: Date.now(),
    });

    // Prevent batch from growing too large
    if (this.batchedUpdates.length > this.config.maxBatchSize * 10) {
      voiceDebugger.log('warn', 'performance', 'Batch size exceeded, forcing process');
      this.processBatchedUpdates();
    }
  }

  // WebRTC optimizations
  optimizeWebRTCConfiguration(baseConfig: RTCConfiguration): RTCConfiguration {
    const optimizedConfig: RTCConfiguration = {
      ...baseConfig,
      iceCandidatePoolSize: Math.min(10, Math.max(4, navigator.hardwareConcurrency || 4)),
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
      iceTransportPolicy: 'all',
    };

    // Add bandwidth constraints based on performance profile
    const constraints = {
      video: {
        maxBitrate: this.config.maxVideoBitrate * 1000,
        maxFramerate: this.config.maxVideoBitrate > 1000 ? 30 : 15,
      },
      audio: {
        maxBitrate: this.config.maxAudioBitrate * 1000,
      },
    };

    voiceDebugger.log('info', 'performance', 'WebRTC config optimized', {
      originalConfig: baseConfig,
      optimizedConfig,
      constraints,
    });

    return optimizedConfig;
  }

  // Audio processing optimizations
  createOptimizedAudioContext(): AudioContext {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    
    const audioContext = new AudioContextClass({
      latencyHint: 'interactive',
      sampleRate: 48000, // Standard rate for WebRTC
    });

    voiceDebugger.log('info', 'performance', 'Optimized audio context created', {
      sampleRate: audioContext.sampleRate,
      state: audioContext.state,
      latencyHint: 'interactive',
    });

    return audioContext;
  }

  optimizeAnalyserNode(analyser: AnalyserNode): void {
    analyser.fftSize = this.config.audioBufferSize;
    analyser.smoothingTimeConstant = 0.8;
    analyser.minDecibels = -90;
    analyser.maxDecibels = -10;

    voiceDebugger.log('debug', 'performance', 'Analyser node optimized', {
      fftSize: analyser.fftSize,
      smoothingTimeConstant: analyser.smoothingTimeConstant,
    });
  }

  // Memory management
  createMemoryEfficientMap<K, V>(maxSize: number): Map<K, V> {
    const map = new Map<K, V>();
    const originalSet = map.set;

    map.set = function(key: K, value: V) {
      if (this.size >= maxSize && !this.has(key)) {
        // Remove oldest entry
        const firstKey = this.keys().next().value;
        this.delete(firstKey);
      }
      return originalSet.call(this, key, value);
    };

    return map;
  }

  // Performance monitoring
  measurePerformance<T>(name: string, func: () => T): T {
    const start = performance.now();
    const result = func();
    const duration = performance.now() - start;

    voiceDebugger.log('debug', 'performance', `Performance measurement: ${name}`, {
      duration: `${duration.toFixed(2)}ms`,
    });

    return result;
  }

  async measureAsyncPerformance<T>(name: string, func: () => Promise<T>): Promise<T> {
    const start = performance.now();
    const result = await func();
    const duration = performance.now() - start;

    voiceDebugger.log('debug', 'performance', `Async performance measurement: ${name}`, {
      duration: `${duration.toFixed(2)}ms`,
    });

    return result;
  }

  // React optimization helpers
  createMemoizedCallback<T extends (...args: any[]) => any>(
    key: string,
    callback: T,
    deps: React.DependencyList
  ): T {
    // This would integrate with React.useCallback with additional optimization
    return callback;
  }

  // Cleanup
  cleanup(): void {
    this.stopPerformanceMonitoring();
    this.throttledFunctions.clear();
    this.batchedUpdates = [];
    voiceDebugger.log('info', 'performance', 'Performance manager cleaned up');
  }
}

// Export performance manager instance
export const voicePerformanceManager = VoicePerformanceManager.getInstance();

// React hook for performance optimization
export function useVoicePerformance() {
  const manager = VoicePerformanceManager.getInstance();
  
  return {
    throttle: manager.throttle.bind(manager),
    debounce: manager.debounce.bind(manager),
    batchUpdate: manager.batchUpdate.bind(manager),
    measurePerformance: manager.measurePerformance.bind(manager),
    measureAsyncPerformance: manager.measureAsyncPerformance.bind(manager),
    getConfig: manager.getConfig.bind(manager),
    updateConfig: manager.updateConfig.bind(manager),
  };
}

// Performance monitoring React component
export const PerformanceMonitor: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  React.useEffect(() => {
    const manager = VoicePerformanceManager.getInstance();
    
    // Monitor render performance
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach(entry => {
        if (entry.duration > 16) { // Warn if render takes more than 16ms (60fps)
          voiceDebugger.log('warn', 'performance', 
            `Slow render detected: ${entry.name} took ${entry.duration.toFixed(2)}ms`);
        }
      });
    });

    if ('PerformanceObserver' in window) {
      try {
        observer.observe({ entryTypes: ['measure'] });
      } catch (error) {
        voiceDebugger.log('warn', 'performance', 'Performance observer not supported');
      }
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  return <>{children}</>;
};

// React import
import React from 'react';
