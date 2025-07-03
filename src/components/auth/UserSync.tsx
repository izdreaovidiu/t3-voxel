"use client";

import { useUser } from "@clerk/nextjs";
import { api } from "~/utils/api";
import { useEffect, useState } from "react";

/**
 * UserSync component ensures the user exists in our database
 * and syncs their information from Clerk when they first sign in.
 */
export function UserSync({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();
  const [syncAttempted, setSyncAttempted] = useState(false);
  
  // Mutation to create or update user
  const syncUserMutation = api.user.getOrCreateUser.useMutation({
    onSuccess: (data) => {
      console.log('User synced successfully:', data);
      setSyncAttempted(true);
    },
    onError: (error) => {
      console.error('User sync failed:', error);
      setSyncAttempted(true);
    },
  });

  useEffect(() => {
    if (isLoaded && user && !syncAttempted && !syncUserMutation.isPending) {
      console.log('Attempting to sync user:', user.id);
      // Sync user data with our database
      syncUserMutation.mutate({
        clerkId: user.id,
        email: user.emailAddresses[0]?.emailAddress || "",
        username: user.username || user.firstName || `User_${user.id.slice(-8)}`,
        avatar: user.imageUrl,
      });
    }
  }, [isLoaded, user, syncAttempted, syncUserMutation]);

  // Show loading state while syncing
  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-[#0D1117] via-[#161B22] to-[#21262D]">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#57F287] border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-[#0D1117] via-[#161B22] to-[#21262D]">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold text-red-400">Not Authenticated</h1>
          <p className="text-gray-400">Please sign in to continue.</p>
        </div>
      </div>
    );
  }

  if (syncUserMutation.isPending) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-[#0D1117] via-[#161B22] to-[#21262D]">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#57F287] border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-400">Setting up your profile...</p>
        </div>
      </div>
    );
  }

  // Show error state if sync failed
  if (syncUserMutation.error && syncAttempted) {
    console.error('UserSync error details:', syncUserMutation.error);
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-[#0D1117] via-[#161B22] to-[#21262D]">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold text-red-400">Profile Setup Failed</h1>
          <p className="mb-4 text-gray-400">
            Error: {syncUserMutation.error.message}
          </p>
          <div className="space-x-2">
            <button
              onClick={() => {
                setSyncAttempted(false);
                syncUserMutation.reset();
              }}
              className="rounded-lg bg-[#5865F2] px-4 py-2 text-white transition-colors hover:bg-[#4752C4]"
            >
              Retry
            </button>
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg bg-gray-600 px-4 py-2 text-white transition-colors hover:bg-gray-700"
            >
              Reload Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If sync completed (success or failure), show children
  if (syncAttempted) {
    return <>{children}</>;
  }

  // Fallback loading state
  return (
    <div className="flex h-screen items-center justify-center bg-gradient-to-br from-[#0D1117] via-[#161B22] to-[#21262D]">
      <div className="text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#57F287] border-t-transparent mx-auto mb-4"></div>
        <p className="text-gray-400">Preparing...</p>
      </div>
    </div>
  );
}
