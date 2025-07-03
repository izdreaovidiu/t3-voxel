// src/components/presence/StatusSelector.tsx
'use client';

import React, { useState } from 'react';
import { usePresenceContext } from './PresenceProvider';
import type { UserPresence } from '~/hooks/usePresence';

export const StatusSelector: React.FC = () => {
  const { currentUser, updateStatus } = usePresenceContext();
  const [isOpen, setIsOpen] = useState(false);

  const statuses = [
    { value: 'online', label: 'Online', color: 'bg-green-500', emoji: '🟢' },
    { value: 'away', label: 'Away', color: 'bg-yellow-500', emoji: '🟡' },
    { value: 'dnd', label: 'Do Not Disturb', color: 'bg-red-500', emoji: '🔴' },
    { value: 'invisible', label: 'Invisible', color: 'bg-gray-500', emoji: '⚫' },
  ] as const;

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

  const getStatusEmoji = (status: UserPresence['status']) => {
    switch (status) {
      case 'online': return '🟢';
      case 'away': return '🟡';
      case 'dnd': return '🔴';
      case 'invisible':
      case 'offline': return '⚫';
      default: return '⚫';
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
      >
        <span className="text-lg">
          {currentUser ? getStatusEmoji(currentUser.status) : '⚫'}
        </span>
        <span className="text-white text-sm">
          {currentUser ? getStatusText(currentUser.status) : 'Set Status'}
        </span>
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-48 bg-gray-800 rounded-lg border border-gray-600 shadow-xl z-50">
          {statuses.map((status) => (
            <button
              key={status.value}
              onClick={() => {
                updateStatus(status.value);
                setIsOpen(false);
              }}
              className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg transition-colors"
            >
              <span className="text-lg">{status.emoji}</span>
              <span className="text-white text-sm">{status.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};