
import React, { useMemo, forwardRef, useState, useCallback, useRef } from 'react';
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
}

/**
 * Inner Component to access Zoom Controls context
 * Now accepts 'scale' as a prop to display dynamic value
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

// Helper for Spacing Class
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
  customThemeColor
}, ref) => {
  
  const themeStyle = useMemo(() => getThemeStyles(theme, customThemeColor), [theme, customThemeColor]);
  const normalizedMarkdown = useMemo(() => normalizeQuotedEmphasis(markdown), [markdown]);
  
  const fontSizeClass = getFontSizeClass(fontSize);
  const layoutClass = getLayoutClass(layoutTheme);
  const paddingClass = getFramePaddingClass(padding);
  const spacingClass = getSpacingClass(spacing);

  // --- Zoom State ---
  // Initialize with a safe default, will be updated on mount
  const [currentScale, setCurrentScale] = useState(100); 
  const [isPreviewFocused, setIsPreviewFocused] = useState(false);

  // --- Resize Logic ---
  const [posterWidth, setPosterWidth] = useState(640);
  const isResizing = useRef(false);

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
        
        // Symmetrical resizing
        const multiplier = direction === 'right' ? 2 : -2;
        
        // Limits: 320px min, 2000px max
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

  // Construct inline styles for CSS Variables based on the new Color System
  const cssVariables = useMemo(() => {
      const colors = themeStyle.colors;
      if (!colors) return {};
      const isDarkTheme = Boolean(themeStyle.isDark);
      return {
          '--mp-primary': colors.primary,
          '--mp-secondary': colors.secondary,
          '--mp-assist': colors.assist,
          // Text-facing variants (so primary can remain "theme hue", while text stays readable)
          '--mp-primary-text': isDarkTheme ? `color-mix(in srgb, ${colors.primary} 62%, white)` : colors.primary,
          '--mp-secondary-text': isDarkTheme ? `color-mix(in srgb, ${colors.secondary} 70%, white)` : colors.secondary,
      } as React.CSSProperties;
  }, [themeStyle.colors, themeStyle.isDark]);

  return (
    <div 
        tabIndex={0}
        onMouseDownCapture={(e) => {
            // Ensure the preview region can "gain focus" by click for hint animations.
            e.currentTarget.focus();
        }}
        onFocusCapture={() => setIsPreviewFocused(true)}
        onBlurCapture={(e) => {
            const next = e.relatedTarget as Node | null;
            if (next && e.currentTarget.contains(next)) return;
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
          // Sync state on every transform
          onTransformed={(e) => setCurrentScale(Math.round(e.state.scale * 100))}
          // Custom Initialization to Center X and Top-Align Y
          onInit={(ref) => {
             const { instance } = ref;
             if (instance.contentComponent && instance.wrapperComponent) {
                const wrapperW = instance.wrapperComponent.offsetWidth;
                const contentW = instance.contentComponent.offsetWidth;
                
                // Initial Scale: 100%
                const targetScale = 1;
                
                // Calculate X to center horizontally: (WrapperWidth - ScaledContentWidth) / 2
                const targetX = (wrapperW - contentW * targetScale) / 2;
                
                // Set Y to 40px padding from top
                const targetY = 40;
                
                ref.setTransform(targetX, targetY, targetScale);
                setCurrentScale(Math.round(targetScale * 100));
             }
          }}
       >
          {({ zoomIn, zoomOut, resetTransform }) => (
            <>
              {/* Toolbar floating above canvas */}
              <ZoomControls isDarkMode={isDarkMode} scale={currentScale} />

              <TransformComponent
                 // Refined Dot Pattern Background
                 wrapperClass={`w-full h-full cursor-grab active:cursor-grabbing transition-colors duration-500
                    ${isDarkMode 
                        ? 'bg-[#13151a] bg-[radial-gradient(#2d333b_1px,transparent_1px)] [background-size:24px_24px]' 
                        : 'bg-[#f8f9fa] bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px]'
                    }
                 `}
                 // Using flex items-start (Top Align) and justify-start (Left Align)
                 // We handle centering manually via setTransform in onInit.
                 // This gives us precise control over the initial position (Top Center).
                 contentClass="w-full h-full flex items-start justify-start pt-20 pb-20 box-border"
                 wrapperStyle={{ width: "100%", height: "100%" }}
              >
                  {/* Container for Centering Inner Content width-wise */}
                  {/* Since TransformWrapper transforms this whole container, we use w-full to match wrapper width */}
                  {/* Inside here, we center the poster card */}
                  <div className="w-full flex justify-center">
                      {/* The Resizable Poster */}
                      <div 
                        className="relative transition-shadow duration-300 shadow-2xl shrink-0 origin-top"
                        style={{ width: `${posterWidth}px` }}
                      >
                        {/* --- RESIZE HANDLES --- */}
                        {/* Left Handle */}
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

                        {/* Right Handle */}
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

                        {/* --- ACTUAL POSTER CONTENT (Export Target) --- */}
                        <div 
                            ref={ref}
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
                                    px-8 py-8 sm:px-12 sm:py-10
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
                                                // Override pre to force wrapping and hide scrollbars for poster static export
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
