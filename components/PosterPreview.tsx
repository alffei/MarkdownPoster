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
import { safeMarkdownUrlTransform } from '../utils/security';

const DEFAULT_POSTER_WIDTH = 640;
const STORAGE_KEY_POSTER_IMAGE_DISPLAYS = 'markdown_poster_image_displays_v1';
const MAX_PERSISTED_IMAGE_STYLES = 500;

type AspectRatioOption = {
  id: string;
  label: string;
  w: number;
  h: number;
};

type ImageAlign = 'left' | 'center' | 'right';

type PosterImageDisplay = {
  widthPercent: number;
  align: ImageAlign;
};

const VERTICAL_RATIO_OPTIONS: AspectRatioOption[] = [
  { id: '1-1', label: '1:1', w: 1, h: 1 },
  { id: '3-4', label: '3:4', w: 3, h: 4 },
  { id: '2-3', label: '2:3', w: 2, h: 3 },
  { id: '9-16', label: '9:16', w: 9, h: 16 },
];

const HORIZONTAL_RATIO_OPTIONS: AspectRatioOption[] = [
  { id: '1-1-h', label: '1:1', w: 1, h: 1 },
  { id: '4-3', label: '4:3', w: 4, h: 3 },
  { id: '3-2', label: '3:2', w: 3, h: 2 },
  { id: '16-9', label: '16:9', w: 16, h: 9 },
];

const ALL_RATIO_OPTIONS: AspectRatioOption[] = [
  ...VERTICAL_RATIO_OPTIONS,
  ...HORIZONTAL_RATIO_OPTIONS,
];

const DEFAULT_IMAGE_DISPLAY: PosterImageDisplay = {
  widthPercent: 100,
  align: 'center',
};

const clampImageWidthPercent = (value: number) => Math.max(40, Math.min(100, Math.round(value)));

const normalizeImageAlign = (value: unknown): ImageAlign => {
  if (value === 'left' || value === 'right') return value;
  return 'center';
};

const normalizeImageDisplay = (value: unknown): PosterImageDisplay | null => {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Partial<PosterImageDisplay>;
  if (typeof raw.widthPercent !== 'number' || !Number.isFinite(raw.widthPercent)) return null;
  return {
    widthPercent: clampImageWidthPercent(raw.widthPercent),
    align: normalizeImageAlign(raw.align),
  };
};

const loadPersistedImageDisplays = (): Record<string, PosterImageDisplay> => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY_POSTER_IMAGE_DISPLAYS);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};

    const entries = Object.entries(parsed as Record<string, unknown>).slice(0, MAX_PERSISTED_IMAGE_STYLES);
    const next: Record<string, PosterImageDisplay> = {};
    for (const [key, value] of entries) {
      if (!key) continue;
      const normalized = normalizeImageDisplay(value);
      if (!normalized) continue;
      next[key] = normalized;
    }
    return next;
  } catch {
    return {};
  }
};

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
  const [posterWidth, setPosterWidth] = useState(presetWidth ?? DEFAULT_POSTER_WIDTH);
  const isResizing = useRef(false);
  const posterWidthRef = useRef(posterWidth);
  const posterNodeRef = useRef<HTMLDivElement>(null);
  const [activeAspectRatioId, setActiveAspectRatioId] = useState<string | null>(null);
  const [ratioPanel, setRatioPanel] = useState<'landscape' | 'portrait' | null>(null);
  const ratioToolbarRef = useRef<HTMLDivElement>(null);
  const ratioPanelRef = useRef<HTMLDivElement>(null);
  const imageToolRef = useRef<HTMLDivElement>(null);
  const [selectedImageKey, setSelectedImageKey] = useState<string | null>(null);
  const [posterImageDisplays, setPosterImageDisplays] = useState<Record<string, PosterImageDisplay>>(() => loadPersistedImageDisplays());

  const activeAspectRatio = useMemo(
    () => ALL_RATIO_OPTIONS.find(option => option.id === activeAspectRatioId) || null,
    [activeAspectRatioId]
  );
  const posterHeight = useMemo(() => {
    if (!activeAspectRatio) return undefined;
    return Math.round(posterWidth * (activeAspectRatio.h / activeAspectRatio.w));
  }, [activeAspectRatio, posterWidth]);

  useEffect(() => {
    if (isResizing.current) return;
    if (typeof presetWidth !== 'number' || !Number.isFinite(presetWidth)) return;
    // 外部预设宽度变化时，统一做边界裁剪再落地。
    const clamped = Math.max(320, Math.min(2000, presetWidth));
    setPosterWidth(prev => (Math.abs(prev - clamped) <= 0.5 ? prev : clamped));
  }, [presetWidth, presetWidthToken]);

  useEffect(() => {
    posterWidthRef.current = posterWidth;
  }, [posterWidth]);

  useEffect(() => {
    if (!onPosterWidthChange) return;
    if (isResizing.current) return;
    // 非拖拽场景（如模板自动设宽）仍需回传给上层持久化。
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
        posterWidthRef.current = newWidth;
        setPosterWidth(newWidth);
    };

    const onMouseUp = () => {
        isResizing.current = false;
        if (onPosterWidthChange) {
            // 拖拽结束后再一次性提交，避免拖拽过程与上层回写互相抖动。
            onPosterWidthChange(Math.round(posterWidthRef.current));
        }
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none'; 
  }, [posterWidth, onPosterWidthChange]);

  const ratioPanelOptions = ratioPanel === 'landscape' ? HORIZONTAL_RATIO_OPTIONS : VERTICAL_RATIO_OPTIONS;

  const handleSelectRatio = (option: AspectRatioOption) => {
    setActiveAspectRatioId(option.id);
    setRatioPanel(null);
  };

  const handleResetPosterSize = () => {
    setRatioPanel(null);
    setActiveAspectRatioId(null);
    posterWidthRef.current = DEFAULT_POSTER_WIDTH;
    setPosterWidth(DEFAULT_POSTER_WIDTH);
    if (onPosterWidthChange) {
      onPosterWidthChange(DEFAULT_POSTER_WIDTH);
    }
  };

  // 点击预览区其它位置时，自动收起比例二级菜单。
  useEffect(() => {
    if (!ratioPanel) return;

    const handleDocumentMouseDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;

      if (ratioToolbarRef.current?.contains(target)) return;
      if (ratioPanelRef.current?.contains(target)) return;

      setRatioPanel(null);
    };

    document.addEventListener('mousedown', handleDocumentMouseDown, true);
    return () => {
      document.removeEventListener('mousedown', handleDocumentMouseDown, true);
    };
  }, [ratioPanel]);

  // 文档级捕获：统一处理“图片选中 + 点外关闭”，避免 pointer/mouse 事件竞态。
  useEffect(() => {
    const handleDocumentPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (imageToolRef.current?.contains(target)) return;
      const imageHolder = target.closest('[data-mp-image-key]') as HTMLElement | null;
      if (imageHolder) {
        const key = imageHolder.getAttribute('data-mp-image-key');
        if (!key) return;
        setSelectedImageKey(prev => (prev === key ? prev : key));
        return;
      }
      if (selectedImageKey) {
        setSelectedImageKey(null);
      }
    };

    document.addEventListener('pointerdown', handleDocumentPointerDown, true);
    return () => {
      document.removeEventListener('pointerdown', handleDocumentPointerDown, true);
    };
  }, [selectedImageKey]);

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

  // 悬浮尺寸菜单配色：跟随当前预览主题色，不再沿用编辑区配色。
  const ratioMenuPalette = useMemo(() => {
    const colors = themeStyle.colors;
    const dark = Boolean(themeStyle.isDark);

    if (!colors) {
      return {
        barBg: isDarkMode ? '#2c313a' : '#f1efea',
        barText: isDarkMode ? '#d4cfbf' : '#6f6558',
        barBorder: isDarkMode ? '#3e4451' : '#e2ddd2',
        hoverBg: isDarkMode ? '#3e4451' : '#ffffff',
        activeBg: isDarkMode ? '#3e4451' : '#ffffff',
        activeText: isDarkMode ? '#e5c07b' : '#c28c2c',
        panelBg: isDarkMode ? '#252a32' : '#ffffff',
        panelText: isDarkMode ? '#d4cfbf' : '#374151',
        panelBorder: isDarkMode ? '#3e4451' : '#e5e7eb',
        tooltipBg: isDarkMode ? '#1e2227' : '#ffffff',
        tooltipText: isDarkMode ? '#d4cfbf' : '#6f6558',
      };
    }

    return dark
      ? {
          barBg: `color-mix(in srgb, ${colors.secondary} 72%, black)`,
          barText: `color-mix(in srgb, ${colors.assist} 54%, white)`,
          barBorder: `color-mix(in srgb, ${colors.assist} 24%, transparent)`,
          hoverBg: `color-mix(in srgb, ${colors.primary} 26%, transparent)`,
          activeBg: `color-mix(in srgb, ${colors.primary} 40%, transparent)`,
          activeText: `color-mix(in srgb, ${colors.primary} 60%, white)`,
          panelBg: `color-mix(in srgb, ${colors.secondary} 78%, black)`,
          panelText: `color-mix(in srgb, ${colors.assist} 62%, white)`,
          panelBorder: `color-mix(in srgb, ${colors.assist} 28%, transparent)`,
          tooltipBg: `color-mix(in srgb, ${colors.secondary} 84%, black)`,
          tooltipText: `color-mix(in srgb, ${colors.assist} 62%, white)`,
        }
      : {
          barBg: `color-mix(in srgb, ${colors.assist} 16%, white)`,
          barText: `color-mix(in srgb, ${colors.secondary} 76%, ${colors.primary})`,
          barBorder: `color-mix(in srgb, ${colors.assist} 24%, transparent)`,
          hoverBg: `color-mix(in srgb, ${colors.primary} 8%, white)`,
          activeBg: `color-mix(in srgb, ${colors.primary} 14%, white)`,
          activeText: `color-mix(in srgb, ${colors.primary} 88%, ${colors.secondary})`,
          panelBg: `color-mix(in srgb, ${colors.assist} 10%, white)`,
          panelText: `color-mix(in srgb, ${colors.secondary} 84%, ${colors.primary})`,
          panelBorder: `color-mix(in srgb, ${colors.assist} 26%, transparent)`,
          tooltipBg: `color-mix(in srgb, ${colors.secondary} 92%, white)`,
          tooltipText: '#ffffff',
        };
  }, [themeStyle.colors, themeStyle.isDark, isDarkMode]);

  const selectedImageDisplay = useMemo(() => {
    if (!selectedImageKey) return null;
    return posterImageDisplays[selectedImageKey] || DEFAULT_IMAGE_DISPLAY;
  }, [posterImageDisplays, selectedImageKey]);

  useEffect(() => {
    try {
      const entries = Object.entries(posterImageDisplays).slice(0, MAX_PERSISTED_IMAGE_STYLES);
      if (entries.length === 0) {
        localStorage.removeItem(STORAGE_KEY_POSTER_IMAGE_DISPLAYS);
        return;
      }
      const compact = Object.fromEntries(entries);
      localStorage.setItem(STORAGE_KEY_POSTER_IMAGE_DISPLAYS, JSON.stringify(compact));
    } catch (error) {
      console.warn('Failed to persist image display settings', error);
    }
  }, [posterImageDisplays]);

  const updateSelectedImageDisplay = useCallback((patch: Partial<PosterImageDisplay>) => {
    if (!selectedImageKey) return;
    setPosterImageDisplays(prev => {
      const current = prev[selectedImageKey] || DEFAULT_IMAGE_DISPLAY;
      const next: PosterImageDisplay = {
        widthPercent: clampImageWidthPercent(
          typeof patch.widthPercent === 'number' ? patch.widthPercent : current.widthPercent
        ),
        align: normalizeImageAlign(patch.align ?? current.align),
      };
      return {
        ...prev,
        [selectedImageKey]: next,
      };
    });
  }, [selectedImageKey]);

  const handleResetSelectedImageDisplay = useCallback(() => {
    if (!selectedImageKey) return;
    setPosterImageDisplays(prev => {
      const next = { ...prev };
      delete next[selectedImageKey];
      return next;
    });
  }, [selectedImageKey]);

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
       {/* 海报尺寸浮动菜单：样式与编辑区侧边图标条一致。 */}
       <div
         ref={ratioToolbarRef}
         className="absolute right-6 top-24 z-[80] flex flex-col items-center gap-2 rounded-full px-1.5 py-2 shadow-lg pointer-events-auto border"
         style={{
           backgroundColor: ratioMenuPalette.barBg,
           color: ratioMenuPalette.barText,
           borderColor: ratioMenuPalette.barBorder,
         }}
       >
        <button
          type="button"
          data-testid="ratio-menu-portrait"
          onClick={() => setRatioPanel(prev => (prev === 'portrait' ? null : 'portrait'))}
          className="group relative w-9 h-9 rounded-full flex items-center justify-center transition-colors"
          style={{
            backgroundColor: ratioPanel === 'portrait' ? ratioMenuPalette.activeBg : undefined,
            color: ratioPanel === 'portrait' ? ratioMenuPalette.activeText : undefined,
          }}
          onMouseEnter={(e) => {
            if (ratioPanel === 'portrait') return;
            e.currentTarget.style.backgroundColor = ratioMenuPalette.hoverBg;
          }}
          onMouseLeave={(e) => {
            if (ratioPanel === 'portrait') return;
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          title="竖版尺寸"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect x="8" y="4" width="8" height="16" rx="2" strokeWidth={2} />
          </svg>
          <span
            className="absolute right-12 top-1/2 -translate-y-1/2 px-2 py-1 rounded text-[10px] whitespace-nowrap opacity-0 pointer-events-none transition-opacity group-hover:opacity-100 shadow-sm border"
            style={{
              backgroundColor: ratioMenuPalette.tooltipBg,
              color: ratioMenuPalette.tooltipText,
              borderColor: ratioMenuPalette.barBorder,
            }}
          >
            竖版
          </span>
        </button>
        <button
          type="button"
          data-testid="ratio-menu-landscape"
          onClick={() => setRatioPanel(prev => (prev === 'landscape' ? null : 'landscape'))}
          className="group relative w-9 h-9 rounded-full flex items-center justify-center transition-colors"
          style={{
            backgroundColor: ratioPanel === 'landscape' ? ratioMenuPalette.activeBg : undefined,
            color: ratioPanel === 'landscape' ? ratioMenuPalette.activeText : undefined,
          }}
          onMouseEnter={(e) => {
            if (ratioPanel === 'landscape') return;
            e.currentTarget.style.backgroundColor = ratioMenuPalette.hoverBg;
          }}
          onMouseLeave={(e) => {
            if (ratioPanel === 'landscape') return;
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          title="横版尺寸"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect x="4" y="8" width="16" height="8" rx="2" strokeWidth={2} />
          </svg>
          <span
            className="absolute right-12 top-1/2 -translate-y-1/2 px-2 py-1 rounded text-[10px] whitespace-nowrap opacity-0 pointer-events-none transition-opacity group-hover:opacity-100 shadow-sm border"
            style={{
              backgroundColor: ratioMenuPalette.tooltipBg,
              color: ratioMenuPalette.tooltipText,
              borderColor: ratioMenuPalette.barBorder,
            }}
          >
            横版
          </span>
        </button>
        <button
          type="button"
          data-testid="ratio-reset"
          onClick={handleResetPosterSize}
          className="group relative w-9 h-9 rounded-full flex items-center justify-center transition-colors"
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = ratioMenuPalette.hoverBg;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          title="重置尺寸"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5M5 9a7 7 0 0111.2-2.4L20 9M19 15a7 7 0 01-11.2 2.4L4 15" />
          </svg>
          <span
            className="absolute right-12 top-1/2 -translate-y-1/2 px-2 py-1 rounded text-[10px] whitespace-nowrap opacity-0 pointer-events-none transition-opacity group-hover:opacity-100 shadow-sm border"
            style={{
              backgroundColor: ratioMenuPalette.tooltipBg,
              color: ratioMenuPalette.tooltipText,
              borderColor: ratioMenuPalette.barBorder,
            }}
          >
            重置
          </span>
        </button>
       </div>

       {ratioPanel && (
        <div
          ref={ratioPanelRef}
          className="absolute right-20 top-24 z-[81] rounded-lg border shadow-lg p-2 pointer-events-auto flex items-center gap-1 whitespace-nowrap"
          style={{
            backgroundColor: ratioMenuPalette.panelBg,
            color: ratioMenuPalette.panelText,
            borderColor: ratioMenuPalette.panelBorder,
          }}
        >
          {ratioPanelOptions.map(option => {
            const isActive = activeAspectRatioId === option.id;
            return (
              <button
                key={option.id}
                type="button"
                data-testid={`ratio-${option.id}`}
                onClick={() => handleSelectRatio(option)}
                className="px-2.5 py-1.5 rounded text-sm font-semibold transition-colors"
                style={{
                  backgroundColor: isActive ? ratioMenuPalette.activeBg : 'transparent',
                  color: isActive ? ratioMenuPalette.activeText : ratioMenuPalette.panelText,
                }}
                onMouseEnter={(e) => {
                  if (isActive) return;
                  e.currentTarget.style.backgroundColor = ratioMenuPalette.hoverBg;
                }}
                onMouseLeave={(e) => {
                  if (isActive) return;
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
       )}

       {selectedImageKey && selectedImageDisplay && (
        <div
          ref={imageToolRef}
          className="absolute right-6 top-[17.5rem] z-[82] w-64 rounded-lg border shadow-lg p-3 pointer-events-auto space-y-3"
          style={{
            backgroundColor: ratioMenuPalette.panelBg,
            color: ratioMenuPalette.panelText,
            borderColor: ratioMenuPalette.panelBorder,
          }}
        >
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold tracking-wide">图片样式</div>
            <button
              type="button"
              onClick={() => setSelectedImageKey(null)}
              className="text-xs px-2 py-0.5 rounded transition-colors"
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = ratioMenuPalette.hoverBg;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              关闭
            </button>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span>宽度</span>
              <span>{selectedImageDisplay.widthPercent}%</span>
            </div>
            <input
              type="range"
              min={40}
              max={100}
              step={1}
              value={selectedImageDisplay.widthPercent}
              onChange={(e) => {
                updateSelectedImageDisplay({ widthPercent: Number(e.target.value) });
              }}
              className="w-full"
            />
          </div>

          <div className="space-y-1">
            <div className="text-xs">对齐</div>
            <div className="flex items-center gap-1">
              {([
                { id: 'left', label: '左' },
                { id: 'center', label: '中' },
                { id: 'right', label: '右' },
              ] as { id: ImageAlign; label: string }[]).map(item => {
                const active = selectedImageDisplay.align === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => updateSelectedImageDisplay({ align: item.id })}
                    className="flex-1 px-2 py-1 text-xs rounded transition-colors"
                    style={{
                      backgroundColor: active ? ratioMenuPalette.activeBg : 'transparent',
                      color: active ? ratioMenuPalette.activeText : ratioMenuPalette.panelText,
                    }}
                    onMouseEnter={(e) => {
                      if (active) return;
                      e.currentTarget.style.backgroundColor = ratioMenuPalette.hoverBg;
                    }}
                    onMouseLeave={(e) => {
                      if (active) return;
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            className="w-full px-2 py-1.5 rounded text-sm font-semibold transition-colors"
            onClick={handleResetSelectedImageDisplay}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = ratioMenuPalette.hoverBg;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            重置当前图片
          </button>
        </div>
       )}

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
                        data-testid="poster-shell"
                        className="relative transition-shadow duration-300 shadow-2xl shrink-0 origin-top"
                        style={{
                          width: `${posterWidth}px`,
                          height: typeof posterHeight === 'number' ? `${posterHeight}px` : undefined,
                        }}
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
                                ${activeAspectRatio ? 'h-full overflow-hidden' : ''}
                            `}
                            style={{
                                width: '100%',
                                height: activeAspectRatio ? '100%' : undefined,
                                ...themeStyle.frameStyle,
                                ...cssVariables
                            }}
                            onMouseDown={(e) => e.stopPropagation()} 
                        >
                            <div className={`
                                relative flex flex-col z-10
                                ${themeStyle.card}
                                ${activeAspectRatio ? 'flex-1 min-h-0' : ''}
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
                                    ${activeAspectRatio ? 'min-h-0 overflow-y-auto' : ''}
                                `}>
                                    <div className="min-h-full flex flex-col justify-center">
                                    <div className={`prose max-w-none ${themeStyle.prose} ${fontSizeClass} ${spacingClass}`}>
                                        <ReactMarkdown 
                                            remarkPlugins={[remarkGfm, remarkMath, remarkDirective, remarkRuby, remarkCenter]}
                                            rehypePlugins={[rehypeKatex]}
                                            urlTransform={safeMarkdownUrlTransform}
                                            components={{
                                                img: ({ node, ...props }) => {
                                                  const rawSrc = typeof props.src === 'string' ? props.src : '';
                                                  const offset = typeof (node as any)?.position?.start?.offset === 'number'
                                                    ? (node as any).position.start.offset
                                                    : -1;
                                                  const imageKey = `${offset}:${rawSrc}`;
                                                  const isSelectedImage = selectedImageKey === imageKey;
                                                  return (
                                                    <span
                                                      data-mp-image-key={imageKey}
                                                      className="block cursor-pointer"
                                                    >
                                                      <StableImage
                                                        {...props}
                                                        imagePool={imagePool}
                                                        imageKey={imageKey}
                                                        imageDisplay={posterImageDisplays[imageKey]}
                                                        isSelected={isSelectedImage}
                                                      />
                                                    </span>
                                                  );
                                                },
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
                            </div>

                            {showWatermark && (
                                <div
                                  className={`mt-6 z-10 ${watermarkAlign} ${themeStyle.watermarkColor}`}
                                  style={themeStyle.watermarkStyle}
                                >
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
