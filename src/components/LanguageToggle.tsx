import React from 'react';
import { Globe } from 'lucide-react';
import { useLanguage, Language } from '../lib/i18n';

interface LanguageToggleProps {
  className?: string;
  compact?: boolean;
}

/**
 * Global Beng./Eng. language toggle. Switches the app-wide active language
 * (persisted in localStorage via LanguageProvider).
 */
export const LanguageToggle: React.FC<LanguageToggleProps> = ({ className = '', compact = false }) => {
  const { lang, setLanguage } = useLanguage();
  const target: Language = lang === 'en' ? 'bn' : 'en';
  const label = target === 'bn' ? 'বাংলা' : 'English';

  return (
    <button
      type="button"
      onClick={() => setLanguage(target)}
      title={target === 'bn' ? 'Switch to Bengali' : 'Switch to English'}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold border border-slate-400/30 bg-slate-200/40 text-slate-700 hover:bg-slate-200 transition cursor-pointer ${compact ? 'px-2 py-1' : ''} ${className}`}
    >
      <Globe className="w-3.5 h-3.5" />
      <span>{label}</span>
    </button>
  );
};