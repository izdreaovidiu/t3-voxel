// Invite Management Component for Server Dashboard
"use client";

import React, { useState } from 'react';
import { 
  Plus, 
  Copy, 
  Trash2, 
  ExternalLink, 
  Users, 
  Clock, 
  Hash,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Settings
} from 'lucide-react';
import { api } from '~/utils/api';

interface InviteManagerProps {
  serverId: string;
  serverName: string;
}

const InviteManager: React.FC<InviteManagerProps> = ({ serverId, serverName }) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newInviteSettings, setNewInviteSettings] = useState({
    maxUses: null as number | null,
    expiresIn: 168, // 7 days default
  });
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  // Fetch server invites
  const { 
    data: invites, 
    isLoading, 
    refetch 
  } = api.server.getServerInvites?.useQuery({ serverId }) || { 
    data: [], 
    isLoading: false, 
    refetch: () => {} 
  };

  // Create invite mutation
  const createInviteMutation = api.server.createInvite.useMutation({
    onSuccess: () => {
      refetch();
      setShowCreateForm(false);
      setNewInviteSettings({ maxUses: null, expiresIn: 168 });
    },
  });

  // Delete invite mutation
  const deleteInviteMutation = api.server.deleteInvite?.useMutation({
    onSuccess: () => {
      refetch();
    },
  }) || { mutate: () => {}, isLoading: false };

  const handleCreateInvite = () => {
    createInviteMutation.mutate({
      serverId,
      maxUses: newInviteSettings.maxUses,
      expiresIn: newInviteSettings.expiresIn,
    });
  };

  const copyInviteLink = async (code: string) => {
    try {
      const url = `${window.location.origin}/invite/${code}`;
      await navigator.clipboard.writeText(url);
      setCopySuccess(code);
      setTimeout(() => setCopySuccess(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatExpiresAt = (date: Date | null) => {
    if (!date) return 'Never';
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    
    if (days < 0) return 'Expired';
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    return `${days} days`;
  };

  const getInviteStatus = (invite: any) => {
    const isExpired = invite.expiresAt && invite.expiresAt < new Date();
    const isUsedUp = invite.maxUses && invite.uses >= invite.maxUses;
    
    if (isExpired) return { status: 'Expired', color: 'text-red-400', bg: 'bg-red-500/10' };
    if (isUsedUp) return { status: 'Used Up', color: 'text-orange-400', bg: 'bg-orange-500/10' };
    return { status: 'Active', color: 'text-green-400', bg: 'bg-green-500/10' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Server Invites</h2>
          <p className="text-gray-400 text-sm">
            Manage invite links for {serverName}
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center space-x-2 bg-[#57F287] hover:bg-[#3BA55C] text-black px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Create Invite</span>
        </button>
      </div>

      {/* Create Invite Form */}
      {showCreateForm && (
        <div className="bg-[#161B22] border border-gray-700/50 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Create New Invite</h3>
            <button
              onClick={() => setShowCreateForm(false)}
              className="text-gray-400 hover:text-white"
            >
              <EyeOff className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Max Uses */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Max Uses
              </label>
              <select
                value={newInviteSettings.maxUses || ''}
                onChange={(e) => setNewInviteSettings(prev => ({ 
                  ...prev, 
                  maxUses: e.target.value ? parseInt(e.target.value) : null 
                }))}
                className="w-full bg-[#0D1117] border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-[#57F287] focus:outline-none"
              >
                <option value="">No limit</option>
                <option value="1">1 use</option>
                <option value="5">5 uses</option>
                <option value="10">10 uses</option>
                <option value="25">25 uses</option>
                <option value="50">50 uses</option>
                <option value="100">100 uses</option>
              </select>
            </div>

            {/* Expires In */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Expires In
              </label>
              <select
                value={newInviteSettings.expiresIn}
                onChange={(e) => setNewInviteSettings(prev => ({ 
                  ...prev, 
                  expiresIn: parseInt(e.target.value) 
                }))}
                className="w-full bg-[#0D1117] border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-[#57F287] focus:outline-none"
              >
                <option value="1">1 hour</option>
                <option value="6">6 hours</option>
                <option value="12">12 hours</option>
                <option value="24">1 day</option>
                <option value="168">7 days</option>
                <option value="720">30 days</option>
                <option value="0">Never</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 border border-gray-600 text-white rounded-lg hover:bg-gray-700/30 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateInvite}
              disabled={createInviteMutation.isLoading}
              className="px-4 py-2 bg-[#57F287] hover:bg-[#3BA55C] text-black rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {createInviteMutation.isLoading ? 'Creating...' : 'Create Invite'}
            </button>
          </div>
        </div>
      )}

      {/* Invites List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin h-6 w-6 border-2 border-[#57F287] border-t-transparent rounded-full"></div>
            <p className="text-gray-400 mt-2">Loading invites...</p>
          </div>
        ) : invites && invites.length > 0 ? (
          invites.map((invite) => {
            const status = getInviteStatus(invite);
            return (
              <div
                key={invite.id}
                className="bg-[#161B22] border border-gray-700/50 rounded-lg p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <Hash className="h-4 w-4 text-[#57F287]" />
                      <code className="text-[#57F287] font-mono text-sm bg-gray-900/50 px-2 py-1 rounded">
                        {invite.code}
                      </code>
                      <span className={`text-xs px-2 py-1 rounded-full ${status.color} ${status.bg}`}>
                        {status.status}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-400">
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4" />
                        <span>
                          {invite.uses}{invite.maxUses ? `/${invite.maxUses}` : ''} uses
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4" />
                        <span>Expires {formatExpiresAt(invite.expiresAt)}</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        Created {new Date(invite.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => copyInviteLink(invite.code)}
                      className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/30 rounded-lg transition-colors"
                      title="Copy invite link"
                    >
                      {copySuccess === invite.code ? (
                        <CheckCircle className="h-4 w-4 text-green-400" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                    
                    <button
                      onClick={() => window.open(`/invite/${invite.code}`, '_blank')}
                      className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/30 rounded-lg transition-colors"
                      title="Preview invite"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </button>
                    
                    <button
                      onClick={() => deleteInviteMutation.mutate({ inviteId: invite.id })}
                      disabled={deleteInviteMutation.isLoading}
                      className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Delete invite"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-8 bg-[#161B22] border border-gray-700/50 rounded-lg">
            <AlertCircle className="h-12 w-12 text-gray-500 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-white mb-2">No invites yet</h3>
            <p className="text-gray-400 text-sm mb-4">
              Create your first invite to start inviting people to your server
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center space-x-2 bg-[#57F287] hover:bg-[#3BA55C] text-black px-4 py-2 rounded-lg font-medium transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Create First Invite</span>
            </button>
          </div>
        )}
      </div>

      {/* Invite Statistics */}
      {invites && invites.length > 0 && (
        <div className="bg-[#161B22] border border-gray-700/50 rounded-lg p-6">
          <h3 className="text-lg font-bold text-white mb-4">Invite Statistics</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-[#57F287]">
                {invites.length}
              </div>
              <div className="text-sm text-gray-400">Total Invites</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#57F287]">
                {invites.filter(i => getInviteStatus(i).status === 'Active').length}
              </div>
              <div className="text-sm text-gray-400">Active</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#57F287]">
                {invites.reduce((sum, invite) => sum + invite.uses, 0)}
              </div>
              <div className="text-sm text-gray-400">Total Uses</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#57F287]">
                {invites.filter(i => getInviteStatus(i).status === 'Expired').length}
              </div>
              <div className="text-sm text-gray-400">Expired</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InviteManager;
