import React, { useState } from 'react';
import { ViewMode } from '../types';
import logoUrl from '../assets/logo.png';

interface ToolbarProps {
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onSaveMarkdown: () => void;
  onExportZip: () => void;
  isExportingZip: boolean;
  viewMode: ViewMode;
}

export const Toolbar: React.FC<ToolbarProps> = ({ 
  isDarkMode, 
  onToggleTheme, 
  onSaveMarkdown, 
  onExportZip,
  isExportingZip,
  viewMode
}) => {
  return (
    <div className={`flex flex-col sm:flex-row justify-between items-center p-3 px-6 gap-4 z-50 sticky top-0 transition-colors duration-300 
      ${isDarkMode 
        ? 'bg-[#1e2227] text-[#abb2bf] shadow-md border-b border-black/40' // Dark Mode: One Dark-ish gray
        : 'bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm text-gray-900' // Light Mode
      }`}>
      <div className="flex items-center gap-3 w-full sm:w-auto justify-center sm:justify-start">
        <div className="flex items-center gap-3 select-none">
          {/* Invert logo in Dark Mode for visibility */}
          <img 
            alt="RenRen AI Club" 
            className={`h-10 w-auto object-contain drop-shadow-sm transition-all duration-500 ${isDarkMode ? 'brightness-0 invert opacity-60' : ''}`}
            src={logoUrl} 
          />
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-6">
            <span className={`text-xl font-bold tracking-tight font-sans transition-colors duration-500 ${isDarkMode ? 'text-[#d4cfbf]' : 'text-gray-900'}`}>
              MarkdownPoster
            </span>
            <div className={`relative hidden sm:block transition-colors duration-500 ${isDarkMode ? 'text-[#5c6370]' : 'text-gray-400'}`}>
              {/* 'almost' positioned absolute to the top-left of the subtitle */}
              <span className={`absolute -top-3 -left-3 text-[10px] -rotate-12 font-serif italic font-medium tracking-wide transition-colors duration-500 ${isDarkMode ? 'text-[#c678dd]/70' : 'text-gray-400'}`}>
                almost
              </span>
              <span className="text-xs font-medium tracking-wide">
                最有品位的Md海报生成器
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Save / Export Button Group has been removed as requested, moved to PreviewControlBar */}

        {/* Theme Toggle Button */}
        <button
          onClick={onToggleTheme}
          className={`group relative p-2 rounded-lg transition-all duration-300 focus:outline-none ${
            isDarkMode 
              ? 'text-[#abb2bf] hover:text-[#e5c07b] hover:bg-[#2c313a]' // Earthy hover color for dark mode
              : 'text-gray-400 hover:text-orange-500 hover:bg-orange-50' // Orange hover for light mode (sun)
          }`}
          title={isDarkMode ? "当前：深色模式" : "当前：浅色模式"}
        >
          {isDarkMode ? (
            // Moon Icon (Current Status: Dark)
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
          ) : (
            // Sun Icon (Current Status: Light)
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
          )}
        </button>
      </div>
    </div>
  );
};
