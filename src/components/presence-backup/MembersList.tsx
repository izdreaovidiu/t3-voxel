// src/components/presence/MembersList.tsx
'use client';

import React from 'react';
import { usePresenceContext } from './PresenceProvider';
import { UserPresenceIndicator } from './UserPresenceIndicator';
import { StatusSelector } from './StatusSelector';

export const MembersList: React.FC = () => {
  const { friends, isConnected, currentUser } = usePresenceContext();
  
  return (
    <div className="space-y-3">
      {/* Connection Status */}
      {!isConnected && (
        <div className="bg-yellow-600/20 border border-yellow-600/30 rounded-lg p-3 mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
            <span className="text-yellow-300 text-sm">Connecting to presence server...</span>
          </div>
        </div>
      )}

      {/* Your Status */}
      <div className="mb-4">
        <h3 className="text-white font-medium mb-2">Your Status</h3>
        <div className="flex items-center justify-between bg-gray-700/30 rounded-lg p-3">
          {currentUser && (
            <UserPresenceIndicator 
              user={currentUser}
              showActivity={true}
              className=""
            />
          )}
          <StatusSelector />
        </div>
      </div>
      
      {/* Members List */}
      <div>
        <h3 className="text-white font-medium mb-2 flex items-center">
          <span>MEMBERS</span>
          <span className="ml-2 text-gray-400">— {friends.length}</span>
        </h3>
        
        <div className="space-y-1">
          {friends.length > 0 ? (
            friends.map((friend) => (
              <UserPresenceIndicator 
                key={friend.userId} 
                user={friend}
                showActivity={true}
                className="px-2 py-2 hover:bg-gray-700/30 rounded-lg transition-colors"
              />
            ))
          ) : (
            <div className="text-gray-500 text-sm px-2 py-4 text-center">
              No friends online
            </div>
          )}
        </div>
      </div>
    </div>
  );
};