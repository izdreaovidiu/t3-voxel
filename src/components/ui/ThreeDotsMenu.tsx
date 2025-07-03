// src/components/ui/ThreeDotsMenu.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  MoreHorizontal, 
  Users, 
  Settings, 
  Bell, 
  Shield, 
  Palette, 
  Download, 
  Share2, 
  Heart, 
  Coffee, 
  Zap,
  Sparkles,
  Gamepad2,
  Music,
  Camera,
  Gift
} from 'lucide-react';

interface ThreeDotsMenuProps {
  trigger?: React.ReactNode;
  onFriendsClick?: () => void;
  onSettingsClick?: () => void;
  className?: string;
}

export const ThreeDotsMenu: React.FC<ThreeDotsMenuProps> = ({
  trigger,
  onFriendsClick,
  onSettingsClick,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setActiveCategory(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const menuItems = [
    {
      category: 'Social',
      icon: Users,
      items: [
        { icon: Users, label: 'Friends', action: onFriendsClick, color: 'text-[#57F287]' },
        { icon: Share2, label: 'Invite Friends', action: () => console.log('Invite'), color: 'text-blue-400' },
        { icon: Heart, label: 'Favorites', action: () => console.log('Favorites'), color: 'text-pink-400' },
        { icon: Gift, label: 'Send Gift', action: () => console.log('Gift'), color: 'text-yellow-400' }
      ]
    },
    {
      category: 'Settings',
      icon: Settings,
      items: [
        { icon: Settings, label: 'Preferences', action: onSettingsClick, color: 'text-gray-400' },
        { icon: Bell, label: 'Notifications', action: () => console.log('Notifications'), color: 'text-orange-400' },
        { icon: Shield, label: 'Privacy', action: () => console.log('Privacy'), color: 'text-red-400' },
        { icon: Palette, label: 'Themes', action: () => console.log('Themes'), color: 'text-purple-400' }
      ]
    },
    {
      category: 'Fun',
      icon: Sparkles,
      items: [
        { icon: Gamepad2, label: 'Games', action: () => console.log('Games'), color: 'text-green-400' },
        { icon: Music, label: 'Music Bot', action: () => console.log('Music'), color: 'text-indigo-400' },
        { icon: Camera, label: 'Screenshots', action: () => console.log('Screenshots'), color: 'text-cyan-400' },
        { icon: Coffee, label: 'Status Cafe', action: () => console.log('Cafe'), color: 'text-amber-400' }
      ]
    },
    {
      category: 'Power',
      icon: Zap,
      items: [
        { icon: Download, label: 'Export Data', action: () => console.log('Export'), color: 'text-gray-300' },
        { icon: Zap, label: 'Developer Tools', action: () => console.log('Dev'), color: 'text-yellow-300' },
        { icon: Sparkles, label: 'Easter Eggs', action: () => triggerEasterEgg(), color: 'text-pink-300' }
      ]
    }
  ];

  const triggerEasterEgg = () => {
    // Fun easter egg animation
    const body = document.body;
    body.style.animation = 'rainbow-bg 2s ease-in-out';
    
    // Create floating icons
    for (let i = 0; i < 20; i++) {
      const icon = document.createElement('div');
      icon.innerHTML = '✨';
      icon.style.position = 'fixed';
      icon.style.left = Math.random() * 100 + 'vw';
      icon.style.top = Math.random() * 100 + 'vh';
      icon.style.fontSize = '24px';
      icon.style.pointerEvents = 'none';
      icon.style.zIndex = '9999';
      icon.style.animation = 'float-away 3s ease-out forwards';
      document.body.appendChild(icon);
      
      setTimeout(() => icon.remove(), 3000);
    }
    
    setTimeout(() => {
      body.style.animation = '';
    }, 2000);
    
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={menuRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn-interactive flex h-10 w-10 items-center justify-center rounded-lg text-gray-400 transition-all duration-300 hover:bg-gray-700/50 hover:text-[#57F287] hover:shadow-[0_0_10px_rgba(87,242,135,0.2)] hover:rotate-90"
      >
        {trigger || <MoreHorizontal className="h-5 w-5" />}
      </button>

      {/* Main Menu */}
      {isOpen && (
        <div className="absolute top-12 right-0 z-50 w-80 animate-modal-in">
          <div className="rounded-2xl border border-gray-700/50 bg-gradient-to-br from-[#161B22] via-[#21262D] to-[#0D1117] p-4 shadow-2xl backdrop-blur-sm">
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <Sparkles className="h-5 w-5 text-[#57F287] animate-pulse-glow" />
                <span>Voxel Hub</span>
              </h3>
              <div className="text-xs text-gray-400">✨ Get creative!</div>
            </div>

            {/* Categories Grid */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {menuItems.map((category) => (
                <button
                  key={category.category}
                  onClick={() => setActiveCategory(activeCategory === category.category ? null : category.category)}
                  className={`group relative overflow-hidden rounded-xl border p-4 transition-all duration-300 hover-lift ${
                    activeCategory === category.category
                      ? 'border-[#57F287]/50 bg-[#57F287]/10 shadow-[0_0_20px_rgba(87,242,135,0.2)]'
                      : 'border-gray-700/50 bg-gray-800/30 hover:border-gray-600/50'
                  }`}
                >
                  <div className="relative z-10">
                    <category.icon className={`h-6 w-6 mb-2 transition-colors ${
                      activeCategory === category.category ? 'text-[#57F287]' : 'text-gray-400 group-hover:text-white'
                    }`} />
                    <div className={`text-sm font-medium transition-colors ${
                      activeCategory === category.category ? 'text-[#57F287]' : 'text-gray-300 group-hover:text-white'
                    }`}>
                      {category.category}
                    </div>
                    <div className="text-xs text-gray-500">{category.items.length} items</div>
                  </div>
                  
                  {/* Hover effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-[#57F287]/5 to-[#3BA55C]/5 opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
              ))}
            </div>

            {/* Active Category Items */}
            {activeCategory && (
              <div className="animate-modal-in space-y-1">
                <div className="mb-3 flex items-center space-x-2 text-sm font-medium text-[#57F287]">
                  <div className="h-1 w-1 rounded-full bg-[#57F287] animate-pulse-glow" />
                  <span>{activeCategory} Options</span>
                </div>
                
                {menuItems.find(cat => cat.category === activeCategory)?.items.map((item, index) => (
                  <button
                    key={index}
                    onClick={item.action}
                    className="group w-full flex items-center space-x-3 p-3 rounded-lg text-left transition-all duration-200 hover:bg-gray-700/30 hover:shadow-lg hover:shadow-[#57F287]/10"
                  >
                    <item.icon className={`h-4 w-4 transition-colors ${item.color} group-hover:scale-110`} />
                    <span className="text-white group-hover:text-[#57F287] transition-colors">{item.label}</span>
                    <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="h-1 w-1 rounded-full bg-[#57F287] animate-pulse-glow" />
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Footer */}
            <div className="mt-4 pt-4 border-t border-gray-700/50">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Voxel Chat v2.0</span>
                <div className="flex items-center space-x-1">
                  <div className="h-1 w-1 rounded-full bg-[#57F287] animate-pulse-glow" />
                  <span>Online</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Add CSS for easter egg animations
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes rainbow-bg {
      0% { filter: hue-rotate(0deg); }
      25% { filter: hue-rotate(90deg); }
      50% { filter: hue-rotate(180deg); }
      75% { filter: hue-rotate(270deg); }
      100% { filter: hue-rotate(360deg); }
    }
    
    @keyframes float-away {
      0% { 
        transform: translateY(0) rotate(0deg) scale(1); 
        opacity: 1; 
      }
      100% { 
        transform: translateY(-100vh) rotate(360deg) scale(0); 
        opacity: 0; 
      }
    }
  `;
  document.head.appendChild(style);
}
