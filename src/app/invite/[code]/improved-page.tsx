// Improved Invite Page with Better Error Handling
"use client";

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { SignedIn, SignedOut, SignInButton, useUser } from '@clerk/nextjs';
import { 
  Users, 
  Hash, 
  Crown, 
  Shield, 
  UserPlus,
  ArrowRight,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  Copy,
  ExternalLink
} from 'lucide-react';
import { api } from '~/utils/api';

const ImprovedInvitePage: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const { user } = useUser();
  const [isJoining, setIsJoining] = useState(false);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const inviteCode = params.code as string;

  // Fetch invite data with better error handling
  const {
    data: invite,
    isLoading,
    error,
    refetch
  } = api.server.getInvite.useQuery(
    { code: inviteCode },
    {
      enabled: !!inviteCode,
      retry: 3, // Retry 3 times
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    }
  );

  // Join server mutation
  const joinServerMutation = api.server.joinViaInvite.useMutation({
    onSuccess: (data) => {
      router.push(`/dashboard/server/${data.serverId}`);
    },
    onError: (error) => {
      console.error('Failed to join server:', error);
      setIsJoining(false);
    },
  });

  const handleJoinServer = async () => {
    if (!user || !invite) return;
    
    setIsJoining(true);
    joinServerMutation.mutate({ code: inviteCode });
  };

  const handleDecline = () => {
    router.push('/dashboard');
  };

  const handleRetry = () => {
    refetch();
  };

  const copyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Crown className="h-3 w-3 text-[#FEE75C]" />;
      case "moderator":
        return <Shield className="h-3 w-3 text-[#57F287]" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ONLINE":
        return "bg-[#57F287]";
      case "IDLE":
        return "bg-[#FEE75C]";
      case "DND":
        return "bg-[#ED4245]";
      default:
        return "bg-gray-500";
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0D1117] text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#57F287] mx-auto mb-4" />
          <p className="text-gray-400">Loading invite...</p>
          <p className="text-sm text-gray-500 mt-2">Code: {inviteCode}</p>
        </div>
      </div>
    );
  }

  // Enhanced error state with debug options
  if (error || !invite) {
    const isNotFound = error?.data?.code === 'NOT_FOUND';
    const isExpired = error?.message?.includes('expired');
    const isMaxUses = error?.message?.includes('maximum uses');

    return (
      <div className="min-h-screen bg-[#0D1117] text-white flex items-center justify-center">
        <div className="max-w-md w-full px-4">
          <div className="text-center mb-6">
            <AlertCircle className="h-16 w-16 text-[#ED4245] mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">
              {isNotFound ? 'Invite Not Found' : 
               isExpired ? 'Invite Expired' :
               isMaxUses ? 'Invite Exhausted' : 'Invite Error'}
            </h1>
            <p className="text-gray-400 mb-4">
              {isNotFound ? 'This invite link is invalid or doesn\'t exist.' :
               isExpired ? 'This invite link has expired.' :
               isMaxUses ? 'This invite link has reached its usage limit.' :
               'There was an error loading this invite.'}
            </p>
          </div>

          {/* Error Details */}
          <div className="bg-[#161B22] border border-gray-700/50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-300">Invite Code</span>
              <button
                onClick={copyInviteLink}
                className="flex items-center space-x-1 text-xs text-gray-400 hover:text-white transition-colors"
              >
                {copySuccess ? (
                  <>
                    <CheckCircle className="h-3 w-3" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>
            <code className="block bg-gray-900/50 px-3 py-2 rounded text-[#57F287] font-mono text-sm">
              {inviteCode}
            </code>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleRetry}
              className="w-full flex items-center justify-center space-x-2 bg-[#57F287] hover:bg-[#3BA55C] text-black font-bold py-3 px-4 rounded-lg transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Try Again</span>
            </button>
            
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white py-3 px-4 rounded-lg transition-colors"
            >
              Go to Dashboard
            </button>

            <button
              onClick={() => setShowDebugInfo(!showDebugInfo)}
              className="w-full text-gray-400 hover:text-white text-sm py-2 transition-colors"
            >
              {showDebugInfo ? 'Hide' : 'Show'} Debug Info
            </button>
          </div>

          {/* Debug Information */}
          {showDebugInfo && (
            <div className="mt-4 bg-gray-900/50 border border-gray-700/30 rounded-lg p-4">
              <h3 className="text-sm font-bold text-white mb-2">Debug Information</h3>
              <div className="text-xs text-gray-400 space-y-1">
                <div>Error Code: {error?.data?.code || 'Unknown'}</div>
                <div>Error Message: {error?.message || 'No message'}</div>
                <div>Invite Code: {inviteCode}</div>
                <div>URL: {window.location.href}</div>
                <div>Timestamp: {new Date().toISOString()}</div>
              </div>
              
              <div className="mt-3 pt-3 border-t border-gray-700/30">
                <p className="text-xs text-gray-500">
                  If this invite should work, the server admin may need to create a new invite link.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const server = invite.server;
  const onlineMembers = server.members.filter(m => 
    m.user.status === 'ONLINE' || m.user.status === 'IDLE' || m.user.status === 'DND'
  );

  return (
    <div className="min-h-screen bg-[#0D1117] text-white">
      <div className="container mx-auto flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-4xl">
          {/* Main invite card */}
          <div className="overflow-hidden rounded-2xl border border-gray-700/50 bg-[#161B22] shadow-2xl">
            {/* Header with server info */}
            <div 
              className="relative bg-gradient-to-r p-8 text-center"
              style={{
                background: `linear-gradient(135deg, ${server.color?.split(" ")[1] || "#5865F2"} 0%, ${server.color?.split(" ")[3] || "#4752C4"} 100%)`
              }}
            >
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-white/10 text-4xl backdrop-blur-sm">
                {server.icon || "🎮"}
              </div>
              <h1 className="mb-2 text-3xl font-bold text-white drop-shadow-lg">
                {server.name}
              </h1>
              <p className="text-lg text-white/80 drop-shadow">
                {server.description || "Welcome to this server!"}
              </p>
            </div>

            <div className="p-8">
              <div className="grid gap-8 lg:grid-cols-2">
                {/* Left side - Server stats and channels */}
                <div className="space-y-6">
                  {/* Server stats */}
                  <div className="rounded-xl border border-gray-700/50 bg-[#0D1117] p-6">
                    <div className="mb-4 flex items-center space-x-2">
                      <Users className="h-5 w-5 text-[#57F287]" />
                      <h3 className="text-lg font-bold text-white">Server Stats</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-[#57F287]">{server._count.members}</div>
                        <div className="text-sm text-gray-400">Members</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-[#57F287]">{onlineMembers.length}</div>
                        <div className="text-sm text-gray-400">Online</div>
                      </div>
                    </div>
                  </div>

                  {/* Channels preview */}
                  <div className="rounded-xl border border-gray-700/50 bg-[#0D1117] p-6">
                    <div className="mb-4 flex items-center space-x-2">
                      <Hash className="h-5 w-5 text-[#57F287]" />
                      <h3 className="text-lg font-bold text-white">Channels</h3>
                    </div>
                    <div className="space-y-2">
                      {server.channels.slice(0, 5).map((channel, index) => (
                        <div key={index} className="flex items-center space-x-3 rounded-lg bg-gray-700/20 px-3 py-2">
                          <span className="text-lg">
                            {channel.type === 'TEXT' ? '💬' : '🔊'}
                          </span>
                          <span className="text-sm font-medium text-gray-300">{channel.name}</span>
                          <span className="text-xs text-gray-500 uppercase">
                            {channel.type === 'TEXT' ? 'text' : 'voice'}
                          </span>
                        </div>
                      ))}
                      {server.channels.length > 5 && (
                        <div className="text-center text-xs text-gray-500 py-2">
                          +{server.channels.length - 5} more channels
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right side - Members and join button */}
                <div className="space-y-6">
                  {/* Online members */}
                  <div className="rounded-xl border border-gray-700/50 bg-[#0D1117] p-6">
                    <div className="mb-4 flex items-center space-x-2">
                      <div className="h-2 w-2 rounded-full bg-[#57F287]" />
                      <h3 className="text-lg font-bold text-white">Online Members</h3>
                    </div>
                    <div className="space-y-3">
                      {onlineMembers.slice(0, 6).map((member, index) => {
                        const role = member.roles[0]?.role;
                        return (
                          <div key={index} className="flex items-center space-x-3">
                            <div className="relative">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#57F287] to-[#3BA55C] text-xs font-bold text-black">
                                {member.user.username[0]?.toUpperCase()}
                              </div>
                              <div className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-[#0D1117] ${getStatusColor(member.user.status)}`} />
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium text-white">{member.user.username}</span>
                              {role && getRoleIcon(role.name.toLowerCase())}
                            </div>
                          </div>
                        );
                      })}
                      {onlineMembers.length > 6 && (
                        <div className="text-center text-xs text-gray-500 py-2">
                          +{onlineMembers.length - 6} more online
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Join section */}
                  <div className="rounded-xl border border-gray-700/50 bg-[#0D1117] p-6">
                    <SignedIn>
                      <div className="text-center">
                        <div className="mb-4">
                          <CheckCircle className="mx-auto h-12 w-12 text-[#57F287]" />
                        </div>
                        <h3 className="mb-2 text-xl font-bold text-white">Ready to join?</h3>
                        <p className="mb-6 text-gray-400">
                          You'll get access to all channels and can start chatting right away!
                        </p>
                        <div className="flex space-x-3">
                          <button
                            onClick={handleDecline}
                            className="flex-1 rounded-lg border border-gray-600 py-3 text-white transition-colors hover:bg-gray-700/30"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleJoinServer}
                            disabled={isJoining}
                            className="flex flex-1 items-center justify-center space-x-2 rounded-lg bg-[#57F287] py-3 text-black font-bold transition-colors hover:bg-[#3BA55C] disabled:opacity-50"
                          >
                            {isJoining ? (
                              <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                              <>
                                <UserPlus className="h-5 w-5" />
                                <span>Join Server</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </SignedIn>

                    <SignedOut>
                      <div className="text-center">
                        <div className="mb-4">
                          <AlertCircle className="mx-auto h-12 w-12 text-[#FEE75C]" />
                        </div>
                        <h3 className="mb-2 text-xl font-bold text-white">Sign in required</h3>
                        <p className="mb-6 text-gray-400">
                          You need to sign in to join this server
                        </p>
                        <SignInButton mode="modal">
                          <button className="flex w-full items-center justify-center space-x-2 rounded-lg bg-[#5865F2] py-3 text-white font-bold transition-colors hover:bg-[#4752C4]">
                            <ArrowRight className="h-5 w-5" />
                            <span>Sign In to Join</span>
                          </button>
                        </SignInButton>
                      </div>
                    </SignedOut>
                  </div>
                </div>
              </div>

              {/* Enhanced invite info */}
              <div className="mt-8 rounded-lg border border-gray-700/30 bg-gray-900/30 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">
                      Invite code: <span className="font-mono text-[#57F287]">{inviteCode}</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Uses: {invite.uses}{invite.maxUses ? `/${invite.maxUses}` : '/∞'} • 
                      Expires: {invite.expiresAt ? new Date(invite.expiresAt).toLocaleDateString() : 'Never'}
                    </p>
                  </div>
                  <button
                    onClick={copyInviteLink}
                    className="flex items-center space-x-1 text-xs text-gray-400 hover:text-white transition-colors px-3 py-1 rounded-md hover:bg-gray-700/30"
                  >
                    {copySuccess ? (
                      <>
                        <CheckCircle className="h-3 w-3" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImprovedInvitePage;
