import React, { useState, useRef, useEffect } from 'react';
import {
  MoreHorizontal,
  UserPlus,
  Settings,
  Copy,
  Check,
  X,
  Upload,
  Palette,
  Hash,
  FileText,
  Save,
  Loader2,
} from 'lucide-react';
import { api } from '~/utils/api';

interface ServerDropdownProps {
  server: {
    id: string;
    name: string;
    description?: string;
    icon?: string;
    color?: string;
  };
  onUpdateServer?: (data: { name?: string; description?: string; icon?: string; color?: string }) => void;
}

const ServerDropdown: React.FC<ServerDropdownProps> = ({ server, onUpdateServer }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Settings form state
  const [serverName, setServerName] = useState(server.name);
  const [serverDescription, setServerDescription] = useState(server.description || '');
  const [serverIcon, setServerIcon] = useState(server.icon || '');
  const [serverColor, setServerColor] = useState(server.color || 'from-[#5865F2] to-[#4752C4]');

  // API mutations
  const createInviteMutation = api.server.createInvite.useMutation({
    onSuccess: (data) => {
      const baseUrl = window.location.origin;
      setInviteLink(`${baseUrl}/invite/${data.code}`);
      setIsGeneratingInvite(false);
      console.log('Invite created successfully:', data.code);
    },
    onError: (error) => {
      console.error('Failed to create invite:', error);
      setIsGeneratingInvite(false);
      // Could add a toast notification here
    },
  });

  // Generate invite link
  useEffect(() => {
    if (showInviteModal && !inviteLink && !isGeneratingInvite) {
      setIsGeneratingInvite(true);
      createInviteMutation.mutate({
        serverId: server.id,
        // Default: 7 days, unlimited uses
      });
    }
  }, [showInviteModal, inviteLink, isGeneratingInvite, server.id]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCloseInviteModal = () => {
    setShowInviteModal(false);
    setInviteLink('');
    setCopied(false);
    setIsGeneratingInvite(false);
  };

  const handleCopyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy invite link:', err);
    }
  };

  const handleSaveSettings = () => {
    if (onUpdateServer) {
      onUpdateServer({
        name: serverName,
        description: serverDescription,
        icon: serverIcon,
        color: serverColor,
      });
    }
    setShowSettingsModal(false);
  };

  const colorOptions = [
    { name: 'Blue', value: 'from-[#5865F2] to-[#4752C4]', bg: 'bg-gradient-to-r from-[#5865F2] to-[#4752C4]' },
    { name: 'Green', value: 'from-[#57F287] to-[#3BA55C]', bg: 'bg-gradient-to-r from-[#57F287] to-[#3BA55C]' },
    { name: 'Purple', value: 'from-[#9333EA] to-[#7C3AED]', bg: 'bg-gradient-to-r from-[#9333EA] to-[#7C3AED]' },
    { name: 'Red', value: 'from-[#EF4444] to-[#DC2626]', bg: 'bg-gradient-to-r from-[#EF4444] to-[#DC2626]' },
    { name: 'Orange', value: 'from-[#F97316] to-[#EA580C]', bg: 'bg-gradient-to-r from-[#F97316] to-[#EA580C]' },
    { name: 'Pink', value: 'from-[#EC4899] to-[#DB2777]', bg: 'bg-gradient-to-r from-[#EC4899] to-[#DB2777]' },
    { name: 'Cyan', value: 'from-[#06B6D4] to-[#0891B2]', bg: 'bg-gradient-to-r from-[#06B6D4] to-[#0891B2]' },
    { name: 'Yellow', value: 'from-[#EAB308] to-[#CA8A04]', bg: 'bg-gradient-to-r from-[#EAB308] to-[#CA8A04]' },
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Dropdown Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-white transition-all duration-300 hover:bg-white/20"
      >
        <MoreHorizontal className="h-5 w-5" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-10 z-50 w-56 rounded-xl border border-gray-700/50 bg-[#161B22] p-2 shadow-2xl backdrop-blur-xl">
          <button
            onClick={() => {
              setShowInviteModal(true);
              setIsOpen(false);
            }}
            className="flex w-full items-center space-x-3 rounded-lg px-3 py-2 text-left text-white transition-colors hover:bg-gray-700/30"
          >
            <UserPlus className="h-4 w-4 text-[#57F287]" />
            <span className="text-sm font-medium">Invite People</span>
          </button>

          <button
            onClick={() => {
              setShowSettingsModal(true);
              setIsOpen(false);
            }}
            className="flex w-full items-center space-x-3 rounded-lg px-3 py-2 text-left text-white transition-colors hover:bg-gray-700/30"
          >
            <Settings className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-medium">Server Settings</span>
          </button>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-2xl border border-gray-700/50 bg-[#161B22] p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Invite People</h3>
              <button
                onClick={handleCloseInviteModal}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-700/30 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mb-4 text-sm text-gray-400">
              Share this link to invite people to your server
            </p>

            <div className="mb-4 flex items-center space-x-2 rounded-lg border border-gray-700/50 bg-[#0D1117] p-3">
              {isGeneratingInvite ? (
                <div className="flex flex-1 items-center justify-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin text-[#57F287]" />
                  <span className="text-sm text-gray-400">Generating invite...</span>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    value={inviteLink}
                    readOnly
                    className="flex-1 bg-transparent text-sm text-white focus:outline-none"
                  />
                  <button
                    onClick={handleCopyInvite}
                    disabled={!inviteLink}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                      copied
                        ? 'bg-[#57F287] text-black'
                        : 'bg-gray-700 text-white hover:bg-gray-600 disabled:opacity-50'
                    }`}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>
                </>
              )}
            </div>

            <div className="text-xs text-gray-500">
              This link will expire in 7 days and can be used unlimited times.
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-lg rounded-2xl border border-gray-700/50 bg-[#161B22] p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Server Settings</h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-700/30 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Server Icon */}
              <div>
                <label className="mb-2 block text-sm font-medium text-white">Server Icon</label>
                <div className="flex items-center space-x-4">
                  <div className="h-16 w-16 flex items-center justify-center rounded-xl overflow-hidden bg-white/10">
                    {serverIcon && (serverIcon.startsWith('data:image/') || serverIcon.startsWith('http://') || serverIcon.startsWith('https://')) ? (
                      <img 
                        src={serverIcon} 
                        alt="Server icon"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl">{serverIcon || "🎮"}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={serverIcon}
                      onChange={(e) => setServerIcon(e.target.value)}
                      placeholder="Enter emoji or image URL"
                      className="w-full rounded-lg border border-gray-700/50 bg-[#0D1117] px-3 py-2 text-white placeholder-gray-400 focus:border-[#57F287] focus:outline-none"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Use an emoji or paste an image URL
                    </p>
                  </div>
                </div>
              </div>

              {/* Server Name */}
              <div>
                <label className="mb-2 block text-sm font-medium text-white">Server Name</label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={serverName}
                    onChange={(e) => setServerName(e.target.value)}
                    className="w-full rounded-lg border border-gray-700/50 bg-[#0D1117] py-2 pl-10 pr-3 text-white placeholder-gray-400 focus:border-[#57F287] focus:outline-none"
                    placeholder="Enter server name"
                  />
                </div>
              </div>

              {/* Server Description */}
              <div>
                <label className="mb-2 block text-sm font-medium text-white">Description</label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <textarea
                    value={serverDescription}
                    onChange={(e) => setServerDescription(e.target.value)}
                    className="w-full rounded-lg border border-gray-700/50 bg-[#0D1117] py-2 pl-10 pr-3 text-white placeholder-gray-400 focus:border-[#57F287] focus:outline-none"
                    placeholder="What's your server about?"
                    rows={3}
                  />
                </div>
              </div>

              {/* Server Color */}
              <div>
                <label className="mb-3 block text-sm font-medium text-white">Server Color</label>
                <div className="grid grid-cols-4 gap-3">
                  {colorOptions.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setServerColor(color.value)}
                      className={`h-12 w-full rounded-lg ${color.bg} relative transition-all duration-200 hover:scale-105 ${
                        serverColor === color.value
                          ? 'ring-2 ring-white ring-offset-2 ring-offset-[#161B22]'
                          : ''
                      }`}
                      title={color.name}
                    >
                      {serverColor === color.value && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Check className="h-5 w-5 text-white drop-shadow-lg" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex space-x-3">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="flex-1 rounded-lg border border-gray-700/50 bg-transparent py-2 text-white transition-colors hover:bg-gray-700/30"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSettings}
                className="flex flex-1 items-center justify-center space-x-2 rounded-lg bg-[#57F287] py-2 text-black font-medium transition-colors hover:bg-[#3BA55C]"
              >
                <Save className="h-4 w-4" />
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServerDropdown;
