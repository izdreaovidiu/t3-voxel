// app/dashboard/page.tsx
"use client";

import { SignedIn, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { api } from "~/utils/api";
import { useEffect, useState } from "react";
import DiscordServerCarousel from "~/app/_components/carusel";
import { UserSync } from "~/components/auth";
import { DashboardSearch } from "~/components/search/DashboardSearch";
import { Search, Command } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  
  // Global Ctrl+K search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearchNavigate = (type: string, id: string, extra?: any) => {
    if (type === 'server') {
      router.push(`/dashboard/server/${id}`);
    } else if (type === 'channel') {
      // Navigate to the server that contains this channel
      const serverId = extra?.serverId || id;
      router.push(`/dashboard/server/${serverId}?channel=${id}`);
    } else if (type === 'user') {
      // For now, navigate to the first server where this user is a member
      // In the future, this could open a DM or user profile
      console.log('User selected:', id);
    }
  };
  
  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (isLoaded && !user) {
      router.push('/sign-in');
    }
  }, [isLoaded, user, router]);

  // Show loading state while user is loading
  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-[#0D1117] via-[#161B22] to-[#21262D]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#57F287] border-t-transparent"></div>
      </div>
    );
  }

  // Redirect to sign-in if not authenticated
  if (!user) {
    return null; // Will be redirected by useEffect
  }

  return (
    <>
      <SignedIn>
        <UserSync>
          <DashboardContent />
        </UserSync>
      </SignedIn>
      
      {/* Global Search Component */}
      <DashboardSearch 
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={handleSearchNavigate}
        servers={[]}
      />
    </>
  );
}

// Separate component for dashboard content that runs after UserSync
function DashboardContent() {
  const router = useRouter();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  
  const handleSearchNavigate = (type: string, id: string, extra?: any) => {
    if (type === 'server') {
      router.push(`/dashboard/server/${id}`);
    } else if (type === 'channel') {
      // Navigate to the server that contains this channel
      const serverId = extra?.serverId || id;
      router.push(`/dashboard/server/${serverId}?channel=${id}`);
    } else if (type === 'user') {
      // For now, navigate to the first server where this user is a member
      // In the future, this could open a DM or user profile
      console.log('User selected:', id);
    }
  };
  
  // Fetch user servers - this runs after UserSync ensures user exists
  const { data: servers, isLoading, error } = api.server.getUserServers.useQuery(
    undefined,
    {
      retry: 1, // Retry once if it fails
    }
  );

  // Redirect to server creation if user has no servers
  useEffect(() => {
    if (!isLoading && !error && servers?.length === 0) {
      router.push('/create-server');
    }
  }, [servers, isLoading, error, router]);

  // Show loading state while checking for servers
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-[#0D1117] via-[#161B22] to-[#21262D]">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#57F287] border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-400">Loading your servers...</p>
        </div>
      </div>
    );
  }

  // Show error state if there's still an error after UserSync
  if (error) {
    console.error('Dashboard error:', error);
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-[#0D1117] via-[#161B22] to-[#21262D]">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold text-red-400">Something went wrong</h1>
          <p className="mb-4 text-gray-400">
            {error.message || 'Failed to load your servers'}
          </p>
          <div className="space-x-2">
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg bg-[#5865F2] px-4 py-2 text-white transition-colors hover:bg-[#4752C4]"
            >
              Retry
            </button>
            <button
              onClick={() => router.push('/create-server')}
              className="rounded-lg bg-[#57F287] px-4 py-2 text-black transition-colors hover:bg-[#3BA55C]"
            >
              Create Server
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <DiscordServerCarousel onOpenSearch={() => setIsSearchOpen(true)} />
      
      {/* Dashboard Search */}
      <DashboardSearch 
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={handleSearchNavigate}
        servers={servers || []}
      />
    </>
  );
}
