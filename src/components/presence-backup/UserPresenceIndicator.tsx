// src/components/presence/UserPresenceIndicator.tsx
'use client';

import React from 'react';
import type { UserPresence } from '~/hooks/usePresence';

interface UserPresenceIndicatorProps {
  user: UserPresence;
  showActivity?: boolean;
  className?: string;
}

export const UserPresenceIndicator: React.FC<UserPresenceIndicatorProps> = ({ 
  user, 
  showActivity = true,
  className = "" 
}) => {
  const getStatusColor = (status: UserPresence['status']) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'dnd': return 'bg-red-500';
      case 'invisible':
      case 'offline': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: UserPresence['status']) => {
    switch (status) {
      case 'online': return 'Online';
      case 'away': return 'Away';
      case 'dnd': return 'Do Not Disturb';
      case 'invisible': return 'Invisible';
      case 'offline': return 'Offline';
      default: return 'Unknown';
    }
  };

  const formatActivity = (activity: UserPresence['activity']) => {
    if (!activity) return null;

    switch (activity.type) {
      case 'browser':
        return `Browsing ${activity.name}${activity.url ? ` - ${activity.url}` : ''}`;
      case 'game':
        return `Playing ${activity.name}`;
      case 'music':
        return `Listening to ${activity.name}`;
      default:
        return activity.details || activity.name;
    }
  };

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {/* Avatar with status indicator */}
      <div className="relative">
        <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
          {(user.fullName || user.displayName || "Izdrea Ovidiu").charAt(0).toUpperCase()}
        </div>
        <div className={`absolute -bottom-1 -right-1 w-4 h-4 ${getStatusColor(user.status)} rounded-full border-2 border-gray-800`} />
      </div>

      {/* User info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <span className="text-white font-medium truncate">
            {user.fullName || user.displayName || "Izdrea Ovidiu"}
          </span>
          <span className={`text-xs px-2 py-1 rounded ${getStatusColor(user.status)} text-white`}>
            {getStatusText(user.status)}
          </span>
        </div>
        
        {showActivity && user.activity && (
          <div className="text-sm text-gray-400 truncate mt-1">
            {formatActivity(user.activity)}
          </div>
        )}
        
        {user.status === 'offline' && (
          <div className="text-xs text-gray-500 mt-1">
            Last seen: {new Date(user.lastSeen).toLocaleString()}
          </div>
        )}
      </div>
    </div>
  );
};