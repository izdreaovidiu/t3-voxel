"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { SignedIn, SignedOut, SignInButton, SignUpButton, useUser } from '@clerk/nextjs';
import { 
  Users, 
  Hash, 
  Crown, 
  Shield, 
  UserPlus,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  Copy,
} from 'lucide-react';
import { api } from '~/utils/api';

const NewInvitePage: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [isJoining, setIsJoining] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [hasAttemptedAutoJoin, setHasAttemptedAutoJoin] = useState(false);
  const inviteCode = params.code as string;

  console.log('🔍 New Invite page loaded with code:', inviteCode);

  // FIRST: Get invite details using the public procedure - MOVED TO TOP
  const {
    data: invite,
    isLoading,
    error,
    refetch
  } = api.server.getInvitePublic.useQuery(
    { inviteCode },
    {
      enabled: !!inviteCode,
      retry: 2,
      retryDelay: 1000,
      refetchOnWindowFocus: false,
      refetchOnMount: true,
    }
  );

  // Join server mutation using the new procedure
  const joinServerMutation = api.server.joinServerViaInvite.useMutation({
    onSuccess: (data) => {
      console.log('✅ Successfully joined server:', data);
      // Always redirect to the server dashboard, regardless of whether user was already a member
      const redirectUrl = `/dashboard/server/${data.serverId}`;
      console.log('🔄 Redirecting to:', redirectUrl);
      router.push(redirectUrl);
    },
    onError: (error) => {
      console.error('❌ Failed to join server:', error);
      setIsJoining(false);
    },
  });

  const handleJoinServer = async () => {
    if (!user || !invite) {
      console.log('⚠️ Cannot join server: missing user or invite', { hasUser: !!user, hasInvite: !!invite });
      return;
    }
    
    console.log('🚪 Attempting to join server...', { userId: user.id, inviteCode });
    setIsJoining(true);
    joinServerMutation.mutate({ inviteCode });
  };

  const handleDecline = () => {
    router.push('/dashboard');
  };

  // Auto-join effect when user becomes authenticated - NOW SAFE TO USE invite
  useEffect(() => {
    if (isLoaded && user && invite && !hasAttemptedAutoJoin && !isJoining) {
      console.log('🚀 User is authenticated and invite is loaded, attempting auto-join...');
      setHasAttemptedAutoJoin(true);
      
      // Inline the join logic to avoid function dependency issues
      console.log('🚪 Auto-joining server...', { userId: user.id, inviteCode });
      setIsJoining(true);
      joinServerMutation.mutate({ inviteCode });
    }
  }, [isLoaded, user, invite, hasAttemptedAutoJoin, isJoining, inviteCode, joinServerMutation]);

  // Reset auto-join flag when invite code changes
  useEffect(() => {
    setHasAttemptedAutoJoin(false);
  }, [inviteCode]);

  console.log('📊 Query state:', { isLoading, error: error?.message, hasInvite: !!invite });

  const copyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const renderServerIcon = (icon: string | null | undefined) => {
    if (!icon) return "🎮";
    
    // If it's an emoji (length <= 4 and contains unicode emojis), render it directly
    if (icon.length <= 4 && /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(icon)) {
      return (
        <span className="text-4xl">{icon}</span>
      );
    }
    
    // If it's a URL, render as image
    if (icon.startsWith('http')) {
      return (
        <img 
          src={icon} 
          alt="Server icon" 
          className="w-full h-full object-cover rounded-xl"
          onError={(e) => {
            // Fallback to emoji if image fails
            const target = e.currentTarget;
            target.style.display = 'none';
            if (target.parentElement) {
              target.parentElement.innerHTML = '<span class="text-4xl">🎮</span>';
            }
          }}
        />
      );
    }
    
    // For any other string, treat as emoji and render directly
    return (
      <span className="text-4xl">{icon}</span>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0D1117] text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#57F287] mx-auto mb-4" />
          <p className="text-gray-400">Loading invite...</p>
          <p className="text-sm text-gray-500 mt-2 font-mono">{inviteCode}</p>
        </div>
      </div>
    );
  }

  // Error handling
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
                    <span>Copy</span>
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
              onClick={() => refetch()}
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
          </div>
        </div>
      </div>
    );
  }

  const server = invite.server;

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
                background: server.color ? 
                  `linear-gradient(135deg, ${server.color.includes('from-') ? server.color.replace('from-', '').replace('to-', '').split(' ')[0] : '#5865F2'} 0%, ${server.color.includes('to-') ? server.color.split(' ')[1] || '#4752C4' : '#4752C4'} 100%)` :
                  'linear-gradient(135deg, #5865F2 0%, #4752C4 100%)'
              }}
            >
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-white/10 text-4xl backdrop-blur-sm overflow-hidden">
                {renderServerIcon(server.icon)}
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
                {/* Left side - Server stats */}
                <div className="space-y-6">
                  <div className="rounded-xl border border-gray-700/50 bg-[#0D1117] p-6">
                    <div className="mb-4 flex items-center space-x-2">
                      <Users className="h-5 w-5 text-[#57F287]" />
                      <h3 className="text-lg font-bold text-white">Server Stats</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-[#57F287]">{server._count?.members || 0}</div>
                        <div className="text-sm text-gray-400">Members</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-[#57F287]">
                          {Math.floor((server._count?.members || 0) * 0.3)}
                        </div>
                        <div className="text-sm text-gray-400">Online</div>
                      </div>
                    </div>
                  </div>

                  {/* Invite info */}
                  <div className="rounded-xl border border-gray-700/50 bg-[#0D1117] p-6">
                    <div className="mb-4 flex items-center space-x-2">
                      <Hash className="h-5 w-5 text-[#57F287]" />
                      <h3 className="text-lg font-bold text-white">Invite Details</h3>
                    </div>
                    <div className="space-y-2 text-sm text-gray-400">
                      <div>
                        <span className="text-gray-300">Invited by:</span> {invite.inviter.username}
                      </div>
                      <div>
                        <span className="text-gray-300">Uses:</span> {invite.uses}{invite.maxUses ? `/${invite.maxUses}` : '/∞'}
                      </div>
                      <div>
                        <span className="text-gray-300">Expires:</span> {invite.expiresAt ? new Date(invite.expiresAt).toLocaleDateString() : 'Never'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right side - Join section */}
                <div className="space-y-6">
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
                        
                        <div className="space-y-3">
                          <SignInButton 
                            mode="modal"
                            forceRedirectUrl={typeof window !== 'undefined' ? window.location.href : ''}
                          >
                            <button className="flex w-full items-center justify-center space-x-2 rounded-lg bg-[#5865F2] py-3 text-white font-bold transition-colors hover:bg-[#4752C4]">
                              <ArrowRight className="h-5 w-5" />
                              <span>Sign In</span>
                            </button>
                          </SignInButton>

                          <div className="text-center text-gray-500">or</div>

                          <SignUpButton 
                            mode="modal"
                            forceRedirectUrl={typeof window !== 'undefined' ? window.location.href : ''}
                          >
                            <button className="flex w-full items-center justify-center space-x-2 rounded-lg bg-gray-600 py-3 text-white font-bold transition-colors hover:bg-gray-700">
                              <UserPlus className="h-5 w-5" />
                              <span>Create Account</span>
                            </button>
                          </SignUpButton>
                        </div>
                      </div>
                    </SignedOut>
                  </div>
                </div>
              </div>

              {/* Invite code copy section */}
              <div className="mt-8 rounded-lg border border-gray-700/30 bg-gray-900/30 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">
                      Invite code: <span className="font-mono text-[#57F287]">{inviteCode}</span>
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

export default NewInvitePage;