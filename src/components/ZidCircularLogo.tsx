import React from 'react';

interface ZidCircularLogoProps {
  className?: string;
  size?: number;
}

export const ZidCircularLogo: React.FC<ZidCircularLogoProps> = ({ 
  className = '', 
  size = 96 
}) => {
  return (
    <div 
      className={`relative flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
      id="zid-circular-logo-container"
    >
      {/* Outer pulsing ring for elegant depth */}
      <div className="absolute inset-0 rounded-full bg-emerald-400/20 animate-ping opacity-75" />
      
      {/* Premium Outer Glow Ring */}
      <div className="absolute -inset-1.5 rounded-full bg-gradient-to-r from-emerald-500 via-violet-600 to-indigo-500 opacity-60 blur-sm" />
      
      {/* Main SVG Logo Canvas */}
      <svg 
        viewBox="0 0 100 100" 
        className="relative w-full h-full drop-shadow-[0_4px_12px_rgba(0,0,0,0.15)] transition-transform hover:scale-105 duration-300"
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        id="zid-svg-element"
      >
        <defs>
          {/* Main Background Circle Gradient */}
          <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4F46E5" /> {/* Indigo */}
            <stop offset="60%" stopColor="#7C3AED" /> {/* Violet */}
            <stop offset="100%" stopColor="#0F172A" /> {/* Dark Slate */}
          </linearGradient>

          {/* Letter 'Z' Metallic Gradient */}
          <linearGradient id="zLetterGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="40%" stopColor="#F8FAFC" />
            <stop offset="100%" stopColor="#E2E8F0" />
          </linearGradient>

          {/* Glowing Border Gradient */}
          <linearGradient id="borderGradient" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#D4AF37" /> {/* Emerald */}
            <stop offset="100%" stopColor="#4F46E5" /> {/* Indigo */}
          </linearGradient>
        </defs>

        {/* Base Background Circle */}
        <circle 
          cx="50" 
          cy="50" 
          r="46" 
          fill="url(#bgGradient)" 
          stroke="url(#borderGradient)" 
          strokeWidth="3.5" 
        />

        {/* Decorative Internal Dotted Ring */}
        <circle 
          cx="50" 
          cy="50" 
          r="38" 
          fill="none" 
          stroke="rgba(255, 255, 255, 0.12)" 
          strokeWidth="1.5" 
          strokeDasharray="4 3" 
        />

        {/* Stylized Geometric Bold Letter 'Z' */}
        <path 
          d="M32 32 H68 L32 68 H68" 
          stroke="url(#zLetterGradient)" 
          strokeWidth="11" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />

        {/* Aesthetic Diamond Highlight Sparkle */}
        <path 
          d="M68 32 L70 30 L68 28 L66 30 Z" 
          fill="#D4AF37" 
          className="animate-pulse"
        />
      </svg>
    </div>
  );
};
