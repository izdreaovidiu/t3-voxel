import React, { useState } from 'react';
import { Circle, ChevronDown } from 'lucide-react';

interface StatusSelectorProps {
  currentStatus: 'online' | 'away' | 'offline';
  onStatusChange?: (status: 'online' | 'away' | 'offline') => void;
  className?: string;
}

const StatusSelector: React.FC<StatusSelectorProps> = ({
  currentStatus,
  onStatusChange,
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const statusOptions = [
    {
      value: 'online' as const,
      label: 'Online',
      color: 'bg-[#57F287]',
      shadowColor: 'shadow-[0_0_6px_rgba(87,242,135,0.6)]',
      textColor: 'text-[#57F287]'
    },
    {
      value: 'away' as const,
      label: 'Away',
      color: 'bg-[#FEE75C]',
      shadowColor: 'shadow-[0_0_6px_rgba(254,231,92,0.6)]',
      textColor: 'text-[#FEE75C]'
    },
    {
      value: 'offline' as const,
      label: 'Offline',
      color: 'bg-gray-500',
      shadowColor: '',
      textColor: 'text-gray-400'
    }
  ];

  const getStatusInfo = (status: string) => {
    return statusOptions.find(opt => opt.value === status) || statusOptions[2];
  };

  const statusInfo = getStatusInfo(currentStatus);

  const handleStatusSelect = (newStatus: 'online' | 'away' | 'offline') => {
    if (onStatusChange) {
      onStatusChange(newStatus);
    }
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Status Display/Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 rounded-lg bg-[#21262D] px-3 py-2 text-sm border border-gray-700/50 hover:border-[#57F287]/50 transition-all duration-200"
      >
        <div className={`h-3 w-3 rounded-full ${statusInfo.color} ${statusInfo.shadowColor} transition-all duration-200`} />
        <span className={`font-medium ${statusInfo.textColor}`}>{statusInfo.label}</span>
        {onStatusChange && (
          <ChevronDown className={`h-3 w-3 ${statusInfo.textColor} transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && onStatusChange && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute bottom-full mb-2 left-0 z-20 w-48 rounded-lg border border-gray-700/50 bg-[#161B22] shadow-xl backdrop-blur-sm">
            <div className="p-2 space-y-1">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleStatusSelect(option.value)}
                  className={`w-full flex items-center space-x-3 rounded-lg px-3 py-2 text-left transition-all duration-200 ${
                    currentStatus === option.value 
                      ? 'bg-[#57F287]/20 border border-[#57F287]/30' 
                      : 'hover:bg-gray-700/30'
                  }`}
                >
                  <div className={`h-4 w-4 rounded-full ${option.color} ${option.shadowColor}`} />
                  <span className={`font-medium ${option.textColor}`}>
                    {option.label}
                  </span>
                  {currentStatus === option.value && (
                    <Circle className={`h-3 w-3 ml-auto ${option.textColor}`} />
                  )}
                </button>
              ))}
            </div>
            
            <div className="border-t border-gray-700/50 p-2">
              <div className="text-xs text-gray-500 px-2">
                Status is synced across all servers
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default StatusSelector;
