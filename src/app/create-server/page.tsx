"use client";

import { SignedIn } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { api } from "~/utils/api";
import { useState, useRef } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { toast } from "sonner";
import { UserSync } from "~/components/auth";
import { Upload, X, Image as ImageIcon, Loader2, Palette } from "lucide-react";
import { ColorPicker } from "~/components/ui/color-picker";

export default function CreateServerPage() {
  const router = useRouter();
  const [serverName, setServerName] = useState("");
  const [serverDescription, setServerDescription] = useState("");
  const [serverIcon, setServerIcon] = useState<string | null>(null);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [serverColor, setServerColor] = useState("from-[#5865F2] to-[#4752C4]");
  const [glowColor, setGlowColor] = useState("#5865F2");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createServerMutation = api.server.createServer.useMutation({
    onSuccess: (data) => {
      toast.success(`Server "${data.name}" created successfully!`);
      router.push(`/dashboard/server/${data.id}`);
    },
    onError: (error) => {
      toast.error(`Failed to create server: ${error.message}`);
    },
  });

  // Extract hex color from gradient for glow effect
  const updateColorsFromGradient = (gradient: string) => {
    setServerColor(gradient);
    // Extract first color for glow effect
    const colorMatch = gradient.match(/\[#([A-Fa-f0-9]{6})\]/);
    if (colorMatch) {
      setGlowColor(`#${colorMatch[1]}`);
    }
  };

  const handleIconUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size must be less than 5MB");
        return;
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        toast.error("Please select an image file");
        return;
      }

      setIconFile(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setServerIcon(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeIcon = () => {
    setServerIcon(null);
    setIconFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getPreviewIcon = () => {
    if (serverIcon) {
      return (
        <img
          src={serverIcon}
          alt="Server icon preview"
          className="h-full w-full object-cover"
        />
      );
    }
    
    if (serverName.trim()) {
      const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(serverName.trim())}&background=5865F2&color=fff&size=128`;
      return (
        <img
          src={avatarUrl}
          alt="Generated server icon"
          className="h-full w-full object-cover"
        />
      );
    }
    
    return (
      <ImageIcon className="h-8 w-8 text-gray-500" />
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serverName.trim()) return;

    try {
      await createServerMutation.mutateAsync({
        name: serverName.trim(),
        description: serverDescription.trim() || undefined,
        icon: serverIcon || `https://ui-avatars.com/api/?name=${encodeURIComponent(serverName.trim())}&background=5865F2&color=fff&size=128`,
        color: serverColor,
        glowColor: glowColor,
      });
    } catch (error) {
      console.error('Create server error:', error);
    }
  };

  return (
    <SignedIn>
      <UserSync>
        <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-[#0D1117] via-[#161B22] to-[#21262D] p-4">
          <div className="w-full max-w-lg space-y-8 rounded-2xl border border-gray-700/50 bg-[#21262D]/80 p-8 shadow-2xl backdrop-blur-sm">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-white">Create Your Server</h1>
              <p className="mt-2 text-gray-400">
                Give your community a home with a custom server.
              </p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Server Icon Upload */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-300">
                  Server Icon
                </label>
                <div className="flex flex-col items-center space-y-4">
                  <div className="relative">
                    <div className="h-24 w-24 overflow-hidden rounded-xl border-2 border-gray-600 bg-gray-800/50 flex items-center justify-center">
                      {getPreviewIcon()}
                    </div>
                    {serverIcon && (
                      <button
                        type="button"
                        onClick={removeIcon}
                        className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="border-gray-600 bg-gray-800 text-gray-300 hover:bg-gray-700"
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Image
                    </Button>
                  </div>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleIconUpload}
                    className="hidden"
                  />
                  
                  <p className="text-xs text-gray-500">
                    Recommended: Square image, at least 128x128px, max 5MB
                  </p>
                </div>
              </div>

              {/* Server Name */}
              <div className="space-y-2">
                <label htmlFor="server-name" className="block text-sm font-medium text-gray-300">
                  Server Name *
                </label>
                <Input
                  id="server-name"
                  type="text"
                  value={serverName}
                  onChange={(e) => setServerName(e.target.value)}
                  placeholder="My Awesome Server"
                  className="border-gray-600 bg-gray-800 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500"
                  required
                  minLength={2}
                  maxLength={100}
                />
              </div>

              {/* Server Description */}
              <div className="space-y-2">
                <label htmlFor="server-description" className="block text-sm font-medium text-gray-300">
                  Server Description
                </label>
                <Textarea
                  id="server-description"
                  value={serverDescription}
                  onChange={(e) => setServerDescription(e.target.value)}
                  placeholder="Tell people what your server is about..."
                  className="border-gray-600 bg-gray-800 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500"
                  rows={3}
                  maxLength={500}
                />
                <p className="text-xs text-gray-500">
                  {serverDescription.length}/500 characters
                </p>
              </div>

              {/* Server Color */}
              <ColorPicker
                value={serverColor}
                onChange={updateColorsFromGradient}
                label="Server Theme Color"
              />

              {/* Color Preview */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Color Preview
                </label>
                <div className="flex items-center space-x-4 rounded-lg border border-gray-600 bg-gray-800 p-4">
                  <div className="flex-1">
                    <div 
                      className={`h-16 w-full rounded-lg bg-gradient-to-r ${serverColor} shadow-lg`}
                      style={{
                        boxShadow: `0 10px 25px -5px ${glowColor}40, 0 0 20px ${glowColor}20`
                      }}
                    />
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-400 mb-1">Glow Effect</div>
                    <div 
                      className="h-8 w-8 rounded-full mx-auto"
                      style={{
                        backgroundColor: glowColor,
                        boxShadow: `0 0 20px ${glowColor}60`
                      }}
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  This is how your server will appear in the dashboard
                </p>
              </div>
              
              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={createServerMutation.isPending}
                  className="border-gray-600 bg-gray-800 text-gray-300 hover:bg-gray-700"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createServerMutation.isPending || !serverName.trim()}
                  className="bg-[#5865F2] hover:bg-[#4752C4]"
                >
                  {createServerMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Palette className="mr-2 h-4 w-4" />
                      Create Server
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </UserSync>
    </SignedIn>
  );
}
