// src/components/presence/PresenceWrapper.tsx
'use client';

import { useUser } from '@clerk/nextjs';
import { PresenceProvider } from './PresenceProvider';

interface PresenceWrapperProps {
  children: React.ReactNode;
}

export const PresenceWrapper: React.FC<PresenceWrapperProps> = ({ children }) => {
  const { user, isLoaded } = useUser();
  
  // Don't initialize presence until user is loaded
  if (!isLoaded) {
    return <>{children}</>;
  }

  const userId = user?.id ?? null;
  
  return (
    <PresenceProvider userId={userId}>
      {children}
    </PresenceProvider>
  );
};