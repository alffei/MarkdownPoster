
import React from 'react';
import { WritingTheme, FontSize } from '../types';
import { ThemeRegistry } from '../utils/themeRegistry';

interface WritingAppearancePopoverProps {
  currentTheme: WritingTheme;
  setTheme: (theme: WritingTheme) => void;
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
  isDarkMode: boolean;
  onClose: () => void;
}

export const WritingAppearancePopover: React.FC<WritingAppearancePopoverProps> = ({
  currentTheme,
  setTheme,
  fontSize,
  setFontSize,
  isDarkMode,
  onClose
}) => {
  const allThemes = ThemeRegistry.getWritingThemes();
  const allFontSizes = ThemeRegistry.getFontSizes();

  return (
    <div className={`absolute top-full right-0 mt-2 w-[340px] rounded-xl shadow-2xl border p-5 z-50 animate-in fade-in zoom-in-95 origin-top-right duration-200 select-none
      ${isDarkMode 
        ? 'bg-[#21252b] border-[#181a1f] text-gray-200 shadow-black/50' 
        : 'bg-white border-gray-200 text-gray-800 shadow-gray-200/50'
      }`}
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-bold opacity-90">阅读模式配置</h3>
        <button onClick={onClose} className="opacity-50 hover:opacity-100">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      {/* Theme Selection */}
      <div className="mb-6">
        <label className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-2 block">主题配色</label>
        <div className="grid grid-cols-2 gap-2">
            {allThemes.map((t) => (
                <button
                    key={t.id}
                    onClick={() => setTheme(t.id)}
                    className={`flex items-center gap-3 p-2 rounded-lg border transition-all text-left ${
                        currentTheme === t.id
                        ? 'border-blue-500 ring-1 ring-blue-500'
                        : (isDarkMode ? 'border-gray-700 hover:border-gray-500' : 'border-gray-200 hover:border-gray-300')
                    }`}
                >
                    <div className={`w-8 h-8 rounded-full shadow-sm flex-shrink-0 flex items-center justify-center text-[10px] font-serif font-bold ${t.preview}`}>
                        Aa
                    </div>
                    <span className="text-xs font-medium">{t.name}</span>
                </button>
            ))}
        </div>
      </div>

      {/* Font Size */}
      <div className="mb-2">
           <label className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-2 block">字号</label>
           <div className={`flex p-0.5 rounded-lg border ${isDarkMode ? 'bg-[#2c313a] border-[#181a1f]' : 'bg-gray-100 border-gray-200'}`}>
              {allFontSizes.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setFontSize(option.id)}
                  className={`flex-1 h-7 flex items-center justify-center rounded text-xs font-bold transition-all ${
                    fontSize === option.id 
                      ? (isDarkMode ? 'bg-[#3e4451] shadow-sm text-white' : 'bg-white shadow-sm text-gray-900')
                      : 'opacity-60 hover:opacity-100'
                  }`}
                  title={option.label}
                >
                  {option.label}
                </button>
              ))}
           </div>
      </div>

    </div>
  );
};
