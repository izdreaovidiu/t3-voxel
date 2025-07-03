// src/pages/api/socket/io.ts - ENHANCED VERSION
import { NextApiRequest } from 'next';
import { initializeEnhancedSocket, type NextApiResponseServerIO } from '~/server/socket/enhanced-socket-server';

export default function handler(req: NextApiRequest, res: NextApiResponseServerIO) {
  if (req.method === 'POST') {
    // Initialize Enhanced Socket.IO server
    const io = initializeEnhancedSocket(req, res);
    
    // Store global reference for voice features
    global.io = io;
    
    console.log('🚀 Enhanced Socket.IO server initialized with voice features');
    res.status(200).json({ 
      success: true, 
      message: 'Enhanced Socket.IO server started',
      features: {
        voiceChannels: true,
        speakingDetection: true,
        connectionMonitoring: true,
        enhancedSignaling: true,
        qualityControl: true
      }
    });
  } else if (req.method === 'GET') {
    // Health check endpoint
    const isHealthy = global.io ? true : false;
    res.status(200).json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      features: {
        voiceChannels: true,
        speakingDetection: true,
        connectionMonitoring: true,
        enhancedSignaling: true,
        qualityControl: true
      }
    });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};