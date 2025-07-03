// src/pages/api/voice/stats.ts - Voice Channel Statistics API
import { NextApiRequest, NextApiResponse } from 'next';
import { getVoiceChannelStats, getAllVoiceStats } from '~/server/socket/enhanced-socket-server';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { channelId } = req.query;

    try {
      if (channelId && typeof channelId === 'string') {
        // Get stats for specific channel
        const stats = getVoiceChannelStats(channelId);
        
        if (!stats) {
          return res.status(404).json({
            error: 'Voice channel not found or inactive',
            channelId,
          });
        }

        res.status(200).json({
          success: true,
          channelId,
          stats,
          timestamp: new Date().toISOString(),
        });
      } else {
        // Get stats for all channels
        const allStats = getAllVoiceStats();
        
        res.status(200).json({
          success: true,
          stats: allStats,
          totalChannels: allStats.length,
          totalParticipants: allStats.reduce((sum, channel) => sum + channel.participantCount, 0),
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Voice stats API error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
