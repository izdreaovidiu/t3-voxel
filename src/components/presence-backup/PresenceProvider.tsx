// src/components/presence/PresenceProvider.tsx
'use client';

import React, { createContext, useContext } from 'react';
import { usePresence, type PresenceContextType } from '~/hooks/usePresence';

const PresenceContext = createContext<PresenceContextType | null>(null);

interface PresenceProviderProps {
  children: React.ReactNode;
  userId: string | null;
  token?: string;
}

export const PresenceProvider: React.FC<PresenceProviderProps> = ({ 
  children, 
  userId, 
  token 
}) => {
  const presenceData = usePresence(userId, token);

  return (
    <PresenceContext.Provider value={presenceData}>
      {children}
    </PresenceContext.Provider>
  );
};

export const usePresenceContext = () => {
  const context = useContext(PresenceContext);
  if (!context) {
    throw new Error('usePresenceContext must be used within a PresenceProvider');
  }
  return context;
};