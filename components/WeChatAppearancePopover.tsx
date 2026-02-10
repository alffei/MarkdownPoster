/**
 * 模块说明：公众号外观弹层组件，配置微信排版风格。
 */

import React from 'react';
import { WeChatConfig } from '../types';
import { WeChatThemeRegistry } from '../utils/wechatThemeRegistry';

interface WeChatAppearancePopoverProps {
  config: WeChatConfig;
  setConfig: (config: WeChatConfig) => void;
  isDarkMode: boolean;
  onClose: () => void;
}

export const WeChatAppearancePopover: React.FC<WeChatAppearancePopoverProps> = ({
  config,
  setConfig,
  isDarkMode,
  onClose
}) => {
  
  const updateConfig = (key: keyof WeChatConfig, value: any) => {
    setConfig({ ...config, [key]: value });
  };

  const layouts = WeChatThemeRegistry.getLayouts();
  const colors = WeChatThemeRegistry.getColorPresets();
  const fontSizes = WeChatThemeRegistry.getFontSizes();
  const lineHeights = WeChatThemeRegistry.getLineHeights();
  const codeThemes = WeChatThemeRegistry.getCodeThemes();
  const captionTypes = WeChatThemeRegistry.getCaptionTypes();

  return (
    <div className={`absolute top-full right-0 mt-2 w-[340px] rounded-xl shadow-2xl border p-5 z-50 animate-in fade-in zoom-in-95 origin-top-right duration-200 select-none
      ${isDarkMode 
        ? 'bg-[#21252b] border-[#181a1f] text-gray-200 shadow-black/50' 
        : 'bg-white border-gray-200 text-gray-800 shadow-gray-200/50'
      }`}
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-bold opacity-90">公众号排版配置</h3>
        <button onClick={onClose} className="opacity-50 hover:opacity-100">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      {/* 1) 排版风格分组（分段按钮） */}
      <div className="mb-6">
        <label className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-2 block">排版风格</label>
        <div className={`flex p-1 rounded-lg border ${isDarkMode ? 'bg-[#2c313a] border-[#181a1f]' : 'bg-gray-100 border-gray-200'}`}>
          {layouts.map((lt) => (
            <button
              key={lt.id}
              onClick={() => updateConfig('layout', lt.id)}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                config.layout === lt.id
                  ? (isDarkMode ? 'bg-[#3e4451] text-white shadow-sm' : 'bg-white text-gray-900 shadow-sm')
                  : 'opacity-60 hover:opacity-100'
              }`}
            >
              {lt.name}
            </button>
          ))}
        </div>
      </div>

      {/* 2) 主题色选择 */}
      <div className="mb-6">
          <label className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-2 block">主题色</label>
          <div className="flex flex-wrap gap-2.5">
             {colors.map((preset) => (
                 <button
                    key={preset.color}
                    onClick={() => updateConfig('primaryColor', preset.color)}
                    title={preset.label}
                    className={`w-6 h-6 rounded-full shadow-sm transition-transform hover:scale-110 relative ${
                        config.primaryColor.toLowerCase() === preset.color.toLowerCase() 
                        ? 'ring-2 ring-offset-2 ring-blue-400 scale-110' 
                        : 'border border-gray-100'
                    } ${isDarkMode ? 'ring-offset-[#21252b] border-[#3e4451]' : 'ring-offset-white'}`}
                    style={{ backgroundColor: preset.color }}
                 />
             ))}
             {/* 自定义颜色输入 */}
             <div className="relative w-6 h-6 rounded-full overflow-hidden shadow-sm border cursor-pointer hover:scale-110 transition-transform flex items-center justify-center bg-gradient-to-br from-red-400 via-green-400 to-blue-400">
                 <input 
                    type="color" 
                    value={config.primaryColor}
                    onChange={(e) => updateConfig('primaryColor', e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    title="自定义颜色"
                 />
             </div>
          </div>
      </div>

      {/* 3) 排版参数（字号 + 行高） */}
      <div className="mb-5 space-y-3">
        {/* 字号 */}
        <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold uppercase tracking-widest opacity-60">正文字号</label>
            <div className={`flex w-[180px] p-0.5 rounded-lg border ${isDarkMode ? 'bg-[#2c313a] border-[#181a1f]' : 'bg-gray-100 border-gray-200'}`}>
              {fontSizes.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => updateConfig('fontSize', opt.value)}
                  className={`flex-1 py-1 text-[10px] font-medium rounded transition-all ${
                    config.fontSize === opt.value
                      ? (isDarkMode ? 'bg-[#3e4451] text-white shadow-sm' : 'bg-white text-gray-900 shadow-sm')
                      : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
        </div>

        {/* 行高 */}
        <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold uppercase tracking-widest opacity-60">行间距</label>
            <div className={`flex w-[180px] p-0.5 rounded-lg border ${isDarkMode ? 'bg-[#2c313a] border-[#181a1f]' : 'bg-gray-100 border-gray-200'}`}>
              {lineHeights.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => updateConfig('lineHeight', opt.value)}
                  className={`flex-1 py-1 text-[10px] font-medium rounded transition-all ${
                    config.lineHeight === opt.value
                      ? (isDarkMode ? 'bg-[#3e4451] text-white shadow-sm' : 'bg-white text-gray-900 shadow-sm')
                      : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
        </div>
      </div>

      {/* 4) 代码块主题 */}
      <div className="mb-5">
        <label className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-2 block">代码块主题</label>
        <div className="relative">
          <select 
             value={config.codeTheme}
             onChange={(e) => updateConfig('codeTheme', e.target.value)}
             className={`w-full text-xs p-2 rounded-lg border appearance-none focus:outline-none focus:ring-1 ${
                isDarkMode 
                ? 'bg-[#2c313a] border-[#181a1f] text-gray-200 focus:ring-blue-500' 
                : 'bg-gray-50 border-gray-200 text-gray-800 focus:ring-blue-400'
             }`}
          >
             {codeThemes.map(theme => (
               <option key={theme.value} value={theme.value}>{theme.label}</option>
             ))}
          </select>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
             <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </div>
        </div>
      </div>

      {/* 5) 图注来源规则 */}
      <div className="mb-5">
        <label className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-2 block">图注格式</label>
        <div className={`flex p-1 rounded-lg border ${isDarkMode ? 'bg-[#2c313a] border-[#181a1f]' : 'bg-gray-100 border-gray-200'}`}>
          {captionTypes.map((opt) => (
            <button
              key={opt.value}
              onClick={() => updateConfig('captionType', opt.value)}
              className={`flex-1 py-1.5 text-[10px] font-medium rounded-md transition-all ${
                config.captionType === opt.value
                  ? (isDarkMode ? 'bg-[#3e4451] text-white shadow-sm' : 'bg-white text-gray-900 shadow-sm')
                  : 'opacity-60 hover:opacity-100'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 6) 开关项 */}
      <div className="space-y-3">
        {[
           { label: 'Mac 代码块', key: 'macCodeBlock' },
           { label: '代码块行号', key: 'lineNumbers' },
           { label: '微信外链转底部引用', key: 'linkReferences' },
           { label: '段落首行缩进', key: 'indent' },
           { label: '段落两端对齐', key: 'justify' },
        ].map((item) => (
           <div key={item.key} className="flex items-center justify-between">
              <label className="text-xs font-medium opacity-80">{item.label}</label>
              <button 
                onClick={() => updateConfig(item.key as keyof WeChatConfig, !config[item.key as keyof WeChatConfig])}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-300 focus:outline-none ${
                    config[item.key as keyof WeChatConfig]
                    ? (isDarkMode ? 'bg-[#98c379]' : 'bg-green-500') 
                    : (isDarkMode ? 'bg-[#3e4451]' : 'bg-gray-300')
                }`}
              >
                <div 
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ease-in-out ${
                      config[item.key as keyof WeChatConfig] ? 'translate-x-6' : 'translate-x-0'
                  }`} 
                />
              </button>
           </div>
        ))}
      </div>
      
      {/* 重置按钮 */}
      <div className="mt-6 pt-4 border-t border-dashed border-gray-300/30">
        <button
           onClick={() => setConfig({
              layout: 'Base',
              primaryColor: '#07c160',
              codeTheme: 'vsDark',
              macCodeBlock: true,
              lineNumbers: true,
              linkReferences: true,
              indent: false,
              justify: true,
              captionType: 'title',
              fontSize: 'Medium',
              lineHeight: 'comfortable'
           })}
           className="w-full py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
        >
          重置配置
        </button>
      </div>

    </div>
  );
};
