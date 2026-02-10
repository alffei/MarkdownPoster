/**
 * 模块说明：海报预览组件，负责渲染、缩放、尺寸调整与画布交互。
 */

import React, { useMemo, forwardRef, useState, useCallback, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkDirective from 'remark-directive';
import rehypeKatex from 'rehype-katex';
import { TransformWrapper, TransformComponent, useControls } from 'react-zoom-pan-pinch';
import { BorderTheme, LayoutTheme, FontSize, PaddingSize, WatermarkAlign, SpacingLevel } from '../types';
import { getThemeStyles, getFontSizeClass, getLayoutClass, getFramePaddingClass } from '../utils/themeUtils';
import { StableImage } from './StableImage';
import { remarkRuby, remarkCenter } from '../utils/markdownPlugins';
import { RubyRender } from './RubyRender';
import { HEADER_PRESETS } from '../config/headerPresets'; 
import { DECOR_PRESETS } from '../config/decorPresets'; 
import { normalizeQuotedEmphasis } from '../utils/markdownNormalize';

interface PosterPreviewProps {
  markdown: string;
  theme: BorderTheme;
  layoutTheme: LayoutTheme;
  fontSize: FontSize;
  padding: PaddingSize;
  spacing?: SpacingLevel; // New Prop
  showWatermark: boolean;
  watermarkText: string;
  watermarkAlign: WatermarkAlign;
  imagePool: Record<string, string>;
  isDarkMode: boolean;
  visible: boolean;
  containerRef?: React.RefObject<HTMLDivElement | null>;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
  customThemeColor?: string;
  presetWidth?: number;
  presetWidthToken?: number;
  presetCoreContentWidth?: number;
  onPosterWidthChange?: (width: number) => void;
}

/**
 * 缩放工具条：依赖 TransformWrapper 上下文，显示当前缩放百分比并提供放大/缩小/重置。
 */
const ZoomControls = ({ isDarkMode, scale }: { isDarkMode: boolean; scale: number }) => {
    const { zoomIn, zoomOut, resetTransform } = useControls();

    return (
        <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1 rounded-lg shadow-lg border z-50 transition-colors duration-300 ${
            isDarkMode 
                ? 'bg-[#2c313a]/90 border-[#3e4451] text-[#abb2bf]' 
                : 'bg-white/90 border-gray-200 text-gray-600'
        }`}>
            <button onClick={() => zoomOut()} className="p-2 hover:bg-black/5 rounded transition-colors" title="缩小">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
            </button>
            <div className={`w-px h-4 ${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
            <button onClick={() => resetTransform()} className="w-12 py-2 text-xs font-bold hover:bg-black/5 rounded transition-colors tabular-nums" title="重置视图">
                {scale}%
            </button>
            <div className={`w-px h-4 ${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
            <button onClick={() => zoomIn()} className="p-2 hover:bg-black/5 rounded transition-colors" title="放大">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            </button>
        </div>
    );
};

// 行高档位映射：将配置值转换为 Tailwind 行高类名。
const getSpacingClass = (spacing?: string) => {
    switch (spacing) {
        case 'compact': return 'leading-snug'; // Tailwind tight
        case 'loose': return 'leading-loose';  // Tailwind loose
        case 'standard': default: return 'leading-normal'; // Tailwind normal
    }
};

export const PosterPreview = forwardRef<HTMLDivElement, PosterPreviewProps>(({
  markdown,
  theme,
  layoutTheme,
  fontSize,
  padding,
  spacing = 'standard',
  showWatermark,
  watermarkText,
  watermarkAlign,
  imagePool,
  isDarkMode,
  visible,
  customThemeColor,
  presetWidth,
  presetWidthToken,
  presetCoreContentWidth,
  onPosterWidthChange
}, ref) => {
  
  const themeStyle = useMemo(() => getThemeStyles(theme, customThemeColor), [theme, customThemeColor]);
  const normalizedMarkdown = useMemo(() => normalizeQuotedEmphasis(markdown), [markdown]);
  
  const fontSizeClass = getFontSizeClass(fontSize);
  const layoutClass = getLayoutClass(layoutTheme);
  const paddingClass = getFramePaddingClass(padding);
  const spacingClass = getSpacingClass(spacing);

  // 缩放百分比用于工具条显示；初始值在 onInit 中同步为真实画布比例。
  const [currentScale, setCurrentScale] = useState(100); 
  const [isPreviewFocused, setIsPreviewFocused] = useState(false);

  // 海报宽度支持拖拽与外部预设两种来源。
  const [posterWidth, setPosterWidth] = useState(presetWidth ?? 640);
  const isResizing = useRef(false);
  const posterNodeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof presetWidth !== 'number' || !Number.isFinite(presetWidth)) return;
    // 外部预设宽度变化时，统一做边界裁剪再落地。
    const clamped = Math.max(320, Math.min(2000, presetWidth));
    setPosterWidth(clamped);
  }, [presetWidth, presetWidthToken]);

  useEffect(() => {
    if (typeof presetCoreContentWidth !== 'number' || !Number.isFinite(presetCoreContentWidth)) return;
    const posterNode = posterNodeRef.current;
    if (!posterNode) return;

    const computed = window.getComputedStyle(posterNode);
    const paddingLeft = parseFloat(computed.paddingLeft || '0') || 0;
    const paddingRight = parseFloat(computed.paddingRight || '0') || 0;
    const currentCoreWidth = posterNode.clientWidth - paddingLeft - paddingRight;
    const diff = presetCoreContentWidth - currentCoreWidth;
    if (Math.abs(diff) <= 1) return;

    // 根据“核心内容宽度”反推整体卡片宽度，保证视觉内容区精确命中目标值。
    setPosterWidth(prev => Math.max(320, Math.min(2000, prev + diff)));
  }, [presetCoreContentWidth, presetWidthToken]);

  useEffect(() => {
    if (!onPosterWidthChange) return;
    // 将当前宽度回传给上层持久化，刷新后可恢复上次调节结果。
    onPosterWidthChange(Math.round(posterWidth));
  }, [posterWidth, onPosterWidthChange]);

  const startResizing = useCallback((direction: 'left' | 'right') => (mouseDownEvent: React.MouseEvent) => {
    mouseDownEvent.preventDefault();
    mouseDownEvent.stopPropagation();
    isResizing.current = true;
    
    const startX = mouseDownEvent.clientX;
    const startWidth = posterWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
        if (!isResizing.current) return;
        const currentX = moveEvent.clientX;
        const diff = currentX - startX;
        
        // 双侧对称拉伸：拖动左/右手柄都保持中心视觉稳定。
        const multiplier = direction === 'right' ? 2 : -2;
        
        // 宽度边界保护，防止拖拽导致内容不可用。
        const newWidth = Math.max(320, Math.min(2000, startWidth + (diff * multiplier)));
        setPosterWidth(newWidth);
    };

    const onMouseUp = () => {
        isResizing.current = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none'; 
  }, [posterWidth]);

  // 将主题色映射到 CSS 变量，供卡片与文本在不同主题下复用。
  const cssVariables = useMemo(() => {
      const colors = themeStyle.colors;
      if (!colors) return {};
      const isDarkTheme = Boolean(themeStyle.isDark);
      return {
          '--mp-primary': colors.primary,
          '--mp-secondary': colors.secondary,
          '--mp-assist': colors.assist,
          // 文本展示色：主色保留主题倾向，同时保证正文可读性
          '--mp-primary-text': isDarkTheme ? `color-mix(in srgb, ${colors.primary} 62%, white)` : colors.primary,
          '--mp-secondary-text': isDarkTheme ? `color-mix(in srgb, ${colors.secondary} 70%, white)` : colors.secondary,
      } as React.CSSProperties;
  }, [themeStyle.colors, themeStyle.isDark]);

  return (
    <div 
        tabIndex={0}
        onMouseDownCapture={(e) => {
            // 允许点击后获取焦点，用于提示态与键盘交互
            e.currentTarget.focus();
        }}
        onFocusCapture={() => setIsPreviewFocused(true)}
        onBlurCapture={(e) => {
            const next = e.relatedTarget as Node | null;
            if (next && e.currentTarget.contains(next)) return;
            // 仅当焦点真正离开预览区域时，才关闭焦点态。
            setIsPreviewFocused(false);
        }}
        className={`absolute inset-0 overflow-hidden select-none transition-all duration-500 ease-out delay-75 ${
            visible 
                ? 'opacity-100 scale-100 z-10' 
                : 'opacity-0 scale-95 z-0 pointer-events-none'
        } ${isPreviewFocused ? 'mp-preview-focused' : ''}`}
    >
       <TransformWrapper
          centerOnInit={false} 
          minScale={0.2}
          maxScale={4}
          wheel={{ step: 0.1 }}
          panning={{ velocityDisabled: true }}
          doubleClick={{ disabled: true }}
          // 每次缩放/平移后同步百分比，保持工具条显示实时准确。
          onTransformed={(e) => setCurrentScale(Math.round(e.state.scale * 100))}
          // 自定义初始位姿：水平居中，顶部留固定间距。
          onInit={(ref) => {
             const { instance } = ref;
             if (instance.contentComponent && instance.wrapperComponent) {
                const wrapperW = instance.wrapperComponent.offsetWidth;
                const contentW = instance.contentComponent.offsetWidth;
                
                // 初始缩放固定 100%，后续由用户手势调整。
                const targetScale = 1;
                
                // 计算居中 X 偏移：容器宽度减去内容宽度的一半。
                const targetX = (wrapperW - contentW * targetScale) / 2;
                
                // 顶部留白，避免初始状态贴边。
                const targetY = 40;
                
                ref.setTransform(targetX, targetY, targetScale);
                setCurrentScale(Math.round(targetScale * 100));
             }
          }}
       >
          {({ zoomIn, zoomOut, resetTransform }) => (
            <>
              {/* 悬浮缩放工具条 */}
              <ZoomControls isDarkMode={isDarkMode} scale={currentScale} />

              <TransformComponent
                 // 背景网点层：提高画布边界感知，便于调版。
                 wrapperClass={`w-full h-full cursor-grab active:cursor-grabbing transition-colors duration-500
                    ${isDarkMode 
                        ? 'bg-[#13151a] bg-[radial-gradient(#2d333b_1px,transparent_1px)] [background-size:24px_24px]' 
                        : 'bg-[#f8f9fa] bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px]'
                    }
                 `}
                 // 内容对齐由 transform 初始化控制，这里只负责提供稳定容器。
                 contentClass="w-full h-full flex items-start justify-start pt-20 pb-20 box-border"
                 wrapperStyle={{ width: "100%", height: "100%" }}
              >
                  {/* 海报外层：保证被 transform 后仍然居中显示 */}
                  <div className="w-full flex justify-center">
                      {/* 可调宽海报主体 */}
                      <div 
                        className="relative transition-shadow duration-300 shadow-2xl shrink-0 origin-top"
                        style={{ width: `${posterWidth}px` }}
                      >
                        {/* 宽度拖拽手柄 */}
                        {/* 左侧手柄 */}
                        <div 
                            className="mp-resize-handle absolute -left-8 top-0 bottom-0 w-8 flex items-center justify-end cursor-col-resize group z-50 hover:bg-blue-500/5 transition-colors rounded-l-lg"
                            onMouseDown={startResizing('left')}
                            style={
                                {
                                    '--mp-resize-hint-color': isDarkMode ? '#60a5fa' : '#3b82f6',
                                } as React.CSSProperties
                            }
                        >
                            <div className="mp-resize-hint w-1.5 h-16 rounded-full transition-colors" />
                        </div>

                        {/* 右侧手柄 */}
                        <div 
                            className="mp-resize-handle absolute -right-8 top-0 bottom-0 w-8 flex items-center justify-start cursor-col-resize group z-50 hover:bg-blue-500/5 transition-colors rounded-r-lg"
                            onMouseDown={startResizing('right')}
                            style={
                                {
                                    '--mp-resize-hint-color': isDarkMode ? '#60a5fa' : '#3b82f6',
                                } as React.CSSProperties
                            }
                        >
                            <div className="mp-resize-hint w-1.5 h-16 rounded-full transition-colors" />
                        </div>
                        
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/75 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                            {Math.round(posterWidth)}px
                        </div>

                        {/* 实际海报内容（导出目标节点） */}
                        <div 
                            ref={(node) => {
                                if (typeof ref === 'function') {
                                    ref(node);
                                } else if (ref) {
                                    ref.current = node;
                                }
                                posterNodeRef.current = node;
                            }}
                            id="poster-node"
                            className={`
                                relative flex flex-col cursor-auto
                                ${paddingClass}
                                ${themeStyle.frame}
                            `}
                            style={{
                                width: '100%',
                                ...themeStyle.frameStyle,
                                ...cssVariables
                            }}
                            onMouseDown={(e) => e.stopPropagation()} 
                        >
                            <div className={`
                                relative flex flex-col z-10
                                ${themeStyle.card}
                            `}
                            style={{ ...themeStyle.cardStyle }}
                            >
                                {themeStyle.customHeader && HEADER_PRESETS[themeStyle.customHeader] && (
                                    <div className={themeStyle.header}>
                                        {HEADER_PRESETS[themeStyle.customHeader]}
                                    </div>
                                )}
                                
                                {themeStyle.customDecor && DECOR_PRESETS[themeStyle.customDecor] && (
                                    <div className="pointer-events-none">
                                        {DECOR_PRESETS[themeStyle.customDecor]}
                                    </div>
                                )}

                                <div className={`
                                    flex-1
                                    px-8 py-10 sm:px-12 sm:py-12
                                    ${themeStyle.content}
                                    ${layoutClass}
                                `}>
                                    <div className={`prose max-w-none ${themeStyle.prose} ${fontSizeClass} ${spacingClass}`}>
                                        <ReactMarkdown 
                                            remarkPlugins={[remarkGfm, remarkMath, remarkDirective, remarkRuby, remarkCenter]}
                                            rehypePlugins={[rehypeKatex]}
                                            urlTransform={(value) => value}
                                            components={{
                                                img: (props) => <StableImage {...props} imagePool={imagePool} />,
                                                a: ({ node, href, children, ...props }) => {
                                                if (href && href.startsWith('ruby:')) {
                                                    const reading = href.replace('ruby:', '');
                                                    const decodedReading = decodeURIComponent(reading);
                                                    return <RubyRender baseText={children} reading={decodedReading} {...props} />;
                                                }
                                                return <a href={href} {...props}>{children}</a>;
                                                },
                                                // 强制代码块换行并隐藏滚动条，保证静态海报导出观感
                                                pre: ({ node, children, ...props }) => (
                                                    <pre 
                                                        {...props} 
                                                        style={{ 
                                                            whiteSpace: 'pre-wrap', 
                                                            wordBreak: 'break-word',
                                                            overflow: 'hidden' 
                                                        }}
                                                    >
                                                        {children}
                                                    </pre>
                                                )
                                            }}
                                        >
                                            {normalizedMarkdown}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                            </div>

                            {showWatermark && (
                                <div className={`mt-6 z-10 ${watermarkAlign} ${themeStyle.watermarkColor}`}>
                                <div className="text-sm font-medium opacity-80 font-sans tracking-wider">
                                    {watermarkText}
                                </div>
                                </div>
                            )}
                        </div>
                      </div>
                  </div>
              </TransformComponent>
            </>
          )}
       </TransformWrapper>
    </div>
  );
});

PosterPreview.displayName = 'PosterPreview';
