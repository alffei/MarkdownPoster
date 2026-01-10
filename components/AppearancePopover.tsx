
import React, { useState, useMemo } from 'react';
import { BorderTheme, FontSize, LayoutTheme, PaddingSize, WatermarkAlign, SpacingLevel, PosterTemplate } from '../types';
import { ThemeRegistry } from '../utils/themeRegistry';
import { HEADER_PRESETS } from '../config/headerPresets';

interface AppearancePopoverProps {
  currentTheme: BorderTheme;
  setTheme: (theme: BorderTheme) => void;
  layoutTheme: LayoutTheme;
  setLayoutTheme: (theme: LayoutTheme) => void;
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
  padding: PaddingSize;
  setPadding: (val: PaddingSize) => void;
  spacing: SpacingLevel;
  setSpacing: (val: SpacingLevel) => void;
  showWatermark: boolean;
  setShowWatermark: (show: boolean) => void;
  watermarkText: string;
  setWatermarkText: (text: string) => void;
  watermarkAlign: WatermarkAlign;
  setWatermarkAlign: (align: WatermarkAlign) => void;
  isDarkMode: boolean;
  onClose: () => void;
  
  // New props for custom color
  customThemeColor?: string;
  setCustomThemeColor?: (color: string) => void;

  // New template handler
  onApplyTemplate: (template: PosterTemplate) => void;
}

const ScenarioOptions = [
    { label: '全部', value: 'All' },
    { label: '学习长文', value: 'LongText' },
    { label: '技术教程', value: 'Tech' },
    { label: '社媒分享', value: 'Social' }
];

const FeatureOptions = [
    { label: '全部', value: 'All' },
    { label: '标题栏', value: 'TitleBar' },
    { label: '浅色', value: 'Light' },
    { label: '暗色', value: 'Dark' },
    { label: '复古', value: 'Retro' },
    { label: '高饱和', value: 'HighSat' },
    { label: '极简', value: 'Minimal' },
    { label: '可改色', value: 'CustomColor' }
];

// Helper component to render the "Mini Poster" preview
const ThemeThumbnail = ({ 
    themeId, 
    label,
    isActive, 
    isDarkMode 
}: { 
    themeId: string, 
    label: string,
    isActive: boolean, 
    isDarkMode: boolean 
}) => {
    // Hardcoded styling logic for the thumbnail to ensure it looks exactly like the design
    // regardless of the complex CSS classes used in the actual render.
    
    const getThumbnailStyle = () => {
        switch(themeId) {
            case 'MacOS': return {
                frame: 'bg-gray-100',
                card: 'bg-white rounded border border-gray-200 shadow-sm',
                header: (
                    <div className="flex gap-0.5 pl-1">
                        <div className="w-1 h-1 rounded-full bg-red-400"></div>
                        <div className="w-1 h-1 rounded-full bg-yellow-400"></div>
                        <div className="w-1 h-1 rounded-full bg-green-400"></div>
                    </div>
                ),
                isDark: false
            };
            case 'Win11': return {
                frame: 'bg-[#f3f3f3]',
                card: 'bg-white rounded-sm border border-gray-300 shadow-sm',
                header: (
                     <div className="flex gap-0.5 ml-auto pr-1">
                        <div className="w-1 h-1 bg-gray-300 rounded-[1px]"></div>
                        <div className="w-1 h-1 bg-red-400 rounded-[1px]"></div>
                    </div>
                ),
                isDark: false
            };
            case 'Minimal': return {
                frame: 'bg-white',
                card: 'bg-white border border-gray-200 shadow-sm',
                header: null,
                isDark: false
            };
            case 'Sketch': return {
                frame: 'bg-[#f5f5f4]',
                card: 'bg-white border-2 border-gray-800 rounded-[2px]',
                header: null,
                isDark: false
            };
            case 'Report': return {
                frame: 'bg-[#fbf9f5]',
                card: 'bg-[#fbf9f5] border-none shadow-sm',
                header: null,
                decor: (
                    <>
                        <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t-[1.5px] border-l-[1.5px] border-[#8B1D1D]"></div>
                        <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b-[1.5px] border-r-[1.5px] border-[#8B1D1D]"></div>
                    </>
                ),
                isDark: false
            };
            case 'Ink': return {
                frame: 'bg-[#f4f1e8]',
                card: 'bg-[#fdfbf7] border border-double border-stone-500',
                header: null,
                isDark: false
            };
            case 'Retro': return {
                frame: 'bg-[#fdf6e3]',
                card: 'bg-[#fdf6e3] border border-double border-[#b58900]',
                header: null,
                isDark: false
            };
             case 'Sunset': return {
                frame: 'bg-gradient-to-br from-orange-100 to-rose-100',
                card: 'bg-white/80 rounded-lg border border-orange-200',
                header: (
                    <div className="flex gap-0.5 justify-center w-full">
                        <div className="w-0.5 h-0.5 rounded-full bg-orange-400"></div>
                        <div className="w-0.5 h-0.5 rounded-full bg-rose-400"></div>
                    </div>
                ),
                isDark: false
            };
            case 'Candy': return {
                frame: 'bg-pink-50',
                card: 'bg-white border border-pink-300 rounded-lg',
                header: (
                     <div className="flex justify-between w-full px-1 text-pink-400">
                         <div className="w-1 h-1 border-b border-l border-pink-400 transform rotate-45"></div>
                     </div>
                ),
                isDark: false
            };
            case 'RetroGame': return {
                frame: 'bg-gray-400',
                card: 'bg-gray-200 border-t border-l border-white border-b border-r border-black',
                header: (
                    <div className="bg-blue-900 w-full h-1 flex items-center justify-end px-0.5 mb-0.5">
                        <div className="w-0.5 h-0.5 bg-white"></div>
                    </div>
                ),
                isDark: false
            };
            case 'Glass': return {
                frame: 'bg-gradient-to-br from-indigo-100 to-purple-100',
                card: 'bg-white/40 border border-white rounded-lg',
                header: null,
                isDark: false
            };
            case 'Neon': return {
                frame: 'bg-gray-900',
                card: 'bg-gray-900 border border-pink-500 rounded',
                header: null,
                decor: <div className="absolute inset-0 shadow-[0_0_5px_rgba(236,72,153,0.5)] pointer-events-none rounded"></div>,
                isDark: true
            };
            case 'Aurora': return {
                frame: 'bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600',
                card: 'bg-white/90 rounded border-none',
                header: null,
                isDark: true // Frame is dark
            };
            case 'Radiance': return {
                frame: 'bg-gradient-to-tr from-teal-400 via-blue-500 to-purple-500',
                card: 'bg-white/20 border border-white/30 rounded',
                header: null,
                isDark: true
            };
            default: return {
                frame: 'bg-gray-100',
                card: 'bg-white border border-gray-200',
                header: null,
                isDark: false
            };
        }
    };

    const style = getThumbnailStyle();

    return (
        <div className={`w-full aspect-[4/3] rounded-lg relative p-1.5 flex flex-col items-center justify-center overflow-hidden transition-all duration-200 border-2
            ${isActive 
                ? 'border-blue-500 ring-2 ring-blue-500/20' 
                : (isDarkMode ? 'border-gray-700 group-hover:border-gray-500' : 'border-gray-200 group-hover:border-blue-300')
            }
            ${style.frame}
        `}>
            {/* The Inner Card (Mini Poster) */}
            <div className={`w-full h-full relative flex flex-col overflow-hidden ${style.card}`}>
                
                {/* Header Area */}
                <div className={`h-2.5 w-full flex items-center shrink-0 ${style.header ? 'border-b border-black/5' : ''}`}>
                    {style.header}
                </div>

                {/* Content Area (Label inside illustration) */}
                <div className="flex-1 p-1 flex flex-col items-center justify-center text-center">
                    <span className={`text-[10px] font-bold leading-none tracking-tight select-none break-all line-clamp-2 ${
                        style.isDark || themeId === 'Neon' || themeId === 'Aurora' || themeId === 'Radiance' 
                        ? 'text-white/90 drop-shadow-md' 
                        : 'text-gray-800/90'
                    }`}>
                        {label}
                    </span>
                </div>

                {/* Decorations */}
                {/* @ts-ignore */}
                {style.decor}
            </div>
        </div>
    );
};


export const AppearancePopover: React.FC<AppearancePopoverProps> = ({
  currentTheme,
  setTheme,
  layoutTheme,
  setLayoutTheme,
  fontSize,
  setFontSize,
  padding,
  setPadding,
  spacing,
  setSpacing,
  showWatermark,
  setShowWatermark,
  watermarkText,
  setWatermarkText,
  watermarkAlign,
  setWatermarkAlign,
  isDarkMode,
  onClose,
  customThemeColor,
  setCustomThemeColor,
  onApplyTemplate
}) => {
  // --- Data Loading ---
  const allLayouts = ThemeRegistry.getLayoutThemes();
  const allFontSizes = ThemeRegistry.getFontSizes();
  const allPaddings = ThemeRegistry.getPaddings();
  const allTemplates = ThemeRegistry.getTemplates();
  const currentThemeDef = ThemeRegistry.getBorderTheme(currentTheme);
  const isCustomizable = currentThemeDef?.allowCustomColor || false;

  // --- UI State ---
  const [activeScenario, setActiveScenario] = useState<string>('All');
  const [activeFeature, setActiveFeature] = useState<string>('All');
  const [isFineTuningOpen, setIsFineTuningOpen] = useState(false);

  // --- Filters ---
  const handleScenarioClick = (s: string) => {
    setActiveScenario(s);
    setActiveFeature('All'); // Mutually exclusive reset
  };

  const handleFeatureClick = (f: string) => {
    setActiveFeature(f);
    setActiveScenario('All'); // Mutually exclusive reset
  };

  const filteredTemplates = useMemo(() => {
    return allTemplates.filter(t => {
      // Scenario Filter
      if (activeScenario !== 'All' && t.scenario !== activeScenario) return false;
      // Feature Filter
      if (activeFeature !== 'All') {
          if (!t.features.includes(activeFeature)) return false;
      }
      return true;
    });
  }, [allTemplates, activeScenario, activeFeature]);

  const handleRestoreDefaults = () => {
      const tpl = allTemplates.find(t => t.borderThemeId === currentTheme);
      if (tpl) {
          setFontSize(tpl.defaults.fontSize);
          setPadding(tpl.defaults.padding);
          setSpacing(tpl.defaults.spacing);
          setShowWatermark(tpl.defaults.watermark.show);
          setWatermarkAlign(tpl.defaults.watermark.align);
          if (tpl.defaults.watermark.text) setWatermarkText(tpl.defaults.watermark.text);
      }
  };
  
  // Generate summary string for fine-tuning header
  const getSummaryString = () => {
    const layoutLabel = allLayouts.find(l => l.id === layoutTheme)?.name || layoutTheme;
    const spacingLabel = spacing === 'standard' ? '标准' : spacing === 'compact' ? '紧凑' : '宽松';
    const sizeLabel = allFontSizes.find(s => s.id === fontSize)?.label || '中';
    const padLabel = allPaddings.find(p => p.id === padding)?.label || '中';
    return `${layoutLabel} · ${spacingLabel} · ${sizeLabel} · ${padLabel}`;
  };

  return (
    // Width increased to 600px to accommodate 6 columns
    <div className={`absolute top-full right-0 mt-2 w-[600px] rounded-xl shadow-2xl border flex flex-col z-50 animate-in fade-in zoom-in-95 origin-top-right duration-200 select-none overflow-hidden
      ${isDarkMode 
        ? 'bg-[#21252b] border-[#181a1f] text-gray-200 shadow-black/50' 
        : 'bg-white border-gray-200 text-gray-800 shadow-gray-200/50'
      }`}
    >
      {/* --- HEADER --- */}
      <div className={`flex justify-between items-center px-5 py-3 border-b ${isDarkMode ? 'border-[#3e4451]' : 'border-gray-100'}`}>
        <h3 className="text-sm font-bold opacity-90">自定义海报外观</h3>
        <button onClick={onClose} className="opacity-50 hover:opacity-100">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <div className="flex flex-col max-h-[80vh] overflow-y-auto custom-scrollbar">
          {/* --- TOP SECTION: TEMPLATES --- */}
          <div className="p-5 pb-0">
             
             {/* 1. Theme Style (Template) Header */}
             <div className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-3">主题风格 (模板)</div>

             {/* 2. Filters Row 1: Scenarios */}
             <div className="flex items-center gap-3 mb-3">
                 <span className="text-xs font-medium opacity-60 w-8 flex-shrink-0">场景</span>
                 <div className="flex gap-2 flex-wrap">
                     {ScenarioOptions.map(opt => (
                         <button
                            key={opt.value}
                            onClick={() => handleScenarioClick(opt.value)}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                                activeScenario === opt.value
                                ? (isDarkMode ? 'bg-[#3e4451] text-white' : 'bg-gray-800 text-white')
                                : (isDarkMode ? 'bg-[#2c313a] text-gray-400 hover:text-gray-200' : 'bg-gray-100 text-gray-500 hover:text-gray-900')
                            }`}
                         >
                             {opt.label}
                         </button>
                     ))}
                 </div>
             </div>

             {/* 3. Filters Row 2: Features + Color Picker */}
             <div className="flex items-center gap-3 mb-4">
                 <span className="text-xs font-medium opacity-60 w-8 flex-shrink-0">特征</span>
                 <div className="flex gap-2 flex-wrap flex-1">
                     {FeatureOptions.map(opt => (
                         <button
                            key={opt.value}
                            onClick={() => handleFeatureClick(opt.value)}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                                activeFeature === opt.value
                                ? (isDarkMode ? 'bg-[#3e4451] text-white' : 'bg-gray-800 text-white')
                                : (isDarkMode ? 'bg-[#2c313a] text-gray-400 hover:text-gray-200' : 'bg-gray-100 text-gray-500 hover:text-gray-900')
                            }`}
                         >
                             {opt.label}
                         </button>
                     ))}
                 </div>

                 {/* Divider */}
                 <div className={`w-px h-6 mx-1 ${isDarkMode ? 'bg-[#3e4451]' : 'bg-gray-200'}`}></div>

                 {/* Primary Color Picker (Conditional State) */}
                 <div className="relative group flex items-center justify-center">
                    <div className={`w-6 h-6 rounded-full border shadow-sm transition-all duration-300 flex items-center justify-center overflow-hidden
                        ${isCustomizable 
                            ? 'cursor-pointer hover:scale-110 ring-2 ring-offset-2 ring-transparent hover:ring-blue-400' 
                            : 'cursor-not-allowed opacity-40 grayscale'
                        }
                        ${isDarkMode ? 'ring-offset-[#21252b] border-gray-600' : 'ring-offset-white border-gray-300'}
                    `}
                    style={{ backgroundColor: isCustomizable ? customThemeColor : 'transparent' }}
                    >
                         {/* Icon: Only show faint icon if NOT customizable or no color set (fallback) */}
                         {!isCustomizable && (
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                            </svg>
                         )}
                         {isCustomizable && (
                             <input 
                                type="color" 
                                value={customThemeColor || '#000000'}
                                onChange={(e) => setCustomThemeColor?.(e.target.value)}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                             />
                         )}
                    </div>
                    {/* Tooltip for Filter Logic clarification */}
                    <div className="absolute top-full right-0 mt-2 text-[10px] bg-black text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                        {isCustomizable ? '点击修改主色' : '该主题不支持改色'}
                    </div>
                 </div>
             </div>

             {/* 4. Template Grid (UPDATED: 6 Columns, labels inside) */}
             <div className="grid grid-cols-6 gap-3 mb-6">
                 {filteredTemplates.map(tpl => {
                     const isActive = currentTheme === tpl.borderThemeId && layoutTheme === tpl.layoutThemeId;

                     return (
                         <button
                            key={tpl.id}
                            onClick={() => {
                              onApplyTemplate(tpl);
                              setIsFineTuningOpen(true);
                            }}
                            className={`flex flex-col group text-left transition-all duration-200 ${isActive ? 'scale-105' : 'hover:scale-105'}`}
                            title={tpl.label}
                         >
                             {/* Mini Poster Preview with Label Inside */}
                             <ThemeThumbnail 
                                themeId={tpl.borderThemeId}
                                label={tpl.label}
                                isActive={isActive}
                                isDarkMode={isDarkMode}
                             />
                         </button>
                     )
                 })}
             </div>
          </div>

          {/* --- BOTTOM SECTION: FINE-TUNING --- */}
          <div className={`border-t ${isDarkMode ? 'border-[#3e4451]' : 'border-gray-100'}`}>
             
             {/* Accordion Header */}
             <button 
                onClick={() => setIsFineTuningOpen(!isFineTuningOpen)}
                className={`w-full flex items-center justify-between px-5 py-3 hover:bg-black/5 transition-colors ${
                    isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'
                }`}
             >
                 <div className="flex items-center gap-3">
                     <span className="text-xs font-bold">微调</span>
                     {!isFineTuningOpen && (
                         <span className="text-[10px] opacity-50 font-mono tracking-tight">{getSummaryString()}</span>
                     )}
                 </div>
                 <svg className={`w-4 h-4 transition-transform duration-300 ${isFineTuningOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                 </svg>
             </button>

             {/* Accordion Content */}
             {isFineTuningOpen && (
                 <div className="px-5 pb-5 animate-in slide-in-from-top-2">
                     <div className="flex gap-6">
                         
                         {/* LEFT COLUMN: LAYOUT */}
                         <div className="flex-1 space-y-4">
                             <div className="text-[10px] font-bold uppercase tracking-widest opacity-40">版面</div>
                             
                             {/* Spacing (Density) */}
                             <div className="flex items-center justify-between">
                                 <span className="text-xs font-medium opacity-70">间距</span>
                                 <div className={`flex rounded-md border overflow-hidden ${isDarkMode ? 'bg-[#2c313a] border-[#181a1f]' : 'bg-gray-100 border-gray-200'}`}>
                                     {[
                                         { label: '标准', val: 'standard' },
                                         { label: '紧凑', val: 'compact' },
                                         { label: '宽松', val: 'loose' }
                                     ].map((opt) => (
                                         <button 
                                            key={opt.val}
                                            onClick={() => setSpacing(opt.val as SpacingLevel)}
                                            className={`px-2 py-1 text-[10px] transition-colors ${
                                                spacing === opt.val
                                                ? (isDarkMode ? 'bg-[#3e4451] text-white shadow-sm' : 'bg-white text-gray-900 shadow-sm')
                                                : 'opacity-50 hover:opacity-100'
                                            }`}
                                         >
                                             {opt.label}
                                         </button>
                                     ))}
                                 </div>
                             </div>

                             {/* Font Size */}
                             <div className="flex items-center justify-between">
                                 <span className="text-xs font-medium opacity-70">字号</span>
                                 <div className={`flex rounded-md border overflow-hidden ${isDarkMode ? 'bg-[#2c313a] border-[#181a1f]' : 'bg-gray-100 border-gray-200'}`}>
                                     {allFontSizes.map((opt) => (
                                         <button 
                                            key={opt.id}
                                            onClick={() => setFontSize(opt.id)}
                                            className={`w-8 py-1 text-[10px] flex items-center justify-center transition-colors ${
                                                fontSize === opt.id
                                                ? (isDarkMode ? 'bg-[#3e4451] text-white shadow-sm' : 'bg-white text-gray-900 shadow-sm')
                                                : 'opacity-50 hover:opacity-100'
                                            }`}
                                         >
                                             {opt.label}
                                         </button>
                                     ))}
                                 </div>
                             </div>

                             {/* Padding */}
                             <div className="flex items-center justify-between">
                                 <span className="text-xs font-medium opacity-70">边距</span>
                                 <div className={`flex rounded-md border overflow-hidden ${isDarkMode ? 'bg-[#2c313a] border-[#181a1f]' : 'bg-gray-100 border-gray-200'}`}>
                                     {allPaddings.map((opt) => (
                                         <button 
                                            key={opt.id}
                                            onClick={() => setPadding(opt.id)}
                                            className={`w-8 py-1 text-[10px] transition-colors ${
                                                padding === opt.id
                                                ? (isDarkMode ? 'bg-[#3e4451] text-white shadow-sm' : 'bg-white text-gray-900 shadow-sm')
                                                : 'opacity-50 hover:opacity-100'
                                            }`}
                                         >
                                             {opt.label}
                                         </button>
                                     ))}
                                 </div>
                             </div>
                         </div>

                         {/* DIVIDER */}
                         <div className={`w-px bg-gradient-to-b ${isDarkMode ? 'from-[#3e4451] to-transparent' : 'from-gray-200 to-transparent'}`}></div>

                         {/* RIGHT COLUMN: TEXT & SIGNATURE */}
                         <div className="flex-1 space-y-4">
                             <div className="text-[10px] font-bold uppercase tracking-widest opacity-40">文本与署名</div>
                             
                             {/* Text Style (LayoutTheme) */}
                             <div className="flex items-center justify-between">
                                 <span className="text-xs font-medium opacity-70">文字风格</span>
                                 <div className={`flex rounded-md border overflow-hidden ${isDarkMode ? 'bg-[#2c313a] border-[#181a1f]' : 'bg-gray-100 border-gray-200'}`}>
                                     {allLayouts.map((lt) => (
                                         <button 
                                            key={lt.id}
                                            onClick={() => setLayoutTheme(lt.id)}
                                            className={`px-2 py-1 text-[10px] transition-colors ${
                                                layoutTheme === lt.id
                                                ? (isDarkMode ? 'bg-[#3e4451] text-white shadow-sm' : 'bg-white text-gray-900 shadow-sm')
                                                : 'opacity-50 hover:opacity-100'
                                            }`}
                                         >
                                             {lt.name}
                                         </button>
                                     ))}
                                 </div>
                             </div>

                             {/* Watermark Toggle */}
                             <div className="flex items-center justify-between">
                                 <span className="text-xs font-medium opacity-70">水印</span>
                                 <button 
                                    onClick={() => setShowWatermark(!showWatermark)}
                                    className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors duration-300 focus:outline-none ${
                                    showWatermark 
                                        ? (isDarkMode ? 'bg-[#98c379]' : 'bg-green-500') 
                                        : (isDarkMode ? 'bg-[#3e4451]' : 'bg-gray-300')
                                    }`}
                                >
                                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ease-in-out ${showWatermark ? 'translate-x-4' : 'translate-x-0'}`} />
                                </button>
                             </div>

                             {/* Watermark Details (Conditional) */}
                             {showWatermark && (
                                 <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                                     <input 
                                        type="text" 
                                        value={watermarkText}
                                        onChange={(e) => setWatermarkText(e.target.value)}
                                        placeholder="署名文案"
                                        maxLength={30}
                                        className={`w-full text-[10px] px-2 py-1 rounded border focus:outline-none focus:ring-1 ${
                                            isDarkMode 
                                            ? 'bg-[#1e2227] border-[#3e4451] text-gray-300 focus:ring-blue-500' 
                                            : 'bg-white border-gray-200 text-gray-700 focus:ring-blue-400'
                                        }`}
                                     />
                                     <div className="flex justify-end gap-1">
                                         <span className="text-[10px] opacity-50 mr-2 self-center">对齐</span>
                                         <div className={`flex rounded border overflow-hidden ${isDarkMode ? 'bg-[#2c313a] border-[#181a1f]' : 'bg-gray-100 border-gray-200'}`}>
                                            {[
                                                { align: WatermarkAlign.Left, label: '左' },
                                                { align: WatermarkAlign.Center, label: '中' },
                                                { align: WatermarkAlign.Right, label: '右' },
                                            ].map(opt => (
                                                <button
                                                    key={opt.align}
                                                    onClick={() => setWatermarkAlign(opt.align)}
                                                    className={`w-6 py-0.5 text-[10px] transition-colors ${
                                                        watermarkAlign === opt.align
                                                        ? (isDarkMode ? 'bg-[#3e4451] text-white shadow-sm' : 'bg-white text-gray-900 shadow-sm')
                                                        : 'opacity-50 hover:opacity-100'
                                                    }`}
                                                >
                                                    {opt.label}
                                                </button>
                                            ))}
                                         </div>
                                     </div>
                                 </div>
                             )}

                         </div>
                     </div>
                     
                     {/* RESTORE BUTTON */}
                     <div className="mt-5 flex justify-center">
                         <button
                            onClick={handleRestoreDefaults}
                            className={`text-xs underline decoration-dotted underline-offset-4 hover:decoration-solid transition-all ${
                                isDarkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'
                            }`}
                         >
                             恢复模板默认
                         </button>
                     </div>
                 </div>
             )}
          </div>
      </div>
    </div>
  );
};
