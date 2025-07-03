import React, { useState, useRef, useEffect } from "react";
import {
  MoreHorizontal,
  UserPlus,
  Settings,
  Copy,
  Check,
  X,
  Upload,
  Save,
} from "lucide-react";

interface ServerMenuDropdownProps {
  serverId: string;
  serverName: string;
  serverIcon?: string;
  serverColor?: string;
  serverDescription?: string;
  onUpdateServer?: (data: {
    name?: string;
    icon?: string;
    color?: string;
    description?: string;
  }) => void;
}

const ServerMenuDropdown: React.FC<ServerMenuDropdownProps> = ({
  serverId,
  serverName,
  serverIcon,
  serverColor,
  serverDescription,
  onUpdateServer,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);

  // Settings form state
  const [settingsForm, setSettingsForm] = useState({
    name: serverName,
    icon: serverIcon || "",
    color: serverColor || "from-[#5865F2] to-[#4752C4]",
    description: serverDescription || "",
  });

  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const generateInviteLink = async () => {
    setIsGeneratingInvite(true);
    try {
      // Simulate API call to generate invite
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const inviteCode = Math.random().toString(36).substring(2, 15);
      const link = `${window.location.origin}/invite/${inviteCode}`;
      setInviteLink(link);
      setShowInviteModal(true);
    } catch (error) {
      console.error("Failed to generate invite:", error);
    } finally {
      setIsGeneratingInvite(false);
      setIsOpen(false);
    }
  };

  const copyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy invite link:", error);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === "string") {
          setSettingsForm((prev) => ({ ...prev, icon: result }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveSettings = () => {
    onUpdateServer?.(settingsForm);
    setShowSettingsModal(false);
  };

  const colorOptions = [
    "from-[#5865F2] to-[#4752C4]",
    "from-[#57F287] to-[#3BA55C]",
    "from-[#ED4245] to-[#C23237]",
    "from-[#FEE75C] to-[#F1C40F]",
    "from-[#EB459E] to-[#AD1457]",
    "from-[#00BCD4] to-[#0097A7]",
    "from-[#FF9800] to-[#F57C00]",
    "from-[#9C27B0] to-[#6A1B9A]",
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Dropdown Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-white transition-all duration-300 hover:bg-white/20"
      >
        <MoreHorizontal className="h-5 w-5" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-10 right-0 z-50 w-56 rounded-xl border border-gray-700/50 bg-[#161B22] p-2 shadow-2xl backdrop-blur-xl">
          <button
            onClick={generateInviteLink}
            disabled={isGeneratingInvite}
            className="flex w-full items-center space-x-3 rounded-lg px-3 py-2 text-left text-white transition-colors hover:bg-[#21262D] disabled:opacity-50"
          >
            <UserPlus className="h-4 w-4 text-[#57F287]" />
            <span className="text-sm font-medium">
              {isGeneratingInvite ? "Generating..." : "Invite People"}
            </span>
          </button>

          <button
            onClick={() => {
              setShowSettingsModal(true);
              setIsOpen(false);
            }}
            className="flex w-full items-center space-x-3 rounded-lg px-3 py-2 text-left text-white transition-colors hover:bg-[#21262D]"
          >
            <Settings className="h-4 w-4 text-[#5865F2]" />
            <span className="text-sm font-medium">Server Settings</span>
          </button>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-2xl border border-gray-700/50 bg-[#161B22] p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">Invite Friends</h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-700/30 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mb-4 text-sm text-gray-400">
              Send this link to your friends to invite them to {serverName}
            </p>

            <div className="mb-4 flex items-center space-x-2 rounded-lg border border-gray-700/50 bg-[#21262D] p-3">
              <input
                type="text"
                value={inviteLink}
                readOnly
                className="flex-1 bg-transparent text-sm text-white focus:outline-none"
              />
              <button
                onClick={copyInviteLink}
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200 ${
                  copied
                    ? "bg-[#57F287] text-black"
                    : "bg-gray-700 text-white hover:bg-gray-600"
                }`}
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowInviteModal(false)}
                className="flex-1 rounded-lg border border-gray-700/50 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-gray-700/30"
              >
                Close
              </button>
              <button
                onClick={copyInviteLink}
                className="flex-1 rounded-lg bg-[#57F287] py-2 text-center text-sm font-bold text-black transition-colors hover:bg-[#3BA55C]"
              >
                {copied ? "Copied!" : "Copy Link"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Server Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-2xl rounded-2xl border border-gray-700/50 bg-[#161B22] p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">Server Settings</h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-700/30 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Server Icon */}
              <div>
                <label className="mb-2 block text-sm font-medium text-white">
                  Server Icon
                </label>
                <div className="flex items-center space-x-4">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-gray-700/50 bg-[#21262D]">
                    {settingsForm.icon ? (
                      <img
                        src={settingsForm.icon}
                        alt="Server icon"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl">🎮</span>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center space-x-2 rounded-lg bg-[#5865F2] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#4752C4]"
                    >
                      <Upload className="h-4 w-4" />
                      <span>Upload</span>
                    </button>
                    {settingsForm.icon && (
                      <button
                        onClick={() =>
                          setSettingsForm((prev) => ({ ...prev, icon: "" }))
                        }
                        className="rounded-lg border border-gray-700/50 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700/30"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Server Name */}
              <div>
                <label className="mb-2 block text-sm font-medium text-white">
                  Server Name
                </label>
                <input
                  type="text"
                  value={settingsForm.name}
                  onChange={(e) =>
                    setSettingsForm((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-700/50 bg-[#21262D] px-3 py-2 text-white focus:border-[#57F287] focus:outline-none"
                  placeholder="Enter server name"
                />
              </div>

              {/* Server Description */}
              <div>
                <label className="mb-2 block text-sm font-medium text-white">
                  Description
                </label>
                <textarea
                  value={settingsForm.description}
                  onChange={(e) =>
                    setSettingsForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-700/50 bg-[#21262D] px-3 py-2 text-white focus:border-[#57F287] focus:outline-none"
                  placeholder="Enter server description"
                  rows={3}
                />
              </div>

              {/* Server Color */}
              <div>
                <label className="mb-2 block text-sm font-medium text-white">
                  Server Color
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      onClick={() =>
                        setSettingsForm((prev) => ({ ...prev, color }))
                      }
                      className={`h-12 rounded-lg bg-gradient-to-r ${color} transition-all duration-200 ${
                        settingsForm.color === color
                          ? "ring-2 ring-white ring-offset-2 ring-offset-[#161B22]"
                          : "hover:scale-105"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 flex space-x-3">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="flex-1 rounded-lg border border-gray-700/50 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-gray-700/30"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSettings}
                className="flex flex-1 items-center justify-center space-x-2 rounded-lg bg-[#57F287] py-2 text-center text-sm font-bold text-black transition-colors hover:bg-[#3BA55C]"
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

export default ServerMenuDropdown;
