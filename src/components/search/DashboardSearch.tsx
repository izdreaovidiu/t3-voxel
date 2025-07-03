// src/components/search/DashboardSearch.tsx
'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Search, 
  Zap, 
  Server, 
  Users, 
  Hash, 
  Volume2,
  ArrowRight,
  Clock,
  Star,
  Command,
  Sparkles,
  Filter,
  X,
  TrendingUp
} from 'lucide-react';
import { api } from '~/utils/api';

interface SearchResult {
  id: string;
  type: 'server' | 'channel' | 'user' | 'message';
  title: string;
  subtitle?: string;
  avatar?: string;
  icon?: React.ComponentType<any>;
  color?: string;
  recentlyUsed?: boolean;
  memberCount?: number;
  lastActivity?: Date;
}

interface DashboardSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (type: string, id: string, extra?: any) => void;
  servers?: any[];
  recentSearches?: string[];
}

export const DashboardSearch: React.FC<DashboardSearchProps> = ({
  isOpen,
  onClose,
  onNavigate,
  servers = [],
  recentSearches = []
}) => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Debounce the search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Fetch channels when searching
  const { data: allChannels = [], isLoading: channelsLoading } = api.channel.searchChannels.useQuery(
    { query: debouncedQuery },
    { 
      enabled: !!debouncedQuery && debouncedQuery.length > 1,
      staleTime: 30000,
    }
  );

  // Fetch users when searching  
  const { data: allUsers = [], isLoading: usersLoading } = api.user.searchUsers.useQuery(
    { query: debouncedQuery },
    { 
      enabled: !!debouncedQuery && debouncedQuery.length > 1,
      staleTime: 30000,
    }
  );

  // Compute search results using useMemo to prevent infinite loops
  const results = useMemo(() => {
    if (!debouncedQuery.trim()) {
      // Show user's servers when no query
      const serverResults = servers.map(server => ({
        id: server.id,
        type: 'server' as const,
        title: server.name,
        subtitle: `${server.description || 'Gaming community'} • ${server.members || 0} members`,
        icon: Server,
        color: 'text-[#57F287]',
        memberCount: server.members || 0,
        recentlyUsed: true
      }));
      return serverResults.slice(0, 5);
    }

    // Convert and filter servers
    const serverResults = servers.map(server => ({
      id: server.id,
      type: 'server' as const,
      title: server.name,
      subtitle: `${server.description || 'Gaming community'} • ${server.members || 0} members`,
      icon: Server,
      color: 'text-[#57F287]',
      memberCount: server.members || 0,
      recentlyUsed: true
    })).filter(result =>
      result.title.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
      result.subtitle?.toLowerCase().includes(debouncedQuery.toLowerCase())
    );
    
    // Convert and filter channels
    const channelResults = allChannels.map(channel => ({
      id: channel.id,
      type: 'channel' as const,
      title: channel.name,
      subtitle: `${channel.type === 'VOICE' ? 'Voice' : 'Text'} channel in ${channel.server?.name || 'Unknown Server'}`,
      icon: channel.type === 'VOICE' ? Volume2 : Hash,
      color: channel.type === 'VOICE' ? 'text-purple-400' : 'text-gray-400'
    })).filter(result =>
      result.title.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
      result.subtitle?.toLowerCase().includes(debouncedQuery.toLowerCase())
    );
    
    // Convert and filter users
    const userResults = allUsers.map(user => ({
      id: user.id,
      type: 'user' as const,
      title: user.username || 'Unknown User',
      subtitle: `${user.status === 'ONLINE' ? 'Online' : user.status || 'Offline'} • Member`,
      icon: Users,
      color: user.status === 'ONLINE' ? 'text-[#57F287]' : 'text-gray-400'
    })).filter(result =>
      result.title.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
      result.subtitle?.toLowerCase().includes(debouncedQuery.toLowerCase())
    );
    
    // Combine all results
    const allResults = [...serverResults, ...channelResults, ...userResults];
    
    // Filter by type if active filter is set
    const filteredByType = activeFilter === 'all' 
      ? allResults 
      : allResults.filter(result => result.type === activeFilter);
    
    return filteredByType;
  }, [debouncedQuery, activeFilter, servers, allChannels, allUsers]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  // Handle modal open
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setQuery('');
      setDebouncedQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (results[selectedIndex]) {
            handleSelectResult(results[selectedIndex]);
          }
          break;
        case 'Escape':
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex]);

  const handleSelectResult = (result: SearchResult) => {
    if (result.type === 'channel') {
      // For channels, pass the server ID as extra information
      const channelData = allChannels.find(ch => ch.id === result.id);
      onNavigate?.(result.type, result.id, { serverId: channelData?.serverId });
    } else {
      onNavigate?.(result.type, result.id);
    }
    onClose();
  };

  const getResultIcon = (result: SearchResult) => {
    const Icon = result.icon || Search;
    return <Icon className={`h-5 w-5 ${result.color || 'text-gray-400'}`} />;
  };

  const filters = [
    { id: 'all', label: 'All', icon: Search },
    { id: 'server', label: 'Servers', icon: Server },
    { id: 'channel', label: 'Channels', icon: Hash },
    { id: 'user', label: 'Users', icon: Users }
  ];

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-start justify-center pt-20 bg-black/70 backdrop-blur-sm animate-backdrop-in" 
      style={{ zIndex: 99999, position: 'fixed' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-2xl mx-4 relative z-[999999]">
        {/* Search Container */}
        <div className="rounded-2xl border border-gray-700/50 bg-gradient-to-br from-[#161B22] via-[#21262D] to-[#0D1117] shadow-2xl animate-modal-in overflow-hidden">
          {/* Search Input */}
          <div className="relative p-6 border-b border-gray-700/50">
            <div className="relative">
              {/* Glowing border effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-[#57F287] via-[#3BA55C] to-[#57F287] rounded-xl blur opacity-30 group-hover:opacity-50 animate-pulse-glow"></div>
              
              <div className="relative flex items-center bg-[#21262D] rounded-xl border border-gray-600/30 p-4 shadow-inner">
                <Search className="h-6 w-6 text-[#57F287] mr-4 animate-pulse" />
                
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search servers, channels, and users..."
                  className="flex-1 bg-transparent text-white text-lg placeholder-gray-400 focus:outline-none"
                />
                
                {(channelsLoading || usersLoading) && debouncedQuery && (
                  <div className="ml-4">
                    <div className="animate-enhanced-spin h-5 w-5 border-2 border-[#57F287] border-t-transparent rounded-full" />
                  </div>
                )}
                
                <button
                  onClick={onClose}
                  className="ml-4 p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Keyboard Shortcut Hint */}
            <div className="flex items-center justify-between mt-4 text-sm text-gray-400">
              <div className="flex items-center space-x-2">
                <Sparkles className="h-4 w-4 text-[#57F287]" />
                <span>Quick search across all your servers</span>
              </div>
              <div className="flex items-center space-x-1">
                <kbd className="px-2 py-1 bg-gray-700/50 rounded text-xs">↑↓</kbd>
                <span className="text-xs">navigate</span>
                <kbd className="px-2 py-1 bg-gray-700/50 rounded text-xs">↵</kbd>
                <span className="text-xs">select</span>
                <kbd className="px-2 py-1 bg-gray-700/50 rounded text-xs">esc</kbd>
                <span className="text-xs">close</span>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="px-6 py-4 border-b border-gray-700/50 bg-[#161B22]/50">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-400 mr-4">Filter by:</span>
              
              <div className="flex space-x-1">
                {filters.map(filter => (
                  <button
                    key={filter.id}
                    onClick={() => setActiveFilter(filter.id)}
                    className={`btn-interactive flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm transition-all duration-200 ${
                      activeFilter === filter.id
                        ? 'bg-[#57F287] text-black shadow-[0_0_15px_rgba(87,242,135,0.3)]'
                        : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                    }`}
                  >
                    <filter.icon className="h-4 w-4" />
                    <span>{filter.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="max-h-96 overflow-y-auto" ref={resultsRef}>
            {results.length > 0 ? (
              <div className="p-2">
                {!debouncedQuery && (
                  <div className="px-4 py-2 text-sm text-gray-400 flex items-center space-x-2">
                    <TrendingUp className="h-4 w-4" />
                    <span>Your Servers</span>
                  </div>
                )}
                
                {results.map((result, index) => (
                  <button
                    key={result.id}
                    onClick={() => handleSelectResult(result)}
                    className={`w-full flex items-center space-x-4 p-4 rounded-xl text-left transition-all duration-200 group ${
                      index === selectedIndex
                        ? 'bg-[#57F287]/20 shadow-[0_0_20px_rgba(87,242,135,0.1)] border border-[#57F287]/30'
                        : 'hover:bg-gray-700/30'
                    }`}
                  >
                    <div className="relative">
                      <div className={`p-3 rounded-xl transition-all duration-200 ${
                        index === selectedIndex 
                          ? 'bg-[#57F287]/20 scale-110' 
                          : 'bg-gray-700/50 group-hover:bg-gray-600/50'
                      }`}>
                        {getResultIcon(result)}
                      </div>
                      
                      {result.recentlyUsed && (
                        <div className="absolute -top-1 -right-1">
                          <Star className="h-3 w-3 text-yellow-400 fill-current" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h3 className={`font-medium truncate transition-colors ${
                          index === selectedIndex ? 'text-[#57F287]' : 'text-white group-hover:text-[#57F287]'
                        }`}>
                          {result.title}
                        </h3>
                        
                        {result.type === 'server' && result.memberCount && (
                          <div className="flex items-center space-x-1 text-xs text-gray-400">
                            <Users className="h-3 w-3" />
                            <span>{result.memberCount.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                      
                      {result.subtitle && (
                        <p className="text-sm text-gray-400 truncate mt-1">
                          {result.subtitle}
                        </p>
                      )}
                    </div>

                    <div className={`transition-all duration-200 ${
                      index === selectedIndex ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0'
                    }`}>
                      <ArrowRight className="h-5 w-5 text-[#57F287]" />
                    </div>
                  </button>
                ))}
              </div>
            ) : debouncedQuery ? (
              <div className="p-8 text-center">
                <Search className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No results found</h3>
                <p className="text-gray-400">
                  Try adjusting your search or check the spelling
                </p>
              </div>
            ) : (
              <div className="p-8 text-center">
                <Zap className="h-12 w-12 text-[#57F287] mx-auto mb-4 animate-pulse-glow" />
                <h3 className="text-lg font-medium text-white mb-2">Quick Search</h3>
                <p className="text-gray-400">
                  Start typing to search across all your servers and channels
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-700/50 bg-[#161B22]/30">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1">
                  <Command className="h-3 w-3" />
                  <span>+</span>
                  <kbd className="px-1 py-0.5 bg-gray-700/50 rounded">K</kbd>
                  <span>to search</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span>Showing {results.length} result{results.length !== 1 ? 's' : ''}</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-1">
                <Sparkles className="h-3 w-3 text-[#57F287]" />
                <span>Voxel Search</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
