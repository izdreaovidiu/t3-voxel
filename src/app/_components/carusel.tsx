"use client";

import type React from "react";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Users,
  MessageCircle,
  Loader2,
  Search,
  Command,
  Sparkles,
} from "lucide-react";
import { api } from "~/utils/api";
import { useSocket } from "~/hooks/useSocket";

// Custom animations (keeping the same as before)
const slowBounceKeyframes = `
  @keyframes slow-bounce {
    0%, 20%, 53%, 80%, 100% {
      animation-timing-function: cubic-bezier(0.215, 0.610, 0.355, 1.000);
      transform: translate3d(0,0,0);
    }
    40%, 43% {
      animation-timing-function: cubic-bezier(0.755, 0.050, 0.855, 0.060);
      transform: translate3d(0, -15px, 0);
    }
    70% {
      animation-timing-function: cubic-bezier(0.755, 0.050, 0.855, 0.060);
      transform: translate3d(0, -7px, 0);
    }
    90% {
      transform: translate3d(0, -2px, 0);
    }
  }
  
  .slow-bounce {
    animation: slow-bounce 2s infinite;
  }

  @keyframes pulse-glow {
    0%, 100% {
      box-shadow: 0 0 20px rgba(255,255,255,0.1);
    }
    50% {
      box-shadow: 0 0 30px rgba(255,255,255,0.2), 0 0 40px rgba(255,255,255,0.1);
    }
  }
  
  .pulse-glow {
    animation: pulse-glow 2s ease-in-out infinite;
  }

  @keyframes center-glow {
    0%, 100% {
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5), 0 0 40px var(--glow-color), 0 0 80px var(--glow-color);
      transform: translateY(-10px) scale(1.3);
    }
    50% {
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5), 0 0 60px var(--glow-color), 0 0 120px var(--glow-color);
      transform: translateY(-15px) scale(1.32);
    }
  }

  .center-glow {
    animation: center-glow 3s ease-in-out infinite;
  }
`;

// Add styles to head
if (typeof document !== "undefined") {
  const existingStyle = document.getElementById("slow-bounce-styles");
  if (!existingStyle) {
    const styleSheet = document.createElement("style");
    styleSheet.id = "slow-bounce-styles";
    styleSheet.textContent = slowBounceKeyframes;
    document.head.appendChild(styleSheet);
  }
}

interface DiscordServerCarouselProps {
  onOpenSearch?: () => void;
}

export default function DiscordServerCarousel({ onOpenSearch }: DiscordServerCarouselProps = {}) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [selectedServer, setSelectedServer] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { joinServer } = useSocket();

  // Fetch user servers from tRPC
  const {
    data: servers = [],
    isLoading,
    error,
    refetch,
  } = api.server.getUserServers.useQuery();

  // Create server mutation
  const createServerMutation = api.server.createServer.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  // Navigate to server function
  const navigateToServer = (serverId: string) => {
    setSelectedServer(serverId);
    joinServer(serverId); // Join server room for real-time updates
    setTimeout(() => {
      router.push(`/dashboard/server/${serverId}`);
    }, 200);
  };

  // Navigate to create server page
  const navigateToCreateServer = () => {
    router.push('/create-server');
  };

  const rotateCarousel = useCallback(
    (direction: "next" | "prev") => {
      if (isAnimating || servers.length === 0) return;

      setIsAnimating(true);
      
      setCurrentIndex((prev) => {
        if (direction === "next") {
          return (prev + 1) % servers.length;
        } else {
          return prev === 0 ? servers.length - 1 : prev - 1;
        }
      });

      setTimeout(() => {
        setIsAnimating(false);
      }, 300);
    },
    [isAnimating, servers.length],
  );

  // Handle wheel scroll
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.deltaY > 0) {
        rotateCarousel("next");
      } else {
        rotateCarousel("prev");
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleWheel);
  }, [rotateCarousel]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (servers.length === 0) return;

      switch (e.key) {
        case "ArrowLeft":
          rotateCarousel("prev");
          break;
        case "ArrowRight":
          rotateCarousel("next");
          break;
        case "Enter":
          if (servers[currentIndex]) {
            navigateToServer(servers[currentIndex].id);
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [currentIndex, rotateCarousel, servers]);

  const getServerPosition = (serverIndex: number) => {
    let position = serverIndex - currentIndex;

    if (position > servers.length / 2) {
      position -= servers.length;
    } else if (position < -servers.length / 2) {
      position += servers.length;
    }

    const cardWidth = 180; // Increased from 160
    const x = position * cardWidth;
    
    let scale;
    if (Math.abs(position) === 0) {
      scale = 0.9; // Slightly larger center card
    } else if (Math.abs(position) === 1) {
      scale = 1.05; // Increased from 1.0
    } else if (Math.abs(position) === 2) {
      scale = 0.85; // Increased from 0.8
    } else if (Math.abs(position) === 3) {
      scale = 0.7; // Increased from 0.65
    } else if (Math.abs(position) === 4) {
      scale = 0.55; // New position for 9 cards
    } else {
      scale = 0.4; // For cards further out
    }

    // Show up to 4 cards on each side (9 total including center)
    const opacity = Math.abs(position) <= 4 ? 1 : 0;

    return {
      transform: `translateX(${x}px) scale(${scale})`,
      opacity: opacity,
      zIndex: 100 - Math.abs(position),
    };
  };

  const getCurrentServer = () => {
    return servers[currentIndex];
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0D1117] text-white">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-[#57F287]" />
          <p className="text-gray-400">Loading your servers...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0D1117] text-white">
        <div className="flex flex-col items-center space-y-4">
          <p className="text-red-400">Failed to load servers</p>
          <button
            onClick={() => refetch()}
            className="rounded-lg bg-[#5865F2] px-4 py-2 transition-colors hover:bg-[#4752C4]"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (servers.length === 0) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-[#0D1117] text-white">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0D1117] via-[#161B22] to-[#21262D]" />
        </div>

        <div className="relative z-10 flex min-h-screen items-center justify-center">
          <div className="text-center">
            <h1 className="mb-4 text-4xl font-light text-white">
              Welcome to Discord Clone!
            </h1>
            <p className="mb-8 text-gray-400">
              You haven't joined any servers yet.
            </p>
            <div className="space-y-4">
              <button
                onClick={navigateToCreateServer}
                className="mx-auto flex items-center rounded-lg bg-[#57F287] px-6 py-3 font-medium text-black transition-colors hover:bg-[#3BA55C]"
              >
                Create Your Server
              </button>
              <p className="text-sm text-gray-500">
                Or ask a friend for a server invite!
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0D1117] text-white">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0D1117] via-[#161B22] to-[#21262D]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(88,101,242,0.03),transparent_70%)]" />
      </div>

      {/* Header */}
      <div className="relative z-10 pt-8 pb-4 text-center">
        {/* Search Input with Glowing Effect */}
        <div className="mb-6 flex justify-center">
          <div className="relative group">
            {/* Animated glowing border */}
            <div className="absolute -inset-1 bg-gradient-to-r from-[#57F287] via-[#3BA55C] to-[#57F287] rounded-2xl blur opacity-30 group-hover:opacity-50 animate-pulse-glow"></div>
            
            <div className="relative flex items-center bg-[#21262D]/80 backdrop-blur-xl border border-gray-600/30 rounded-xl p-4 shadow-2xl min-w-[400px] hover:shadow-[0_0_40px_rgba(87,242,135,0.2)] transition-all duration-300">
              <Search className="h-5 w-5 text-[#57F287] mr-3 animate-pulse" />
              
              <button
                onClick={() => onOpenSearch?.()}
                className="flex-1 text-left text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                Search servers, channels, and users...
              </button>
              
              <div className="flex items-center space-x-1 text-xs text-gray-500">
                <Command className="h-3 w-3" />
                <span>+</span>
                <kbd className="px-1.5 py-0.5 bg-gray-700/50 rounded text-xs">K</kbd>
              </div>
            </div>
            
            {/* Floating particles effect */}
            <div className="absolute inset-0 pointer-events-none">
              <Sparkles className="absolute top-1 right-1 h-3 w-3 text-[#57F287] animate-pulse" style={{ animationDelay: '0.5s' }} />
              <Sparkles className="absolute bottom-1 left-1 h-2 w-2 text-[#3BA55C] animate-pulse" style={{ animationDelay: '1.5s' }} />
            </div>
          </div>
        </div>
        
        <h1 className="mb-4 bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-4xl font-light tracking-tight text-transparent">
          Choose Your Server
        </h1>
        <p className="mb-3 text-base font-light text-gray-400">
          Use mouse wheel to navigate • Press Enter to select • Ctrl+K to search
        </p>
        {getCurrentServer() && (
          <div className="inline-flex items-center space-x-3 rounded-full border border-gray-800/50 bg-[#21262D]/50 px-5 py-2 backdrop-blur-xl">
          <div className="h-8 w-8 flex items-center justify-center rounded-lg overflow-hidden bg-white/10">
          {getCurrentServer().icon && (getCurrentServer().icon.startsWith('data:image/') || getCurrentServer().icon.startsWith('http://') || getCurrentServer().icon.startsWith('https://')) ? (
          <img 
          src={getCurrentServer().icon} 
          alt={`${getCurrentServer().name} icon`}
          className="h-full w-full object-cover rounded"
          onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          target.parentElement!.innerHTML = '<span class="text-xl select-none">🎮</span>';
          }}
          />
          ) : (
          <span className="text-xl select-none">{getCurrentServer().icon || "🎮"}</span>
          )}
          </div>
            <div className="text-left">
              <div className="text-sm font-medium text-white">
                {getCurrentServer().name}
              </div>
              <div className="text-xs text-gray-400">
                {getCurrentServer().description || `Welcome to ${getCurrentServer().name}!`}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Carousel Container */}
      <div className="relative mt-8 flex h-[600px] w-full items-center justify-center px-8 py-16">
        <div className="relative flex h-full w-full max-w-none items-center justify-center">
          {servers.map((server, index) => {
            const style = getServerPosition(index);
            const isCenter = index === currentIndex;

            return (
              <div
                key={server.id}
                className={`absolute cursor-pointer transition-all duration-300 ease-out ${isCenter ? "z-50" : ""}`}
                style={style}
                onClick={() => navigateToServer(server.id)}
              >
                <div
                  className={`relative ${isCenter ? "h-96 w-72" : "h-64 w-52"} rounded-2xl bg-gradient-to-br ${server.color} transform border border-white/10 shadow-2xl backdrop-blur-sm transition-all duration-300 hover:scale-105 ${
                    isCenter ? `center-glow ring-4 ring-white/50` : ""
                  } ${selectedServer === server.id ? `ring-2 ring-white shadow-[0_0_40px_${server.glowColor}60]` : ""}`}
                  style={
                    {
                      "--glow-color": server.glowColor,
                      boxShadow: isCenter
                        ? `0 25px 50px -12px rgba(0,0,0,0.5), 0 0 40px ${server.glowColor}60, 0 0 80px ${server.glowColor}30`
                        : "0 25px 50px -12px rgba(0,0,0,0.25)",
                    } as React.CSSProperties
                  }
                >
                  {/* Server Icon */}
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 transform">
                    <div
                      className={`${isCenter ? "h-14 w-14" : "h-10 w-10"} flex items-center justify-center rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm transition-all duration-300 overflow-hidden ${
                        isCenter ? "shadow-lg shadow-white/20" : ""
                      }`}
                    >
                      {server.icon && (server.icon.startsWith('data:image/') || server.icon.startsWith('http://') || server.icon.startsWith('https://')) ? (
                        <img 
                          src={server.icon} 
                          alt={`${server.name} icon`}
                          className="h-full w-full object-cover rounded-lg"
                          onError={(e) => {
                            // Fallback to emoji if image fails to load
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.parentElement!.innerHTML = `<span class="${isCenter ? 'text-3xl' : 'text-xl'} select-none">🎮</span>`;
                          }}
                        />
                      ) : (
                        <span className={`${isCenter ? "text-3xl" : "text-xl"} select-none`}>
                          {server.icon || "🎮"}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Removed notifications badge - no longer needed */}

                  {/* Server Content */}
                  <div
                    className={`${isCenter ? "p-6 pt-10" : "p-4 pt-7"} flex h-full flex-col`}
                  >
                    <h3
                      className={`${isCenter ? "mb-3 text-2xl" : "mb-2 text-lg"} text-center leading-tight font-semibold text-white transition-all duration-300`}
                    >
                      {server.name}
                    </h3>

                    <p
                      className={`text-center text-white/60 ${isCenter ? "mb-8 text-base" : "mb-4 text-xs"} flex-1 leading-relaxed font-light`}
                    >
                      {server.description || `Welcome to ${server.name}! Join our community and have fun together.`}
                    </p>

                    {/* Server Stats */}
                    <div
                      className={`${isCenter ? "space-y-4" : "space-y-2"} mt-auto`}
                    >
                      <div
                        className={`flex items-center justify-between rounded-lg bg-black/20 ${isCenter ? "p-4" : "p-2.5"} border border-white/5 backdrop-blur-sm`}
                      >
                        <div className="flex items-center space-x-2">
                          <Users
                            className={`${isCenter ? "h-5 w-5" : "h-3 w-3"} text-white/40`}
                          />
                          <span
                            className={`${isCenter ? "text-base" : "text-xs"} font-medium text-white/60`}
                          >
                            Members
                          </span>
                        </div>
                        <span
                          className={`font-medium text-white/80 ${isCenter ? "text-base" : "text-xs"}`}
                        >
                          {server.members.toLocaleString()}
                        </span>
                      </div>

                      <div
                        className={`flex items-center justify-between rounded-lg bg-black/20 ${isCenter ? "p-4" : "p-2.5"} border border-white/5 backdrop-blur-sm`}
                      >
                        <div className="flex items-center space-x-2">
                          <div
                            className={`${isCenter ? "h-4 w-4" : "h-2.5 w-2.5"} animate-pulse rounded-full bg-[#57F287] shadow-[0_0_6px_#57F287]`}
                          />
                          <span
                            className={`${isCenter ? "text-base" : "text-xs"} font-medium text-white/60`}
                          >
                            Online
                          </span>
                        </div>
                        <span
                          className={`font-bold text-[#57F287] ${isCenter ? "text-base" : "text-xs"} drop-shadow-[0_0_6px_rgba(87,242,135,0.5)]`}
                        >
                          {server.online.toLocaleString()}
                        </span>
                      </div>

                      <div
                        className={`flex items-center justify-between rounded-lg bg-black/20 ${isCenter ? "p-3" : "p-2"} border border-white/5 backdrop-blur-sm`}
                      >
                        <div className="flex items-center space-x-2">
                          <MessageCircle
                            className={`${isCenter ? "h-4 w-4" : "h-3 w-3"} text-white/40`}
                          />
                          <span
                            className={`${isCenter ? "text-sm" : "text-xs"} font-medium text-white/60 truncate`}
                          >
                            Channels
                          </span>
                        </div>
                        <span
                          className={`font-medium text-white/80 ${isCenter ? "text-sm" : "text-xs"} flex-shrink-0 ml-2`}
                        >
                          {server.channels}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Hover Glow Effect */}
                  <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-white/0 via-transparent to-white/0 transition-all duration-300 hover:from-white/5 hover:to-white/5" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation Buttons */}
      {servers.length > 1 && (
        <>
          <div className="absolute top-1/2 left-8 flex -translate-y-1/2 items-center space-x-4">
            <button
              onClick={() => rotateCarousel("prev")}
              className="pulse-glow flex h-16 w-16 transform items-center justify-center rounded-full border border-white/10 bg-white/10 shadow-lg backdrop-blur-sm transition-all duration-300 hover:scale-110 hover:bg-white/20 hover:shadow-[0_0_25px_rgba(255,255,255,0.3)] hover:shadow-xl active:scale-95"
              disabled={isAnimating}
            >
              <ChevronLeft className="h-6 w-6 text-white transition-transform duration-300 group-hover:-translate-x-1" />
            </button>
          </div>
          <div className="absolute top-1/2 right-8 flex -translate-y-1/2 items-center space-x-4">
            <button
              onClick={() => rotateCarousel("next")}
              className="pulse-glow flex h-16 w-16 transform items-center justify-center rounded-full border border-white/10 bg-white/10 shadow-lg backdrop-blur-sm transition-all duration-300 hover:scale-110 hover:bg-white/20 hover:shadow-[0_0_25px_rgba(255,255,255,0.3)] hover:shadow-xl active:scale-95"
              disabled={isAnimating}
            >
              <ChevronRight className="h-6 w-6 text-white transition-transform duration-300 group-hover:translate-x-1" />
            </button>
          </div>
        </>
      )}

      {/* Instructions */}
      <div className="absolute right-8 bottom-6 space-y-1 rounded-lg border border-gray-800/30 bg-[#21262D]/30 p-3 text-right text-sm font-light text-gray-400 backdrop-blur-sm">
        <div className="flex items-center justify-end space-x-2">
          <span>🖱️</span>
          <span>Mouse wheel to navigate</span>
        </div>
        <div className="flex items-center justify-end space-x-2">
          <span>⬅️➡️</span>
          <span>Arrow keys to move</span>
        </div>
        <div className="flex items-center justify-end space-x-2">
          <span>⏎</span>
          <span>Enter to select</span>
        </div>
        <div className="flex items-center justify-end space-x-2">
          <Command className="h-3 w-3" />
          <span>+</span>
          <kbd className="px-1 py-0.5 bg-gray-700/50 rounded text-xs">K</kbd>
          <span>to search</span>
        </div>
      </div>

      {/* Create Server Button */}
      <div className="absolute bottom-6 left-8">
        <button
          onClick={navigateToCreateServer}
          className="flex items-center rounded-lg bg-[#57F287] px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-[#3BA55C]"
        >
          + Create Server
        </button>
      </div>
    </div>
  );
}
