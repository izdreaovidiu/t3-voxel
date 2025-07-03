import { useState, useRef, useEffect } from "react";

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label: string;
}

export function ColorPicker({ value, onChange, label }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const predefinedColors = [
    {
      name: "Emerald",
      primary: "#10B981",
      secondary: "#059669",
      gradient: "from-[#10B981] to-[#059669]",
    },
    {
      name: "Purple",
      primary: "#8B5CF6",
      secondary: "#7C3AED",
      gradient: "from-[#8B5CF6] to-[#7C3AED]",
    },
    {
      name: "Rose",
      primary: "#F43F5E",
      secondary: "#E11D48",
      gradient: "from-[#F43F5E] to-[#E11D48]",
    },
    {
      name: "Orange",
      primary: "#F97316",
      secondary: "#EA580C",
      gradient: "from-[#F97316] to-[#EA580C]",
    },
    {
      name: "Cyan",
      primary: "#06B6D4",
      secondary: "#0891B2",
      gradient: "from-[#06B6D4] to-[#0891B2]",
    },
    {
      name: "Indigo",
      primary: "#6366F1",
      secondary: "#4F46E5",
      gradient: "from-[#6366F1] to-[#4F46E5]",
    },
    {
      name: "Pink",
      primary: "#EC4899",
      secondary: "#DB2777",
      gradient: "from-[#EC4899] to-[#DB2777]",
    },
    {
      name: "Yellow",
      primary: "#EAB308",
      secondary: "#CA8A04",
      gradient: "from-[#EAB308] to-[#CA8A04]",
    },
    {
      name: "Red",
      primary: "#EF4444",
      secondary: "#DC2626",
      gradient: "from-[#EF4444] to-[#DC2626]",
    },
    {
      name: "Teal",
      primary: "#14B8A6",
      secondary: "#0D9488",
      gradient: "from-[#14B8A6] to-[#0D9488]",
    },
    {
      name: "Slate",
      primary: "#64748B",
      secondary: "#475569",
      gradient: "from-[#64748B] to-[#475569]",
    },
  ];

  const currentColor =
    predefinedColors.find((c) => c.gradient === value) || predefinedColors[0];

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-300">{label}</label>

      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex w-full items-center justify-between rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-white focus:border-blue-500 focus:ring-blue-500"
        >
          <div className="flex items-center space-x-3">
            <div
              className={`h-6 w-6 rounded-full bg-gradient-to-r ${currentColor.gradient} border border-white/20`}
            />
            <span>{currentColor.name}</span>
          </div>
          <svg
            className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-600 bg-gray-800 p-2 shadow-xl">
            <div className="grid grid-cols-3 gap-2">
              {predefinedColors.map((color) => (
                <button
                  key={color.name}
                  type="button"
                  onClick={() => {
                    onChange(color.gradient);
                    setIsOpen(false);
                  }}
                  className={`flex items-center space-x-2 rounded-lg p-2 text-sm transition-colors hover:bg-gray-700 ${
                    currentColor.name === color.name
                      ? "bg-gray-700 ring-2 ring-blue-500"
                      : ""
                  }`}
                >
                  <div
                    className={`h-4 w-4 rounded-full bg-gradient-to-r ${color.gradient} border border-white/20`}
                  />
                  <span className="truncate text-white">{color.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
