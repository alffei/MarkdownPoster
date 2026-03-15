/**
 * 模块说明：预览控制栏组件，管理模板应用与预览侧参数控制。
 */

import React, { useState, useRef, useEffect } from 'react';
import { BorderTheme, WritingTheme, FontSize, ViewMode, LayoutTheme, PaddingSize, WatermarkAlign, WeChatConfig, SpacingLevel, PosterTemplate } from '../types';
import { AppearancePopover } from './AppearancePopover';
import { WeChatAppearancePopover } from './WeChatAppearancePopover';
import { WritingAppearancePopover } from './WritingAppearancePopover';
import { WeChatCopyResult } from '../utils/wechatUtils';

interface PreviewControlBarProps {
  currentTheme: BorderTheme;
  setTheme: (theme: BorderTheme) => void;
  
  // 版式微调参数
  layoutTheme: LayoutTheme;
  setLayoutTheme: (theme: LayoutTheme) => void;
  padding: PaddingSize;
  setPadding: (val: PaddingSize) => void;
  spacing?: SpacingLevel;
  setSpacing?: (val: SpacingLevel) => void;
  watermarkAlign: WatermarkAlign;
  setWatermarkAlign: (align: WatermarkAlign) => void;

  onExport: () => void;
  onCopyImage: () => Promise<{ success: boolean; message?: string } | void>;
  onSaveMarkdown: () => void;
  onExportZip: () => void;
  isExportingZip: boolean;

  isExporting: boolean;
  showWatermark: boolean;
  setShowWatermark: (show: boolean) => void;
  watermarkText: string;
  setWatermarkText: (text: string) => void;
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
  isDarkMode?: boolean;
  
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  
  weChatConfig?: WeChatConfig;
  setWeChatConfig?: (config: WeChatConfig) => void;
  onCopyWeChatHtml?: () => Promise<WeChatCopyResult | null>;

  customThemeColor?: string;
  setCustomThemeColor?: (color: string) => void;

  // 阅读模式主题参数
  writingTheme?: WritingTheme;
  setWritingTheme?: (theme: WritingTheme) => void;

  // 应用海报模板
  onApplyTemplate?: (template: PosterTemplate) => void;

  // 恢复当前模板默认值（并清理该模板缓存的微调）
  onRestorePosterTemplateDefaults?: () => void;
  isEditorCollapsed?: boolean;
  onToggleEditorCollapse?: () => void;
}

interface NotificationState {
  type: 'success' | 'warning' | 'error';
  message: string;
  details?: string[];
}

const buildWeChatDiagnosticDetails = (result: WeChatCopyResult): string[] => {
  const details = [
    `图片总数：${result.totalImages} 张`,
    `尝试上传图床：${result.attemptedUploads} 张`,
    `上传成功：${result.uploadedImages} 张`,
    `上传失败：${result.failedImages} 张`,
    `保留原始地址：${result.passthroughImages} 张`,
  ];

  if (result.passthroughImages > 0) {
    details.push('保留原始地址的图片不会走图床；如果公众号后台抓不到该外链，粘贴后会不显示。');
  }

  if (result.failedImages > 0) {
    details.push('上传失败的图片会保留原始地址；如果原地址不是公众号可访问公网图，粘贴后大概率不显示。');
  }

  return details.concat(result.errors);
};

export const PreviewControlBar: React.FC<PreviewControlBarProps> = ({ 
  currentTheme, 
  setTheme, 
  layoutTheme,
  setLayoutTheme,
  padding,
  setPadding,
  spacing,
  setSpacing,
  watermarkAlign,
  setWatermarkAlign,
  onExport,
  onCopyImage,
  onSaveMarkdown,
  onExportZip,
  isExportingZip,
  isExporting,
  showWatermark,
  setShowWatermark,
  watermarkText,
  setWatermarkText,
  fontSize,
  setFontSize,
  isDarkMode = false,
  viewMode,
  setViewMode,
  weChatConfig,
  setWeChatConfig,
  onCopyWeChatHtml,
  customThemeColor,
  setCustomThemeColor,
  writingTheme,
  setWritingTheme,
  onApplyTemplate,
  onRestorePosterTemplateDefaults,
  isEditorCollapsed = false,
  onToggleEditorCollapse
}) => {
  const [showAppearance, setShowAppearance] = useState(false);
  const [notification, setNotification] = useState<NotificationState | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // 点击外部区域时关闭弹层
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setShowAppearance(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 成功提示自动消失，避免长期占位
  useEffect(() => {
    if (notification && notification.type === 'success') {
      const timer = setTimeout(() => {
        setNotification(null);
      }, notification.details && notification.details.length > 0 ? 6000 : 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleWeChatCopy = async () => {
    if (!onCopyWeChatHtml) return;
    // 先清理旧提示，避免多条状态叠加
    setNotification(null);

    const result = await onCopyWeChatHtml();
    
    // 返回空值代表流程提前取消或早期失败
    if (!result) return;

    const diagnosticDetails = buildWeChatDiagnosticDetails(result);

    if (result.success) {
       setNotification({
         type: 'success',
         message: result.totalImages > 0
           ? `复制成功：共处理 ${result.totalImages} 张图片，上传成功 ${result.uploadedImages} 张。`
           : '复制成功！当前内容没有图片。',
         details: diagnosticDetails
       });
    } else {
       if (result.failedImages > 0 && result.totalImages > result.failedImages) {
          // 部分成功：正文复制成功，但部分图片上传失败
          setNotification({
             type: 'warning',
             message: `复制成功，但有 ${result.failedImages} 张图片上传失败，成功 ${result.uploadedImages} 张。`,
             details: diagnosticDetails
          });
       } else if (result.failedImages > 0 && result.failedImages === result.totalImages) {
          // 图片全部失败：正文已复制，但图片均上传失败
           setNotification({
             type: 'error',
             message: `复制成功，但尝试上传的图片全部失败（${result.failedImages} 张）。`,
             details: diagnosticDetails
          });
       } else {
          // 兜底错误
           setNotification({
             type: 'error',
             message: '复制过程中发生异常，图片处理未完整完成。',
             details: diagnosticDetails
          });
       }
    }
  };

  const handlePosterCopy = async () => {
      setNotification(null);
      const result = await onCopyImage();
      if (result) {
          if (result.success) {
              setNotification({ type: 'success', message: '图片已复制到剪贴板！' });
          } else {
              setNotification({ type: 'error', message: '复制失败', details: [result.message || '未知错误'] });
          }
      }
  };

  return (
    <div className={`h-12 border-b relative z-40 shrink-0 transition-colors duration-500 
      ${isDarkMode 
        ? 'bg-[#1e2227] border-[#181a1f] text-[#abb2bf]' // Dark Mode
        : 'border-gray-200 bg-gray-50/90 backdrop-blur-sm text-gray-700'
      }`}>
      
      {/* 左侧：外观设置入口 */}
      <div className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 z-10 flex items-center gap-2">
        {onToggleEditorCollapse && (
          <button
            onClick={onToggleEditorCollapse}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
              isDarkMode
                ? 'bg-[#282c34] border-[#3e4451] text-[#abb2bf] hover:bg-[#2c313a]'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
            title={isEditorCollapsed ? '展开左侧编辑区' : '收起左侧编辑区'}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isEditorCollapsed ? (
                <>
                  <rect x="3" y="4" width="18" height="16" rx="2" strokeWidth={2} />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 4v16M13 9l-3 3 3 3" />
                </>
              ) : (
                <>
                  <rect x="3" y="4" width="18" height="16" rx="2" strokeWidth={2} />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 4v16M11 9l3 3-3 3" />
                </>
              )}
            </svg>
            <span>{isEditorCollapsed ? '展开编辑' : '收起编辑'}</span>
          </button>
        )}
        {(viewMode === ViewMode.Poster || viewMode === ViewMode.WeChat || viewMode === ViewMode.Writing) && (
            <div className="relative" ref={popoverRef}>
                <button
                    onClick={() => setShowAppearance(!showAppearance)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                        showAppearance 
                           ? (isDarkMode ? 'bg-[#2c313a] border-[#e5c07b] text-[#e5c07b]' : 'bg-white border-orange-400 text-orange-600')
                           : (isDarkMode ? 'bg-[#282c34] border-[#3e4451] text-[#abb2bf] hover:bg-[#2c313a]' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50')
                    }`}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
                    <span>自定义</span>
                </button>

                {showAppearance && viewMode === ViewMode.Poster && onApplyTemplate && setSpacing && spacing && (
                    <AppearancePopover
                        currentTheme={currentTheme}
                        setTheme={setTheme}
                        layoutTheme={layoutTheme}
                        setLayoutTheme={setLayoutTheme}
                        fontSize={fontSize}
                        setFontSize={setFontSize}
                        padding={padding}
                        setPadding={setPadding}
                        spacing={spacing}
                        setSpacing={setSpacing}
                        showWatermark={showWatermark}
                        setShowWatermark={setShowWatermark}
                        watermarkText={watermarkText}
                        setWatermarkText={setWatermarkText}
                        watermarkAlign={watermarkAlign}
                        setWatermarkAlign={setWatermarkAlign}
                        isDarkMode={isDarkMode}
                        onClose={() => setShowAppearance(false)}
                        customThemeColor={customThemeColor}
                        setCustomThemeColor={setCustomThemeColor}
                        onApplyTemplate={onApplyTemplate}
                        onRestoreTemplateDefaults={onRestorePosterTemplateDefaults}
                    />
                )}

                {showAppearance && viewMode === ViewMode.WeChat && weChatConfig && setWeChatConfig && (
                    <WeChatAppearancePopover
                        config={weChatConfig}
                        setConfig={setWeChatConfig}
                        isDarkMode={isDarkMode}
                        onClose={() => setShowAppearance(false)}
                    />
                )}

                {showAppearance && viewMode === ViewMode.Writing && writingTheme && setWritingTheme && (
                    <WritingAppearancePopover
                        currentTheme={writingTheme}
                        setTheme={setWritingTheme}
                        fontSize={fontSize}
                        setFontSize={setFontSize}
                        isDarkMode={isDarkMode}
                        onClose={() => setShowAppearance(false)}
                    />
                )}
            </div>
        )}
      </div>

      {/* 中间：预览模式切换 */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
         <div className={`flex p-0.5 rounded-lg border ${isDarkMode ? 'bg-[#282c34] border-[#3e4451]' : 'bg-gray-200/50 border-gray-200'}`}>
            <button
               onClick={() => setViewMode(ViewMode.Writing)}
               className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${
                  viewMode === ViewMode.Writing
                   ? (isDarkMode ? 'bg-[#3e4451] text-[#d4cfbf] shadow-sm' : 'bg-white text-gray-800 shadow-sm')
                   : (isDarkMode ? 'text-[#5c6370] hover:text-[#abb2bf]' : 'text-gray-400 hover:text-gray-600')
               }`}
            >
               阅读
            </button>
            <button
               onClick={() => setViewMode(ViewMode.Poster)}
               className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${
                  viewMode === ViewMode.Poster
                   ? (isDarkMode ? 'bg-[#3e4451] text-[#d4cfbf] shadow-sm' : 'bg-white text-gray-800 shadow-sm')
                   : (isDarkMode ? 'text-[#5c6370] hover:text-[#abb2bf]' : 'text-gray-400 hover:text-gray-600')
               }`}
            >
               海报
            </button>
            <button
               onClick={() => setViewMode(ViewMode.WeChat)}
               className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${
                  viewMode === ViewMode.WeChat
                   ? (isDarkMode ? 'bg-[#3e4451] text-[#d4cfbf] shadow-sm' : 'bg-white text-gray-800 shadow-sm')
                   : (isDarkMode ? 'text-[#5c6370] hover:text-[#abb2bf]' : 'text-gray-400 hover:text-gray-600')
               }`}
            >
               公众号
            </button>
         </div>
      </div>

      {/* 右侧：主操作按钮区 */}
      <div className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 z-10 flex items-center gap-3">
        
        {/* 主按钮：按当前模式映射为导出/复制/保存 */}
        <div className="relative group">
            {viewMode === ViewMode.Poster ? (
                // 海报模式：导出图片或复制到剪贴板
                <>
                    <button
                    className={`flex items-center gap-2 px-4 py-1.5 rounded text-xs font-bold text-white transition-all shadow-sm ${
                        isExporting 
                            ? 'bg-gray-400 cursor-not-allowed' 
                            : (isDarkMode 
                                ? 'bg-[#e5c07b] text-[#282c34] hover:bg-[#d19a66] active:scale-95' 
                                : 'bg-[#997343] hover:bg-[#85633e] active:scale-95')
                    }`}
                    disabled={isExporting}
                    >
                    {isExporting ? (
                        <span className="px-2">处理中...</span>
                    ) : (
                        <>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            <span>导出</span>
                            <svg className="w-3 h-3 ml-0.5 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </>
                    )}
                    </button>

                    {!isExporting && (
                        <div className="absolute right-0 top-full pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 min-w-[140px] transform origin-top-right scale-95 group-hover:scale-100">
                            <div className={`rounded-lg shadow-xl border overflow-hidden backdrop-blur-sm ring-1 ring-black/5 ${
                            isDarkMode 
                                ? 'bg-[#1e2227]/95 border-[#3e4451]' 
                                : 'bg-white/95 border-gray-100'
                            }`}>
                            
                            <button
                                onClick={onExport}
                                className={`w-full text-left px-4 py-2.5 text-xs font-medium flex items-center gap-2 transition-colors ${
                                isDarkMode 
                                    ? 'text-[#abb2bf] hover:bg-[#2c313a] hover:text-[#e5c07b]' 
                                    : 'text-gray-700 hover:bg-orange-50 hover:text-[#997343]'
                                }`}
                            >
                                <svg className="w-3.5 h-3.5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                保存图片
                            </button>

                            <div className={`h-px w-full ${isDarkMode ? 'bg-[#3e4451]' : 'bg-gray-100'}`}></div>

                            <button
                                onClick={handlePosterCopy}
                                className={`w-full text-left px-4 py-2.5 text-xs font-medium flex items-center gap-2 transition-colors ${
                                isDarkMode 
                                    ? 'text-[#abb2bf] hover:bg-[#2c313a] hover:text-[#e5c07b]' 
                                    : 'text-gray-700 hover:bg-orange-50 hover:text-[#997343]'
                                }`}
                            >
                                <svg className="w-3.5 h-3.5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                                复制剪贴板
                            </button>

                            </div>
                        </div>
                    )}
                </>
            ) : viewMode === ViewMode.WeChat ? (
                // 公众号模式：生成公众号可粘贴内容
                <>
                    <button
                        onClick={handleWeChatCopy}
                        disabled={isExporting}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded text-xs font-bold text-white transition-all shadow-sm ${
                            isExporting
                                ? 'bg-gray-400 cursor-not-allowed'
                                : (isDarkMode 
                                    ? 'bg-[#98c379] text-[#282c34] hover:bg-[#85bb5c] active:scale-95' 
                                    : 'bg-green-600 hover:bg-green-700 active:scale-95')
                        }`}
                    >
                        {isExporting ? (
                            <>
                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                <span>上传图片中...</span>
                            </>
                        ) : (
                            <>
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                                <span>复制公众号格式</span>
                            </>
                        )}
                    </button>
                </>
            ) : (
                // 阅读模式：保存 Markdown 或导出工程包
                <>
                    <button
                    className={`flex items-center gap-2 px-4 py-1.5 rounded text-xs font-bold text-white transition-all shadow-sm ${
                        isExportingZip
                            ? 'bg-gray-400 cursor-not-allowed' 
                            : (isDarkMode 
                                ? 'bg-[#e5c07b] text-[#282c34] hover:bg-[#d19a66] active:scale-95' 
                                : 'bg-[#997343] hover:bg-[#85633e] active:scale-95')
                    }`}
                    disabled={isExportingZip}
                    >
                    {isExportingZip ? (
                        <>
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            <span>打包中...</span>
                        </>
                    ) : (
                        <>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                            <span>保存</span>
                            <svg className="w-3 h-3 ml-0.5 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </>
                    )}
                    </button>

                    {!isExportingZip && (
                        <div className="absolute right-0 top-full pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 min-w-[160px] transform origin-top-right scale-95 group-hover:scale-100">
                            <div className={`rounded-lg shadow-xl border overflow-hidden backdrop-blur-sm ring-1 ring-black/5 ${
                            isDarkMode 
                                ? 'bg-[#1e2227]/95 border-[#3e4451]' 
                                : 'bg-white/95 border-gray-100'
                            }`}>
                            
                            <button
                                onClick={onSaveMarkdown}
                                className={`w-full text-left px-4 py-2.5 text-xs font-medium flex items-center gap-2 transition-colors ${
                                isDarkMode 
                                    ? 'text-[#abb2bf] hover:bg-[#2c313a] hover:text-[#e5c07b]' 
                                    : 'text-gray-700 hover:bg-orange-50 hover:text-[#997343]'
                                }`}
                            >
                                <svg className="w-3.5 h-3.5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                <div>
                                    <div className="font-bold">仅源码 (.md)</div>
                                    <div className="text-[10px] opacity-60 font-normal">轻量，不含图片</div>
                                </div>
                            </button>

                            <div className={`h-px w-full ${isDarkMode ? 'bg-[#3e4451]' : 'bg-gray-100'}`}></div>

                            <button
                                onClick={onExportZip}
                                className={`w-full text-left px-4 py-2.5 text-xs font-medium flex items-center gap-2 transition-colors ${
                                isDarkMode 
                                    ? 'text-[#abb2bf] hover:bg-[#2c313a] hover:text-[#e5c07b]' 
                                    : 'text-gray-700 hover:bg-orange-50 hover:text-[#997343]'
                                }`}
                            >
                                <svg className="w-3.5 h-3.5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2v-1m-9 4h4" /></svg>
                                <div>
                                    <div className="font-bold">导出工程 (.zip)</div>
                                    <div className="text-[10px] opacity-60 font-normal">包含本地与网络图片</div>
                                </div>
                            </button>

                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
        
        {/* 全局状态提示：三种模式共用一套提示逻辑 */}
        {notification && (
            <div className={`absolute top-full right-0 mt-3 p-3 rounded-lg shadow-xl border w-[280px] z-50 animate-in fade-in slide-in-from-top-2 select-text cursor-default ${
                notification.type === 'success' 
                    ? (isDarkMode ? 'bg-[#21252b] border-[#3e4451] text-[#abb2bf]' : 'bg-white border-gray-200 text-gray-600') // Low-key Gray Theme for Success
                    : notification.type === 'warning'
                    ? (isDarkMode ? 'bg-[#21252b] border-yellow-900/50 text-yellow-500' : 'bg-yellow-50 border-yellow-200 text-yellow-800')
                    : (isDarkMode ? 'bg-[#21252b] border-red-900/50 text-red-400' : 'bg-red-50 border-red-200 text-red-700')
            }`}>
                <div className="flex items-start gap-2.5">
                    {notification.type === 'success' ? (
                        <svg className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isDarkMode ? 'text-[#98c379]' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    ) : notification.type === 'warning' ? (
                        <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    ) : (
                        <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    )}
                    <div className="flex-1">
                        <p className="text-xs font-bold leading-tight mb-1">{notification.message}</p>
                        {notification.details && notification.details.length > 0 && (
                            <ul className="mt-2 pl-3 list-disc text-[10px] opacity-80 space-y-1 max-h-32 overflow-y-auto">
                                {notification.details.slice(0, 6).map((err, idx) => (
                                    <li key={idx} className="break-all">{err}</li>
                                ))}
                                {notification.details.length > 6 && (
                                    <li>...还有 {notification.details.length - 6} 条详情</li>
                                )}
                            </ul>
                        )}
                    </div>
                        <button onClick={() => setNotification(null)} className="opacity-50 hover:opacity-100 transition-opacity">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};
