import React, { useId } from 'react';

interface BrandLogoProps {
  logoUrl?: string;
  siteTitle?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  subtitle?: string;
  isDarkMode?: boolean;
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  logoUrl,
  siteTitle = 'ZID SAAS',
  size = 'md',
  showText = false,
  subtitle,
  isDarkMode = true,
  className = '',
}) => {
  const uniqueId = useId().replace(/:/g, '_');

  // Dimension mappings
  const sizeMap = {
    xs: { box: 'w-6 h-6', icon: 'w-3.5 h-3.5', text: 'text-xs', badge: 'text-[9px]' },
    sm: { box: 'w-8 h-8', icon: 'w-4 h-4', text: 'text-sm', badge: 'text-[10px]' },
    md: { box: 'w-9 h-9', icon: 'w-5 h-5', text: 'text-base', badge: 'text-xs' },
    lg: { box: 'w-11 h-11', icon: 'w-6 h-6', text: 'text-lg', badge: 'text-xs' },
    xl: { box: 'w-14 h-14', icon: 'w-8 h-8', text: 'text-xl', badge: 'text-sm' },
  };

  const { box, text, badge } = sizeMap[size] || sizeMap.md;

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Brand Icon or Custom Logo Image */}
      <div
        className={`${box} rounded-xl relative flex items-center justify-center shrink-0 p-0.5 bg-gradient-to-tr from-[#BF953F] via-[#FCF6BA] to-[#B38728] shadow-md shadow-[#D4AF37]/25 transition-transform hover:scale-105`}
      >
        <div
          className={`w-full h-full rounded-[10px] ${
            isDarkMode ? 'bg-[#141721]' : 'bg-slate-900'
          } flex items-center justify-center overflow-hidden relative`}
        >
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={siteTitle || 'Logo'}
              className="w-full h-full object-contain p-1"
              referrerPolicy="no-referrer"
              onError={(e) => {
                // Fallback to SVG if image fails to load
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <svg
              viewBox="0 0 40 40"
              className="w-full h-full p-1"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id={`zidGoldGrad_${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#BF953F" />
                  <stop offset="50%" stopColor="#FCF6BA" />
                  <stop offset="100%" stopColor="#AA771C" />
                </linearGradient>
              </defs>
              {/* Geometric 'Z' Monogram */}
              <path
                d="M10 12 H30 L16 28 H30"
                stroke={`url(#zidGoldGrad_${uniqueId})`}
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Vertex Accent Dots */}
              <circle cx="30" cy="12" r="2" fill="#FCF6BA" />
              <circle cx="10" cy="28" r="2" fill="#BF953F" />
              <circle cx="20" cy="20" r="1.2" fill="#FFFFFF" fillOpacity="0.8" />
            </svg>
          )}
        </div>
      </div>

      {/* Optional Branding Text */}
      {showText && (
        <div className="flex flex-col text-left">
          <div className="flex items-center gap-1.5">
            <span
              className={`font-black ${
                isDarkMode ? 'text-white' : 'text-slate-900'
              } tracking-tight ${text}`}
            >
              {siteTitle.includes(' ') ? siteTitle.split(' ')[0] : siteTitle}
            </span>
            <span
              className={`font-extrabold text-[#E6C587] uppercase px-1.5 py-0.5 rounded bg-[#D4AF37]/10 border border-[#D4AF37]/25 shadow-sm ${badge}`}
            >
              {siteTitle.includes(' ')
                ? siteTitle.split(' ').slice(1).join(' ')
                : 'SAAS BD'}
            </span>
          </div>
          {subtitle && (
            <p className="text-[11px] text-slate-400 font-medium tracking-normal -mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
