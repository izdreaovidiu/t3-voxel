# Voice Channels Deployment Configuration

## 🚀 Production Deployment Guide

### Environment Variables

```bash
# .env.production
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/voxel_prod"

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_live_..."
CLERK_SECRET_KEY="sk_live_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/"

# Voice Channels Configuration
NEXT_PUBLIC_SOCKET_URL="https://your-domain.com"
NEXT_PUBLIC_ENABLE_VOICE_CHANNELS=true
NEXT_PUBLIC_MAX_VOICE_PARTICIPANTS=20
NEXT_PUBLIC_VOICE_QUALITY_DEFAULT="medium"

# WebRTC Configuration
NEXT_PUBLIC_STUN_SERVERS="stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302"
NEXT_PUBLIC_TURN_SERVER="turn:your-turn-server.com:3478"
NEXT_PUBLIC_TURN_USERNAME="your-turn-username"
NEXT_PUBLIC_TURN_PASSWORD="your-turn-password"

# Performance Settings
NEXT_PUBLIC_AUDIO_ANALYSIS_INTERVAL=100
NEXT_PUBLIC_SPEAKING_UPDATE_THROTTLE=200
NEXT_PUBLIC_BATCH_UPDATE_INTERVAL=1000
NEXT_PUBLIC_DEBUG_MODE=false

# Monitoring
NEXT_PUBLIC_ANALYTICS_ENABLED=true
NEXT_PUBLIC_ERROR_REPORTING_ENABLED=true
NEXT_PUBLIC_PERFORMANCE_MONITORING=true

# Security
NEXT_PUBLIC_ENABLE_RATE_LIMITING=true
NEXT_PUBLIC_MAX_CONCURRENT_CONNECTIONS=1000
NEXT_PUBLIC_SESSION_TIMEOUT=3600000
```

### Docker Configuration

```dockerfile
# Dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then yarn global add pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/voxel
      - NEXTAUTH_URL=http://localhost:3000
      - NEXTAUTH_SECRET=your-secret-key
    depends_on:
      - db
      - redis
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=voxel
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

### Nginx Configuration

```nginx
# nginx.conf
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:3000;
    }

    # WebSocket upgrade configuration
    map $http_upgrade $connection_upgrade {
        default upgrade;
        '' close;
    }

    server {
        listen 80;
        server_name your-domain.com;
        
        # Redirect HTTP to HTTPS
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name your-domain.com;

        # SSL Configuration
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;

        # WebSocket and Socket.IO configuration
        location /api/socket/io/ {
            proxy_pass http://app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection $connection_upgrade;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
            
            # WebSocket timeout settings
            proxy_read_timeout 86400;
            proxy_send_timeout 86400;
            proxy_connect_timeout 86400;
        }

        # Regular HTTP routes
        location / {
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # Enable compression
            gzip on;
            gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
        }

        # Static file caching
        location /_next/static/ {
            proxy_pass http://app;
            proxy_cache_valid 200 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

## 📱 Mobile Optimization

### Mobile-Specific Configuration

```typescript
// src/utils/mobile-optimization.ts
export const isMobile = () => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

export const getMobileOptimizedConfig = () => {
  const mobile = isMobile();
  
  return {
    // Reduced performance settings for mobile
    audioAnalysisInterval: mobile ? 200 : 100,
    speakingUpdateThrottle: mobile ? 500 : 200,
    audioBufferSize: mobile ? 1024 : 2048,
    maxVideoBitrate: mobile ? 500 : 1000,
    maxAudioBitrate: mobile ? 32 : 64,
    maxParticipants: mobile ? 8 : 20,
    
    // Mobile-specific features
    enableLowPowerMode: mobile,
    reduceAnimations: mobile,
    simplifyUI: mobile,
    
    // Touch-optimized settings
    touchTargetSize: mobile ? 48 : 32,
    gestureTimeout: mobile ? 300 : 200,
  };
};

export class MobileVoiceOptimizer {
  private static instance: MobileVoiceOptimizer;
  private isMobileDevice: boolean;
  private batteryLevel: number = 1;
  private isLowPowerMode: boolean = false;

  static getInstance(): MobileVoiceOptimizer {
    if (!MobileVoiceOptimizer.instance) {
      MobileVoiceOptimizer.instance = new MobileVoiceOptimizer();
    }
    return MobileVoiceOptimizer.instance;
  }

  constructor() {
    this.isMobileDevice = isMobile();
    this.initBatteryMonitoring();
  }

  private async initBatteryMonitoring() {
    if ('getBattery' in navigator) {
      try {
        const battery = await (navigator as any).getBattery();
        this.batteryLevel = battery.level;
        this.isLowPowerMode = battery.level < 0.2;

        battery.addEventListener('levelchange', () => {
          this.batteryLevel = battery.level;
          this.isLowPowerMode = battery.level < 0.2;
          this.adjustSettingsForBattery();
        });
      } catch (error) {
        console.log('Battery API not supported');
      }
    }
  }

  private adjustSettingsForBattery() {
    if (this.isLowPowerMode) {
      // Reduce performance settings
      this.enableLowPowerMode();
    }
  }

  private enableLowPowerMode() {
    // Implement low power mode optimizations
    console.log('Enabling low power mode for voice channels');
  }

  getOptimizedSettings() {
    const baseConfig = getMobileOptimizedConfig();
    
    if (this.isLowPowerMode) {
      return {
        ...baseConfig,
        audioAnalysisInterval: 500,
        speakingUpdateThrottle: 1000,
        maxVideoBitrate: 250,
        maxAudioBitrate: 24,
        enableVideoByDefault: false,
        reduceAnimations: true,
      };
    }
    
    return baseConfig;
  }
}
```

### Mobile UI Adaptations

```typescript
// src/components/mobile/MobileVoiceInterface.tsx
import React, { useState, useEffect } from 'react';
import { isMobile } from '~/utils/mobile-optimization';

interface MobileVoiceInterfaceProps {
  // ... existing props
}

const MobileVoiceInterface: React.FC<MobileVoiceInterfaceProps> = (props) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

  useEffect(() => {
    const handleOrientationChange = () => {
      setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape');
    };

    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', handleOrientationChange);
    
    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', handleOrientationChange);
    };
  }, []);

  const enterFullscreen = async () => {
    if (document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    }
  };

  const exitFullscreen = async () => {
    if (document.exitFullscreen) {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  if (!isMobile()) {
    return null; // Use desktop interface
  }

  return (
    <div className={`mobile-voice-interface ${orientation}`}>
      {/* Mobile-optimized voice interface */}
      <div className="mobile-voice-controls">
        {/* Touch-friendly buttons */}
        <button 
          className="mobile-voice-button"
          style={{ minHeight: '48px', minWidth: '48px' }}
          onTouchStart={(e) => e.preventDefault()}
        >
          {/* Button content */}
        </button>
      </div>
      
      {/* Fullscreen toggle for better mobile experience */}
      <button 
        onClick={isFullscreen ? exitFullscreen : enterFullscreen}
        className="fullscreen-toggle"
      >
        {isFullscreen ? '⤌' : '⤢'}
      </button>
    </div>
  );
};

export default MobileVoiceInterface;
```

### Performance Monitoring

```typescript
// src/utils/performance-monitoring.ts
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  recordMetric(name: string, value: number) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    const values = this.metrics.get(name)!;
    values.push(value);
    
    // Keep only last 100 values
    if (values.length > 100) {
      values.shift();
    }
  }

  getMetrics() {
    const result: Record<string, any> = {};
    
    for (const [name, values] of this.metrics.entries()) {
      result[name] = {
        current: values[values.length - 1] || 0,
        average: values.reduce((a, b) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        count: values.length,
      };
    }
    
    return result;
  }

  // Monitor WebRTC performance
  monitorWebRTCStats(peerConnection: RTCPeerConnection) {
    const interval = setInterval(async () => {
      const stats = await peerConnection.getStats();
      
      stats.forEach((report) => {
        if (report.type === 'inbound-rtp' && report.kind === 'audio') {
          this.recordMetric('audio-packets-received', report.packetsReceived || 0);
          this.recordMetric('audio-packets-lost', report.packetsLost || 0);
          this.recordMetric('audio-jitter', report.jitter || 0);
        }
        
        if (report.type === 'inbound-rtp' && report.kind === 'video') {
          this.recordMetric('video-packets-received', report.packetsReceived || 0);
          this.recordMetric('video-packets-lost', report.packetsLost || 0);
          this.recordMetric('video-frames-decoded', report.framesDecoded || 0);
        }
      });
    }, 5000);

    return () => clearInterval(interval);
  }
}
```

### Security Configuration

```typescript
// src/utils/security.ts
export class VoiceSecurityManager {
  private static instance: VoiceSecurityManager;
  private rateLimiter = new Map<string, number[]>();

  static getInstance(): VoiceSecurityManager {
    if (!VoiceSecurityManager.instance) {
      VoiceSecurityManager.instance = new VoiceSecurityManager();
    }
    return VoiceSecurityManager.instance;
  }

  // Rate limiting for voice events
  checkRateLimit(userId: string, action: string, limit: number = 10, window: number = 60000): boolean {
    const key = `${userId}:${action}`;
    const now = Date.now();
    
    if (!this.rateLimiter.has(key)) {
      this.rateLimiter.set(key, []);
    }
    
    const timestamps = this.rateLimiter.get(key)!;
    
    // Remove old timestamps outside the window
    const filtered = timestamps.filter(ts => now - ts < window);
    
    if (filtered.length >= limit) {
      return false; // Rate limit exceeded
    }
    
    filtered.push(now);
    this.rateLimiter.set(key, filtered);
    
    return true;
  }

  // Validate voice channel permissions
  validateChannelPermission(userId: string, channelId: string, action: string): boolean {
    // Implement permission validation logic
    return true;
  }

  // Sanitize voice data
  sanitizeVoiceData(data: any): any {
    // Remove sensitive information
    const sanitized = { ...data };
    delete sanitized.ipAddress;
    delete sanitized.userAgent;
    delete sanitized.deviceId;
    
    return sanitized;
  }
}
```

## 🔍 Monitoring și Analytics

### Analytics Setup

```typescript
// src/utils/voice-analytics.ts
export class VoiceAnalytics {
  private static instance: VoiceAnalytics;
  private events: Array<{
    event: string;
    data: any;
    timestamp: number;
    userId?: string;
    channelId?: string;
  }> = [];

  static getInstance(): VoiceAnalytics {
    if (!VoiceAnalytics.instance) {
      VoiceAnalytics.instance = new VoiceAnalytics();
    }
    return VoiceAnalytics.instance;
  }

  track(event: string, data: any, userId?: string, channelId?: string) {
    this.events.push({
      event,
      data,
      timestamp: Date.now(),
      userId,
      channelId,
    });

    // Send to analytics service
    this.sendToAnalytics(event, data, userId, channelId);
  }

  private async sendToAnalytics(event: string, data: any, userId?: string, channelId?: string) {
    try {
      await fetch('/api/analytics/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event,
          data,
          userId,
          channelId,
          timestamp: Date.now(),
        }),
      });
    } catch (error) {
      console.error('Failed to send analytics:', error);
    }
  }

  // Common voice events
  trackVoiceJoin(channelId: string, userId: string) {
    this.track('voice_join', { channelId }, userId, channelId);
  }

  trackVoiceLeave(channelId: string, userId: string, duration: number) {
    this.track('voice_leave', { channelId, duration }, userId, channelId);
  }

  trackSpeakingTime(channelId: string, userId: string, speakingTime: number) {
    this.track('speaking_time', { speakingTime }, userId, channelId);
  }

  trackConnectionQuality(channelId: string, userId: string, quality: string) {
    this.track('connection_quality', { quality }, userId, channelId);
  }

  trackError(error: string, channelId?: string, userId?: string) {
    this.track('voice_error', { error }, userId, channelId);
  }
}
```

### Health Check Endpoint

```typescript
// src/pages/api/health/voice.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { voicePerformanceManager } from '~/utils/voice-performance';
import { getAllVoiceStats } from '~/server/socket/enhanced-socket-server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const stats = getAllVoiceStats();
    const performance = voicePerformanceManager.getConfig();
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      voice: {
        activeChannels: stats.length,
        totalParticipants: stats.reduce((sum, channel) => sum + channel.participantCount, 0),
        avgConnectionQuality: stats.reduce((sum, channel) => sum + channel.avgConnectionQuality, 0) / stats.length || 0,
      },
      performance,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };

    res.status(200).json(health);
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
}
```

## 🚀 Deployment Checklist

### Pre-deployment
- [ ] Configure environment variables
- [ ] Set up TURN servers
- [ ] Configure SSL certificates
- [ ] Set up database with voice schema
- [ ] Configure Redis for session storage
- [ ] Set up monitoring and logging
- [ ] Configure CDN for static assets
- [ ] Set up backup strategies

### Production Deployment
- [ ] Deploy with Docker Compose
- [ ] Configure Nginx with WebSocket support
- [ ] Set up SSL/TLS termination
- [ ] Configure rate limiting
- [ ] Set up health checks
- [ ] Configure auto-scaling
- [ ] Set up monitoring alerts
- [ ] Test voice channels functionality

### Post-deployment
- [ ] Monitor performance metrics
- [ ] Check error logs
- [ ] Verify WebRTC connections
- [ ] Test from different networks
- [ ] Monitor resource usage
- [ ] Set up analytics dashboards
- [ ] Create backup and recovery procedures
- [ ] Document operational procedures

## 📊 Performance Benchmarks

### Target Metrics
- **WebRTC Setup Time**: < 3 seconds
- **Audio Latency**: < 100ms
- **Speaking Detection**: < 50ms response time
- **Memory Usage**: < 100MB for 20 participants
- **CPU Usage**: < 50% on modern hardware
- **Connection Success Rate**: > 98%
- **Reconnection Time**: < 5 seconds

### Monitoring Alerts
- Voice channel errors > 5%
- Average latency > 200ms
- Connection failures > 2%
- Memory usage > 80%
- CPU usage > 90%
- Disk space < 10%
