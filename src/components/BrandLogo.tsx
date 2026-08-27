import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
  subtitle?: string;
  isDarkMode?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showSubtitle = true,
  subtitle = 'Merchant Dashboard',
  isDarkMode = true,
}) => {
  const zidTextSizes = {
    sm: 'text-base font-black',
    md: 'text-xl font-black',
    lg: 'text-2xl font-black',
  };

  const badgeSizes = {
    sm: 'text-xs px-2.5 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-3.5 py-1.5',
  };

  return (
    <div className="flex items-center gap-2.5 bg-transparent">
      <div className="flex items-center gap-2">
        <span className={`tracking-wide ${isDarkMode ? 'text-white' : 'text-slate-900'} ${zidTextSizes[size]}`}>
          ZID
        </span>
        <span className={`bg-amber-400 text-slate-950 font-black rounded-full uppercase shadow-xs inline-flex items-center ${badgeSizes[size]}`}>
          SAAS
          <span className="text-[9px] font-black uppercase ml-0.5 tracking-tighter inline-block align-super">
            BD
          </span>
        </span>
      </div>
      {showSubtitle && subtitle && (
        <div className={`hidden sm:block pl-2 border-l ${isDarkMode ? 'border-slate-700/60 text-slate-400' : 'border-slate-300 text-slate-600'} text-[10px] uppercase tracking-widest font-semibold`}>
          {subtitle}
        </div>
      )}
    </div>
  );
};
