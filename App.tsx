/**
 * 模块说明：应用主组件，负责编辑器状态管理、预览模式切换、智能面板交互与外部导入流程。
 */

import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { Toolbar } from './components/Toolbar';
import { PreviewControlBar } from './components/PreviewControlBar';
import { PosterPreview } from './components/PosterPreview';
import { WritingPreview } from './components/WritingPreview';
import { WeChatPreview } from './components/WeChatPreview';
import { ConfirmationModal } from './components/ConfirmationModal';
import { ContentTemplatePopover, TemplateApplyMode, TemplateApplyOptions, TemplateKind } from './components/ContentTemplatePopover';
import { BorderTheme, FontSize, ViewMode, LayoutTheme, PaddingSize, WatermarkAlign, WeChatConfig, WritingTheme, SpacingLevel, PosterTemplate } from './types';
import { cleanImagePool, compressImage } from './utils/imageUtils';
import { DEFAULT_MARKDOWN } from './constants/defaultContent';
import { usePosterExport } from './hooks/usePosterExport';
import { useWeChatExport } from './hooks/useWeChatExport';
import { useProjectExport } from './hooks/useProjectExport';
import { ThemeRegistry } from './utils/themeRegistry';
import { repairMarkdownBlock } from './utils/markdownRepair';

// 本地存储键名
const STORAGE_KEY_MARKDOWN = 'markdown_poster_draft';
const STORAGE_KEY_THEME = 'markdown_poster_theme';
const STORAGE_KEY_LAYOUT_THEME = 'markdown_poster_layout_theme';
const STORAGE_KEY_WRITING_THEME = 'markdown_poster_writing_theme';
const STORAGE_KEY_FONT_SIZE = 'markdown_poster_fontsize';
const STORAGE_KEY_PADDING = 'markdown_poster_padding';
const STORAGE_KEY_SPACING = 'markdown_poster_spacing';
const STORAGE_KEY_WATERMARK_SHOW = 'markdown_poster_watermark_show';
const STORAGE_KEY_WATERMARK_TEXT = 'markdown_poster_watermark_text';
const STORAGE_KEY_WATERMARK_ALIGN = 'markdown_poster_watermark_align';
const STORAGE_KEY_DARK_MODE = 'markdown_poster_dark_mode';
const STORAGE_KEY_IMAGE_POOL = 'markdown_poster_image_pool'; 
const STORAGE_KEY_WECHAT_CONFIG = 'markdown_poster_wechat_config_v2'; 
const STORAGE_KEY_CUSTOM_COLOR = 'markdown_poster_custom_color';
const STORAGE_KEY_VIEW_MODE = 'markdown_poster_view_mode';
const STORAGE_KEY_POSTER_TEMPLATE_ID = 'markdown_poster_active_template_id';
const STORAGE_KEY_POSTER_TEMPLATE_TWEAKS = 'markdown_poster_template_tweaks_v1';
const STORAGE_KEY_POSTER_WIDTH = 'markdown_poster_width';

// 历史记录上限
const MAX_HISTORY_SIZE = 10;
const POEM_POSTER_WIDTH = 320;
const MAX_IMPORT_CHARS = 120000;
const MAX_IMPORT_BYTES = 200 * 1024;
const IMPORT_PM_TIMEOUT_MS = 10000;

const decodeBase64UrlUtf8 = (encoded: string): string => {
  const normalized = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + '='.repeat(padLength);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
};

const isImportRoute = () => {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname.toLowerCase();
  return path === '/import' || path.endsWith('/import');
};

type PosterTweaksSnapshot = {
  theme: BorderTheme;
  layoutTheme: LayoutTheme;
  fontSize: FontSize;
  padding: PaddingSize;
  spacing: SpacingLevel;
  showWatermark: boolean;
  watermarkText: string;
  watermarkAlign: WatermarkAlign;
  customThemeColor: string;
};

const makeThemeTweaksKey = (themeId: BorderTheme) => `theme:${themeId}`;

type TemplateContext = {
  sourceText: string;
  hasSelection: boolean;
  selectionStart: number;
  selectionEnd: number;
};

const loadPosterTemplateTweaks = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_POSTER_TEMPLATE_TWEAKS);
    return raw ? (JSON.parse(raw) as Record<string, PosterTweaksSnapshot>) : {};
  } catch {
    return {};
  }
};

export default function App() {
  const defaults = ThemeRegistry.getDefaults();

  // --- 基于 LocalStorage 初始化状态 ---
  
  // 1) Markdown 正文
  const [markdown, setMarkdown] = useState<string>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_MARKDOWN);
    return saved !== null ? saved : DEFAULT_MARKDOWN;
  });

  // 2) 海报边框主题
  const [theme, setTheme] = useState<BorderTheme>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_THEME);
    return (saved as BorderTheme) || defaults.theme;
  });

  // 3) 文字风格主题
  const [layoutTheme, setLayoutTheme] = useState<LayoutTheme>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_LAYOUT_THEME);
    const normalized = (saved as LayoutTheme) || defaults.layout;
    // 兼容旧值：Vibrant 已迁移为 Marker
    return normalized === 'Vibrant' ? 'Marker' : normalized;
  });

  // 3.1) 阅读模式主题
  const [writingTheme, setWritingTheme] = useState<WritingTheme>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_WRITING_THEME);
    return (saved as WritingTheme) || defaults.writingTheme;
  });

  // 4) 字号
  const [fontSize, setFontSize] = useState<FontSize>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_FONT_SIZE);
    const normalized = (saved as FontSize) || defaults.fontSize;
    // 兼容旧值：XLarge 已迁移为 Large
    return normalized === 'XLarge' ? 'Large' : normalized;
  });

  // 5) 内容边距（同时影响外框视觉宽度）
  const [padding, setPadding] = useState<PaddingSize>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PADDING);
    return (saved as PaddingSize) || defaults.padding;
  });
  
  // 5.1) 行距等级
  const [spacing, setSpacing] = useState<SpacingLevel>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_SPACING);
    return (saved as SpacingLevel) || 'standard';
  });
  
  // 6) 署名/水印设置
  const [showWatermark, setShowWatermark] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_WATERMARK_SHOW);
    return saved !== null ? saved === 'true' : defaults.watermark.show;
  });
  
  const [watermarkText, setWatermarkText] = useState<string>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_WATERMARK_TEXT);
    return saved !== null ? saved : defaults.watermark.text;
  });

  const [watermarkAlign, setWatermarkAlign] = useState<WatermarkAlign>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_WATERMARK_ALIGN);
    return (saved as WatermarkAlign) || defaults.watermark.align;
  });

  // 7) 深色模式（无本地值时回退系统偏好）
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_DARK_MODE);
    if (saved !== null) {
        return saved === 'true';
    }
    // 回退系统偏好
    if (typeof window !== 'undefined') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // 8) 预览模式（海报/阅读/公众号）
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_VIEW_MODE);
    // 首次进入默认阅读模式，海报是后续加工步骤
    return (saved as ViewMode) || ViewMode.Writing;
  });
  
  // 9) 公众号配置
  const [weChatConfig, setWeChatConfig] = useState<WeChatConfig>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_WECHAT_CONFIG);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
          template: 'basic',
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
          lineHeight: 'comfortable',
          ...parsed
      };
    }
    return {
      template: 'basic',
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
    };
  });

  // 10) 图片池（本地虚拟文件系统）
  const [imagePool, setImagePool] = useState<Record<string, string>>(() => {
    try {
      const savedPoolStr = localStorage.getItem(STORAGE_KEY_IMAGE_POOL);
      const savedMarkdown = localStorage.getItem(STORAGE_KEY_MARKDOWN); 
      const contentToCheck = savedMarkdown !== null ? savedMarkdown : DEFAULT_MARKDOWN;

      let pool = savedPoolStr ? JSON.parse(savedPoolStr) : {};
      const { cleanedPool } = cleanImagePool(pool, contentToCheck, 'Startup');
      
      return cleanedPool;
    } catch (e) {
      console.error("Failed to load image pool", e);
      return {};
    }
  });
  const imagePoolRef = useRef(imagePool);
  useEffect(() => {
    imagePoolRef.current = imagePool;
  }, [imagePool]);

  // 11) 自定义主色（用于可改色主题）
  const [customThemeColor, setCustomThemeColor] = useState<string>(() => {
      return localStorage.getItem(STORAGE_KEY_CUSTOM_COLOR) || '#6366f1';
  });

  // 12) 弹窗状态
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  // 13) 当前海报模板 + 每模板微调快照
  const [activePosterTemplateId, setActivePosterTemplateId] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_POSTER_TEMPLATE_ID) || '';
  });
  const posterTemplateTweaksRef = useRef<Record<string, PosterTweaksSnapshot>>(loadPosterTemplateTweaks());
  const isApplyingTemplateRef = useRef(false);
  
  // --- 本地持久化副作用 ---
  
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_MARKDOWN, markdown);
  }, [markdown]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_THEME, theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_LAYOUT_THEME, layoutTheme);
  }, [layoutTheme]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_WRITING_THEME, writingTheme);
  }, [writingTheme]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_FONT_SIZE, fontSize);
  }, [fontSize]);
  
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PADDING, padding);
  }, [padding]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SPACING, spacing);
  }, [spacing]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_WATERMARK_SHOW, String(showWatermark));
  }, [showWatermark]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_WATERMARK_TEXT, watermarkText);
  }, [watermarkText]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_WATERMARK_ALIGN, watermarkAlign);
  }, [watermarkAlign]);
  
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_DARK_MODE, String(isDarkMode));
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_VIEW_MODE, viewMode);
  }, [viewMode]);
  
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_WECHAT_CONFIG, JSON.stringify(weChatConfig));
  }, [weChatConfig]);

  useEffect(() => {
      localStorage.setItem(STORAGE_KEY_CUSTOM_COLOR, customThemeColor);
  }, [customThemeColor]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_POSTER_TEMPLATE_ID, activePosterTemplateId);
  }, [activePosterTemplateId]);

  // 在海报模式下持续更新“当前模板微调快照”
  useEffect(() => {
    if (viewMode !== ViewMode.Poster) return;
    if (isApplyingTemplateRef.current) return;

    const snapshot: PosterTweaksSnapshot = {
      theme,
      layoutTheme,
      fontSize,
      padding,
      spacing,
      showWatermark,
      watermarkText,
      watermarkAlign,
      customThemeColor
    };

    const map = posterTemplateTweaksRef.current;
    if (activePosterTemplateId) map[activePosterTemplateId] = snapshot;
    map[makeThemeTweaksKey(theme)] = snapshot;
    try {
      localStorage.setItem(STORAGE_KEY_POSTER_TEMPLATE_TWEAKS, JSON.stringify(map));
    } catch (e) {
      console.warn('Failed to persist poster template tweaks', e);
    }
  }, [
    viewMode,
    activePosterTemplateId,
    theme,
    layoutTheme,
    fontSize,
    padding,
    spacing,
    showWatermark,
    watermarkText,
    watermarkAlign,
    customThemeColor
  ]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_IMAGE_POOL, JSON.stringify(imagePool));
    } catch (e) {
      console.warn("LocalStorage quota exceeded.", e);
    }
  }, [imagePool]);

  // ---------------------------

  const [leftWidth, setLeftWidth] = useState(50); 
  const [posterWidthPreset, setPosterWidthPreset] = useState<number | undefined>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_POSTER_WIDTH);
    if (!saved) return undefined;
    const parsed = Number(saved);
    if (!Number.isFinite(parsed)) return undefined;
    return Math.max(320, Math.min(2000, Math.round(parsed)));
  });
  const [posterWidthPresetToken, setPosterWidthPresetToken] = useState(0);

  useEffect(() => {
    if (typeof posterWidthPreset === 'number' && Number.isFinite(posterWidthPreset)) {
      localStorage.setItem(STORAGE_KEY_POSTER_WIDTH, String(Math.round(posterWidthPreset)));
      return;
    }
    localStorage.removeItem(STORAGE_KEY_POSTER_WIDTH);
  }, [posterWidthPreset]);
  
  // 引用句柄
  const exportRef = useRef<HTMLDivElement>(null);
  const weChatRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editorPanelRef = useRef<HTMLDivElement>(null);
  const [isTemplatePopoverOpen, setIsTemplatePopoverOpen] = useState(false);
  const [smartPanelTemplate, setSmartPanelTemplate] = useState<TemplateKind>('semantic');
  const [smartPanelPosition, setSmartPanelPosition] = useState({ x: 140, y: 40 });
  const [isDraggingSmartPanel, setIsDraggingSmartPanel] = useState(false);
  const smartPanelDragOffsetRef = useRef({ x: 0, y: 0 });
  const [templateContext, setTemplateContext] = useState<TemplateContext>({
    sourceText: '',
    hasSelection: false,
    selectionStart: 0,
    selectionEnd: 0
  });
  const [repairNotice, setRepairNotice] = useState<{ message: string; id: number } | null>(null);
  
  const posterScrollRef = useRef<HTMLDivElement>(null);
  const writingScrollRef = useRef<HTMLDivElement>(null);
  const wechatScrollRef = useRef<HTMLDivElement>(null);
  const isSyncingLeft = useRef(false);
  const isSyncingRight = useRef(false);
  const [showBackToTop, setShowBackToTop] = useState(false);

  const activePreviewRef = useMemo(() => {
    switch (viewMode) {
        case ViewMode.Poster: return posterScrollRef; // Note: In new Canvas mode, this ref might be unused for scroll sync
        case ViewMode.WeChat: return wechatScrollRef;
        default: return writingScrollRef;
    }
  }, [viewMode]);

  const { isExporting: isExportingPoster, handleDownloadPoster, handleCopyPoster } = usePosterExport({ exportRef, imagePool, setImagePool, markdown });
  const { isCopyingWeChat, handleCopyHtml } = useWeChatExport({ weChatRef });
  const { isExportingZip, handleExportZip, handleDownloadMarkdown } = useProjectExport({ markdown, imagePool });

  const getCurrentPosterTweaksKey = useCallback(() => {
    if (activePosterTemplateId) return activePosterTemplateId;
    const tpl = ThemeRegistry.getTemplates().find(t => t.borderThemeId === theme);
    return tpl?.id || makeThemeTweaksKey(theme);
  }, [activePosterTemplateId, theme]);

  const persistCurrentPosterTweaks = useCallback(() => {
    const snapshot: PosterTweaksSnapshot = {
      theme,
      layoutTheme,
      fontSize,
      padding,
      spacing,
      showWatermark,
      watermarkText,
      watermarkAlign,
      customThemeColor
    };

    const map = posterTemplateTweaksRef.current;
    const key = getCurrentPosterTweaksKey();
    map[key] = snapshot;
    map[makeThemeTweaksKey(theme)] = snapshot;
    try {
      localStorage.setItem(STORAGE_KEY_POSTER_TEMPLATE_TWEAKS, JSON.stringify(map));
    } catch (e) {
      console.warn('Failed to persist poster template tweaks', e);
    }
  }, [
    getCurrentPosterTweaksKey,
    theme,
    layoutTheme,
    fontSize,
    padding,
    spacing,
    showWatermark,
    watermarkText,
    watermarkAlign,
    customThemeColor
  ]);

  const applyPosterTweaksSnapshot = useCallback((snapshot: PosterTweaksSnapshot) => {
    setTheme(snapshot.theme);
    setLayoutTheme(snapshot.layoutTheme);
    setFontSize(snapshot.fontSize);
    setPadding(snapshot.padding);
    setSpacing(snapshot.spacing);
    setShowWatermark(snapshot.showWatermark);
    setWatermarkText(snapshot.watermarkText);
    setWatermarkAlign(snapshot.watermarkAlign);
    setCustomThemeColor(snapshot.customThemeColor);
  }, []);

  const handleRestorePosterTemplateDefaults = useCallback(() => {
    const allTemplates = ThemeRegistry.getTemplates();
    const tpl =
      (activePosterTemplateId ? allTemplates.find(t => t.id === activePosterTemplateId) : undefined) ||
      allTemplates.find(t => t.borderThemeId === theme && t.layoutThemeId === layoutTheme) ||
      allTemplates.find(t => t.borderThemeId === theme);

    if (!tpl) return;

    // 清掉模板和主题的微调缓存，确保“恢复默认”是真恢复
    const map = posterTemplateTweaksRef.current;
    delete map[tpl.id];
    delete map[makeThemeTweaksKey(tpl.borderThemeId)];
    try {
      localStorage.setItem(STORAGE_KEY_POSTER_TEMPLATE_TWEAKS, JSON.stringify(map));
    } catch (e) {
      console.warn('Failed to persist poster template tweaks', e);
    }

    isApplyingTemplateRef.current = true;
    try {
      setActivePosterTemplateId(tpl.id);
      setTheme(tpl.borderThemeId);
      setLayoutTheme(tpl.layoutThemeId);
      setFontSize(tpl.defaults.fontSize);
      setPadding(tpl.defaults.padding);
      setSpacing(tpl.defaults.spacing);
      setShowWatermark(tpl.defaults.watermark.show);
      setWatermarkAlign(tpl.defaults.watermark.align);
      setWatermarkText(tpl.defaults.watermark.text || defaults.watermark.text);
      if (tpl.defaults.customThemeColor) {
        setCustomThemeColor(tpl.defaults.customThemeColor);
      }
    } finally {
      queueMicrotask(() => {
        isApplyingTemplateRef.current = false;
      });
    }
  }, [activePosterTemplateId, theme, layoutTheme, defaults.watermark.text]);

  // --- 模板切换逻辑 ---
  const handleApplyTemplate = useCallback((tpl: PosterTemplate) => {
    // 切换模板前先保存当前微调
    persistCurrentPosterTweaks();

    const map = posterTemplateTweaksRef.current;
    const saved =
      map[tpl.id] ||
      map[makeThemeTweaksKey(tpl.borderThemeId)];

    isApplyingTemplateRef.current = true;
    try {
      setActivePosterTemplateId(tpl.id);

      // 若已有模板快照则恢复快照，否则回退模板默认参数
      if (saved) {
        applyPosterTweaksSnapshot({
          ...saved,
          theme: tpl.borderThemeId
        });
        return;
      }

      setTheme(tpl.borderThemeId);
      setLayoutTheme(tpl.layoutThemeId);
      setFontSize(tpl.defaults.fontSize);
      setPadding(tpl.defaults.padding);
      setSpacing(tpl.defaults.spacing);
      setShowWatermark(tpl.defaults.watermark.show);
      setWatermarkAlign(tpl.defaults.watermark.align);
      if (tpl.defaults.watermark.text) {
        setWatermarkText(tpl.defaults.watermark.text);
      }
      if (tpl.defaults.customThemeColor) {
        setCustomThemeColor(tpl.defaults.customThemeColor);
      }
    } finally {
      // 下一帧恢复持久化，避免模板应用过程被误写回
      queueMicrotask(() => {
        isApplyingTemplateRef.current = false;
      });
    }
  }, [applyPosterTweaksSnapshot, persistCurrentPosterTweaks]);

  // 如果本地有样式但没有模板 id，尝试推断当前模板
  useEffect(() => {
    if (activePosterTemplateId) return;
    const tpl =
      ThemeRegistry.getTemplates().find(t => t.borderThemeId === theme && t.layoutThemeId === layoutTheme) ||
      ThemeRegistry.getTemplates().find(t => t.borderThemeId === theme);
    if (tpl) setActivePosterTemplateId(tpl.id);
  }, [activePosterTemplateId, theme, layoutTheme]);

  // --- 左右滚动同步 ---
  const handleEditorScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    // 海报模式由画布接管，不参与滚动同步
    if (viewMode === ViewMode.Poster) return;

    if (isSyncingRight.current) return;
    const editor = e.currentTarget;
    const preview = activePreviewRef.current;
    if (preview) {
        isSyncingLeft.current = true;
        const percentage = editor.scrollTop / (editor.scrollHeight - editor.clientHeight);
        if (!isNaN(percentage)) {
             preview.scrollTop = percentage * (preview.scrollHeight - preview.clientHeight);
        }
        setTimeout(() => { isSyncingLeft.current = false; }, 50);
    }
  };

  const handlePreviewScroll = (e: React.UIEvent<HTMLDivElement>) => {
    // 海报模式由画布接管，不参与滚动同步
    if (viewMode === ViewMode.Poster) return;

    const target = e.currentTarget;
    if (target.scrollTop > 300) setShowBackToTop(true);
    else setShowBackToTop(false);

    if (isSyncingLeft.current) return;
    const editor = textareaRef.current;
    if (editor) {
        isSyncingRight.current = true;
        const percentage = target.scrollTop / (target.scrollHeight - target.clientHeight);
        if (!isNaN(percentage)) {
            editor.scrollTop = percentage * (editor.scrollHeight - editor.clientHeight);
        }
        setTimeout(() => { isSyncingRight.current = false; }, 50);
    }
  };

  const scrollToTop = () => {
    if (activePreviewRef.current && viewMode !== ViewMode.Poster) {
         activePreviewRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
    if (textareaRef.current) textareaRef.current.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --- 历史记录与通用状态 ---
  const [history, setHistory] = useState<string[]>(() => [markdown]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toggleTheme = useCallback(() => setIsDarkMode(prev => !prev), []);
  const wordCount = useMemo(() => markdown.replace(/\s/g, '').length, [markdown]);
  const dateStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}`;
  }, []);

  const pushToHistory = useCallback((newText: string) => {
    // 仅保留“当前历史点之前”的分支，避免在撤销后产生分叉历史。
    const nextHistory = history.slice(0, historyIndex + 1);
    nextHistory.push(newText);
    // 历史上限固定，超出后从头部裁剪，保持内存稳定。
    if (nextHistory.length > MAX_HISTORY_SIZE) {
      const slicedHistory = nextHistory.slice(nextHistory.length - MAX_HISTORY_SIZE);
      setHistory(slicedHistory);
      setHistoryIndex(MAX_HISTORY_SIZE - 1);
    } else {
      setHistory(nextHistory);
      setHistoryIndex(nextHistory.length - 1);
    }
  }, [history, historyIndex]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setMarkdown(history[newIndex]);
    }
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setMarkdown(history[newIndex]);
    }
  }, [history, historyIndex]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setMarkdown(newText);
    // 输入过程做防抖，避免每个按键都写入历史栈导致撤销粒度过碎。
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (newText !== history[historyIndex]) pushToHistory(newText);
    }, 500);
  };

  const updateMarkdownImmediate = (newText: string) => {
    setMarkdown(newText);
    pushToHistory(newText);
    requestAnimationFrame(() => textareaRef.current?.focus({ preventScroll: true }));
  };

  const cleanupImportAddress = useCallback(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    // 导入完成后清理 URL 参数，避免 payload 被复制传播。
    url.hash = '';
    url.searchParams.delete('mp_channel');
    url.searchParams.delete('mp_nonce');
    url.searchParams.delete('mp_source');
    const next = `${url.pathname}${url.search ? url.search : ''}`;
    window.history.replaceState({}, document.title, next);
  }, []);

  const applyExternalImport = useCallback((incomingMarkdown: string, source?: string) => {
    const importBytes = new TextEncoder().encode(incomingMarkdown).length;
    // 字节阈值用于兜底超大 payload，防止主线程阻塞或本地存储抖动。
    if (importBytes > MAX_IMPORT_BYTES) {
      setRepairNotice({ message: '导入内容体积过大，已拒绝', id: Date.now() });
      return false;
    }
    // 字符阈值用于防止极长文档导致编辑器渲染压力过大。
    if (incomingMarkdown.length > MAX_IMPORT_CHARS) {
      setRepairNotice({ message: '导入内容过长，已拒绝', id: Date.now() });
      return false;
    }
    // 外部导入按“新会话”处理，重置历史栈基线，避免与旧文档撤销链混用。
    setMarkdown(incomingMarkdown);
    setHistory([incomingMarkdown]);
    setHistoryIndex(0);
    const sourceText = source ? `（来源：${source}）` : '';
    setRepairNotice({ message: `已导入外部内容${sourceText}`, id: Date.now() });
    requestAnimationFrame(() => textareaRef.current?.focus({ preventScroll: true }));
    return true;
  }, []);

  const openTemplatePopover = (template: TemplateKind = 'semantic') => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setTemplateContext({
        sourceText: template === 'illustration' ? '' : markdown,
        hasSelection: false,
        selectionStart: 0,
        selectionEnd: 0
      });
    } else {
      const { selectionStart, selectionEnd, value } = textarea;
      const hasSelection = selectionStart !== selectionEnd;
      // 智能处理支持“选中优先”；插图模式无选区时默认留空，按光标插入。
      const sourceText = template === 'illustration'
        ? (hasSelection ? value.substring(selectionStart, selectionEnd) : '')
        : (hasSelection ? value.substring(selectionStart, selectionEnd) : value);
      setTemplateContext({
        sourceText,
        hasSelection,
        selectionStart,
        selectionEnd
      });
    }
    setSmartPanelTemplate(template);
    const panelRect = editorPanelRef.current?.getBoundingClientRect();
    if (panelRect) {
      // 每次打开都重置到编辑区附近，避免用户上次拖拽后丢失位置。
      setSmartPanelPosition({
        x: Math.round(panelRect.left + 120),
        y: Math.round(panelRect.top + 4),
      });
    }
    setIsTemplatePopoverOpen(true);
  };

  const sanitizeImageAlt = (raw: string) => {
    return raw
      .replace(/\r?\n/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/[\[\]]/g, '')
      .trim();
  };

  const persistGeneratedImage = (dataUrl: string) => {
    if (!dataUrl.startsWith('data:image/')) {
      setRepairNotice({ message: '生成结果不是有效图片', id: Date.now() });
      return null;
    }
    const imgId = `img_${Math.random().toString(36).slice(2, 11)}`;
    const newPool = { ...imagePoolRef.current, [imgId]: dataUrl };
    try {
      const serialized = JSON.stringify(newPool);
      if (serialized.length > 4.8 * 1024 * 1024) {
        setRepairNotice({ message: '本地存储空间不足，无法保存插图', id: Date.now() });
        return null;
      }
    } catch {
      setRepairNotice({ message: '本地存储空间不足，无法保存插图', id: Date.now() });
      return null;
    }

    setImagePool(newPool);
    return imgId;
  };

  const handleApplyTemplateResult = (result: string, mode: TemplateApplyMode, options?: TemplateApplyOptions) => {
    const isIllustration = options?.sourceTemplate === 'illustration';
    let normalizedMode = mode;
    let normalizedResult = result;

    if (isIllustration) {
      const generatedDataUrl = options?.illustrationDataUrl || '';
      const storedImageId = persistGeneratedImage(generatedDataUrl);
      if (!storedImageId) return;
      const altText = sanitizeImageAlt(options?.illustrationAlt || 'AI插图');
      normalizedResult = `![${altText}](local://${storedImageId})`;
      normalizedMode = 'insert';
      setRepairNotice({ message: '已插入 AI 插图', id: Date.now() });
    }

    if (!normalizedResult.trim()) return;
    const textarea = textareaRef.current;
    if (!textarea) return;

    const currentValue = textarea.value;
    const { hasSelection, selectionStart, selectionEnd } = templateContext;
    let newText = currentValue;
    let newSelectionStart = selectionStart;
    let newSelectionEnd = selectionStart;

    if (normalizedMode === 'replace') {
      // 替换：有选区则替换选区；无选区则整文替换。
      if (hasSelection) {
        newText = currentValue.slice(0, selectionStart) + normalizedResult + currentValue.slice(selectionEnd);
        newSelectionStart = selectionStart;
        newSelectionEnd = selectionStart + normalizedResult.length;
      } else {
        newText = normalizedResult;
        newSelectionStart = 0;
        newSelectionEnd = normalizedResult.length;
      }
    }

    if (normalizedMode === 'insert') {
      // 插入：插到选区末尾（或光标位置），保留上下文。
      const insertPos = hasSelection ? selectionEnd : selectionStart;
      newText = currentValue.slice(0, insertPos) + normalizedResult + currentValue.slice(insertPos);
      newSelectionStart = insertPos;
      newSelectionEnd = insertPos + normalizedResult.length;
    }

    if (normalizedMode === 'append') {
      // 追加：自动补齐空行，避免语义块粘连。
      const needsGap = currentValue.trim().length > 0;
      const spacer = needsGap ? (currentValue.endsWith('\n') ? '\n' : '\n\n') : '';
      newText = currentValue + spacer + normalizedResult;
      newSelectionStart = newText.length - normalizedResult.length;
      newSelectionEnd = newText.length;
    }

    updateMarkdownImmediate(newText);
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.focus({ preventScroll: true });
        textareaRef.current.setSelectionRange(newSelectionStart, newSelectionEnd);
      }
    });

    const poemSourceMatched = options?.sourceTemplate === 'poem' || smartPanelTemplate === 'poem';
    const shouldApplyPoemPreset = poemSourceMatched && normalizedMode !== 'append';
    if (shouldApplyPoemPreset) {
      // 竖排诗在 insert/replace 后自动切到海报模式并套用预设视觉参数。
      const poemTemplate =
        ThemeRegistry.getTemplates().find(t => t.id === 'tpl_minimal_std') ||
        ThemeRegistry.getTemplates().find(t => t.borderThemeId === 'Minimal' && t.layoutThemeId === 'Classic');

      if (poemTemplate) {
        handleApplyTemplate(poemTemplate);
      } else {
        setTheme('Minimal');
        setLayoutTheme('Classic');
      }

      setViewMode(ViewMode.Poster);
      setFontSize('Large');
      setPadding('Wide');
      setSpacing('loose');
      setShowWatermark(true);
      setWatermarkAlign(WatermarkAlign.Center);
      if (options?.poemAttribution?.trim()) {
        setWatermarkText(options.poemAttribution.trim());
      } else {
        // 署名缺失时不显示占位文案，避免出现误导性的“待补充”信息。
        setWatermarkText('');
      }
      setPosterWidthPreset(POEM_POSTER_WIDTH);
      setPosterWidthPresetToken(prev => prev + 1);
    }

    setIsTemplatePopoverOpen(false);
  };

  const startSmartPanelDrag = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    // 记录鼠标相对面板的偏移，保证拖拽过程不会“跳点”。
    smartPanelDragOffsetRef.current = {
      x: event.clientX - smartPanelPosition.x,
      y: event.clientY - smartPanelPosition.y,
    };
    setIsDraggingSmartPanel(true);
  };

  useEffect(() => {
    if (!isDraggingSmartPanel) return;
    const handleMouseMove = (event: MouseEvent) => {
      const panelWidth = smartPanelTemplate === 'illustration' ? 820 : 560;
      const panelHeight = smartPanelTemplate === 'illustration'
        ? Math.min(760, Math.round(window.innerHeight * 0.82))
        : 520;
      const minX = 8;
      const minY = 8;
      const maxX = Math.max(minX, window.innerWidth - panelWidth - 8);
      const maxY = Math.max(minY, window.innerHeight - panelHeight - 8);
      const nextX = event.clientX - smartPanelDragOffsetRef.current.x;
      const nextY = event.clientY - smartPanelDragOffsetRef.current.y;
      // 面板移动限制在可视窗口内，避免拖出屏幕后无法找回。
      setSmartPanelPosition({
        x: Math.min(maxX, Math.max(minX, nextX)),
        y: Math.min(maxY, Math.max(minY, nextY)),
      });
    };
    const handleMouseUp = () => {
      setIsDraggingSmartPanel(false);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingSmartPanel, smartPanelTemplate]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hashRaw = window.location.hash.startsWith('#')
      ? window.location.hash.slice(1)
      : window.location.hash;
    if (!hashRaw) return;

    const hashParams = new URLSearchParams(hashRaw);
    let encoded = hashParams.get('mpmd') || '';
    if (!encoded && hashRaw && !hashRaw.includes('=')) {
      encoded = hashRaw;
    }
    if (!encoded) return;

    try {
      // 地址栏通道：适合短文本，直接从 hash 解码导入。
      const decodedMarkdown = decodeBase64UrlUtf8(encoded);
      const source = new URL(window.location.href).searchParams.get('mp_source') || undefined;
      const imported = applyExternalImport(decodedMarkdown, source);
      if (imported) {
        cleanupImportAddress();
      }
    } catch (error) {
      console.error('Failed to decode URL import payload', error);
      setRepairNotice({ message: '导入内容解码失败', id: Date.now() });
    }
  }, [applyExternalImport, cleanupImportAddress]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isImportRoute()) return;

    const url = new URL(window.location.href);
    const channel = url.searchParams.get('mp_channel');
    if (channel !== 'pm') return;

    const nonce = url.searchParams.get('mp_nonce') || '';
    const expectedSource = url.searchParams.get('mp_source') || '';

    const sendReady = () => {
      if (!window.opener) return;
      // 消息通道（postMessage）：先发送就绪信号，再等外部页面回传内容。
      window.opener.postMessage(
        {
          type: 'markdownposter.import.ready',
          nonce,
          version: 1,
        },
        '*'
      );
    };

    const respond = (status: 'ok' | 'error', code?: string, message?: string, targetOrigin = '*') => {
      if (!window.opener) return;
      window.opener.postMessage(
        {
          type: 'markdownposter.import.ack',
          nonce,
          status,
          code,
          message,
        },
        targetOrigin
      );
    };

    const timeoutId = window.setTimeout(() => {
      setRepairNotice({ message: '等待外部内容超时，请重试', id: Date.now() });
    }, IMPORT_PM_TIMEOUT_MS);
    const readyInterval = window.setInterval(sendReady, 800);

    const handleMessage = (event: MessageEvent) => {
      if (!window.opener || event.source !== window.opener) return;

      const data = event.data as {
        type?: string;
        nonce?: string;
        markdown?: string;
        source?: string;
      } | null;
      if (!data || data.type !== 'markdownposter.import.payload') return;
      // 随机令牌 + 来源域双校验，防止跨页面误投递。
      if (nonce && data.nonce !== nonce) return;
      if (expectedSource && event.origin !== expectedSource) return;

      const markdownPayload = typeof data.markdown === 'string' ? data.markdown : '';
      if (!markdownPayload) {
        respond('error', 'empty_markdown', 'markdown is empty', event.origin || '*');
        return;
      }
      if (markdownPayload.length > MAX_IMPORT_CHARS) {
        respond('error', 'too_large', 'markdown too large', event.origin || '*');
        setRepairNotice({ message: '导入内容过长，已拒绝', id: Date.now() });
        return;
      }

      window.clearTimeout(timeoutId);
      window.clearInterval(readyInterval);

      const source = typeof data.source === 'string' ? data.source : event.origin;
      const imported = applyExternalImport(markdownPayload, source);
      if (imported) {
        cleanupImportAddress();
        respond('ok', undefined, undefined, event.origin || '*');
        return;
      }
      respond('error', 'import_failed', 'import failed', event.origin || '*');
    };

    window.addEventListener('message', handleMessage);
    sendReady();

    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(readyInterval);
      window.removeEventListener('message', handleMessage);
    };
  }, [applyExternalImport, cleanupImportAddress]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault(); 
      if (e.shiftKey) handleRedo(); else handleUndo();
    }
  };
  
  // --- 编辑器操作辅助 ---
  const insertTextAtCursor = (textToInsert: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = textarea.value;
    const newText = currentText.substring(0, start) + textToInsert + currentText.substring(end);
    const newCursorPos = start + textToInsert.length;
    updateMarkdownImmediate(newText);
    requestAnimationFrame(() => {
        if (textareaRef.current) {
            textareaRef.current.focus({ preventScroll: true });
            textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
    });
  };

  const handleSelectAll = () => { textareaRef.current?.focus({ preventScroll: true }); textareaRef.current?.select(); };
  
  const handleCopySelection = async () => {
    const textarea = textareaRef.current;
    if (!textarea || textarea.selectionStart === textarea.selectionEnd) return;
    try { await navigator.clipboard.writeText(textarea.value.substring(textarea.selectionStart, textarea.selectionEnd)); } catch (err) { console.error(err); }
  };

  const insertMarkdownSyntax = (prefix: string, suffix: string = '', placeholder: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = textarea.value;
    const selectedText = currentText.substring(start, end);
    let newText = '';
    let newCursorPosStart = 0;
    let newCursorPosEnd = 0;
    const textToInsert = selectedText.length > 0 ? selectedText : placeholder;
    newText = currentText.substring(0, start) + prefix + textToInsert + suffix + currentText.substring(end);
    
    if (selectedText.length > 0) {
        newCursorPosStart = end + prefix.length + suffix.length;
        newCursorPosEnd = newCursorPosStart;
    } else {
        newCursorPosStart = start + prefix.length;
        newCursorPosEnd = newCursorPosStart + (placeholder.length > 0 ? placeholder.length : 0);
    }
    updateMarkdownImmediate(newText);
    requestAnimationFrame(() => textareaRef.current?.setSelectionRange(newCursorPosStart, newCursorPosEnd));
  };

  // 获取选区覆盖的完整行范围
  const getLineSelectionRange = (text: string, start: number, end: number) => {
      // 找首行起点
      let lineStart = text.lastIndexOf('\n', start - 1) + 1;
      if (lineStart < 0) lineStart = 0;

      // 找末行终点
      let lineEnd = text.indexOf('\n', end);
      if (lineEnd === -1) lineEnd = text.length;
      
      return { start: lineStart, end: lineEnd };
  };

  // 行前缀处理器（标题/列表/引用共用）
  const handleLinePrefix = (prefix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const { selectionStart, selectionEnd, value } = textarea;
    
    // 1) 先扩大到整行范围
    const { start: lineStart, end: lineEnd } = getLineSelectionRange(value, selectionStart, selectionEnd);
    
    const selectedContent = value.substring(lineStart, lineEnd);
    // 按行处理，支持多行批量操作
    const lines = selectedContent.split('\n');

    // 2) 判定是“加前缀”还是“去前缀”
    const allHavePrefix = lines.every(line => line.startsWith(prefix));
    
    const newLines = lines.map(line => {
        if (allHavePrefix) {
            // 去前缀
            return line.startsWith(prefix) ? line.substring(prefix.length) : line;
        } else {
            // 加前缀
            return prefix + line;
        }
    });

    const newContent = newLines.join('\n');

    // 3) 更新文本
    const newValue = value.substring(0, lineStart) + newContent + value.substring(lineEnd);
    
    updateMarkdownImmediate(newValue);

    // 4) 恢复选区，覆盖变更后的整块
    const newSelectionEnd = lineStart + newContent.length;
    requestAnimationFrame(() => {
        if (textareaRef.current) {
            textareaRef.current.focus({ preventScroll: true });
            textareaRef.current.setSelectionRange(lineStart, newSelectionEnd);
        }
    });
  };

  // 标题下拉选择处理
  const handleHeadingChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const level = e.target.value;
      if (!level) return;
      handleLinePrefix('#'.repeat(parseInt(level)) + ' ');
      // 立即清空下拉值，避免停留在上次选项
      e.target.value = "";
  };

  // 表格下拉选择处理
  const handleTableChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const val = e.target.value;
      if (!val) return;
      
      const [r, c] = val.split('x').map(n => parseInt(n));
      handleInsertTable(r, c);

      // 清空下拉值
      e.target.value = "";
  };

  const handleInsertTable = (rows: number, cols: number) => {
    if (rows <= 0 || cols <= 0) return;
    
    let header = "|";
    let divider = "|";
    for(let c=0; c<cols; c++) { header += " Header |"; divider += " --- |"; }
    
    let body = "";
    for(let r=0; r<rows; r++) {
        body += "\n|";
        for(let c=0; c<cols; c++) { body += " Cell |"; }
    }
    
    insertTextAtCursor(`\n${header}\n${divider}${body}\n`);
  };
  
  const handleCenter = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd, value } = textarea;

    // 1. Identify full lines range
    const { start: lineStart, end: lineEnd } = getLineSelectionRange(value, selectionStart, selectionEnd);
    
    const selectedContent = value.substring(lineStart, lineEnd);
    
    const startTag = ":::center\n";
    const endTag = "\n:::";

    const isWrapped = selectedContent.trim().startsWith(":::center") && selectedContent.trim().endsWith(":::");
    
    let newContent = "";
    
    if (isWrapped) {
        // 去掉 :::center 包裹
        const lines = selectedContent.split('\n');
        const contentLines = lines.filter(l => l.trim() !== ":::center" && l.trim() !== ":::");
        newContent = contentLines.join('\n');
    } else {
        // 添加 :::center 包裹
        newContent = `${startTag}${selectedContent}${endTag}`;
    }

    const newValue = value.substring(0, lineStart) + newContent + value.substring(lineEnd);

    updateMarkdownImmediate(newValue);
    requestAnimationFrame(() => {
        if (textareaRef.current) {
            textareaRef.current.focus({ preventScroll: true });
            textareaRef.current.setSelectionRange(lineStart, lineStart + newContent.length);
        }
    });
  };

  const handleRepair = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd, value } = textarea;
    const hasSelection = selectionStart !== selectionEnd;
    const { start, end } = hasSelection
      ? getLineSelectionRange(value, selectionStart, selectionEnd)
      : { start: 0, end: value.length };

    const targetText = value.substring(start, end);
    const { output, changes } = repairMarkdownBlock(targetText);

    if (output === targetText) {
      setRepairNotice({ message: '未发现需要修复的内容', id: Date.now() });
      return;
    }

    const newValue = value.substring(0, start) + output + value.substring(end);
    const delta = output.length - targetText.length;
    const adjustPosition = (pos: number) => {
      if (pos <= start) return pos;
      if (pos >= end) return pos + delta;
      const relative = pos - start;
      return start + Math.min(relative, output.length);
    };

    const nextSelectionStart = adjustPosition(selectionStart);
    const nextSelectionEnd = adjustPosition(selectionEnd);

    updateMarkdownImmediate(newValue);
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.focus({ preventScroll: true });
        textareaRef.current.setSelectionRange(nextSelectionStart, nextSelectionEnd);
      }
    });
    const changeCount = changes > 0 ? changes : 1;
    setRepairNotice({ message: `已修复 ${changeCount} 处`, id: Date.now() });
  };

  // --- 图片导入处理 ---
  const processImageFile = async (file: File) => {
    try {
        const compressedDataUrl = await compressImage(file);
        if (compressedDataUrl.length > 800 * 1024) { 
             alert("即便经过压缩，图片依然过大，建议上传更小的图片（推荐 < 2MB）。");
             return;
        }
        const imgId = 'img_' + Math.random().toString(36).substr(2, 9);
        setImagePool(prev => {
            const newPool = { ...prev, [imgId]: compressedDataUrl };
            try {
                const testStr = JSON.stringify(newPool);
                if (testStr.length > 4.8 * 1024 * 1024) { alert("本地存储空间即将耗尽，请先删除部分旧图片。"); return prev; }
                return newPool;
            } catch (e) { alert("本地存储空间不足，无法添加。"); return prev; }
        });
        insertTextAtCursor(`![](local://${imgId})`);
    } catch (e) { console.error(e); alert("处理图片失败，请重试。"); }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { processImageFile(file); e.target.value = ''; }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
        if (items[i].kind === 'file' && items[i].type.startsWith('image/')) {
            e.preventDefault();
            const file = items[i].getAsFile();
            if (file) processImageFile(file);
            return; 
        }
    }
  };

  const startResizing = useCallback((mouseDownEvent: React.MouseEvent) => {
    mouseDownEvent.preventDefault();
    const onMouseMove = (e: MouseEvent) => {
        const newWidth = (e.clientX / window.innerWidth) * 100;
        if (newWidth >= 20 && newWidth <= 80) setLeftWidth(newWidth);
    };
    const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none'; 
  }, []);

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => { if (typeof e.target?.result === 'string') updateMarkdownImmediate(e.target.result); };
      reader.readAsText(file);
    }
    event.target.value = '';
  };

  const handleResetClick = useCallback(() => setIsResetModalOpen(true), []);
  const confirmReset = useCallback(() => {
    setMarkdown(DEFAULT_MARKDOWN);
    setHistory([DEFAULT_MARKDOWN]);
    setHistoryIndex(0);
    requestAnimationFrame(() => textareaRef.current?.focus({ preventScroll: true }));
  }, []);

  // --- 格式工具栏横向滚动控制 ---
  const [formatCanScrollLeft, setFormatCanScrollLeft] = useState(false);
  const [formatCanScrollRight, setFormatCanScrollRight] = useState(false);
  const formatToolbarRef = useRef<HTMLDivElement>(null);
  const scrollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkFormatScroll = useCallback(() => {
    if (formatToolbarRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = formatToolbarRef.current;
      setFormatCanScrollLeft(scrollLeft > 2);
      setFormatCanScrollRight(scrollLeft < scrollWidth - clientWidth - 2);
    }
  }, []);

  useEffect(() => {
    checkFormatScroll();
    window.addEventListener('resize', checkFormatScroll);
    return () => window.removeEventListener('resize', checkFormatScroll);
  }, [checkFormatScroll]);

  useEffect(() => {
    const timer = setTimeout(checkFormatScroll, 100);
    return () => clearTimeout(timer);
  }, [leftWidth, checkFormatScroll]);
  
  const startScrolling = useCallback((direction: 'left' | 'right') => {
    if (scrollIntervalRef.current) return;
    const step = direction === 'left' ? -5 : 5;
    scrollIntervalRef.current = setInterval(() => { if (formatToolbarRef.current) formatToolbarRef.current.scrollLeft += step; }, 10);
  }, []);

  const stopScrolling = useCallback(() => {
    if (scrollIntervalRef.current) { clearInterval(scrollIntervalRef.current); scrollIntervalRef.current = null; }
  }, []);
  
  useEffect(() => () => stopScrolling(), [stopScrolling]);

  useEffect(() => {
    if (!repairNotice) return;
    const timer = setTimeout(() => setRepairNotice(null), 2000);
    return () => clearTimeout(timer);
  }, [repairNotice]);

  const handlePosterWidthChange = useCallback((nextWidth: number) => {
    const rounded = Math.max(320, Math.min(2000, Math.round(nextWidth)));
    setPosterWidthPreset(prev => (prev === rounded ? prev : rounded));
  }, []);

  return (
    <div className={`flex flex-col h-screen transition-colors duration-500 ${isDarkMode ? 'bg-[#23272e]' : 'bg-white'}`}>
      
      <div className="relative z-50">
         <Toolbar 
            isDarkMode={isDarkMode} 
            onToggleTheme={toggleTheme}
            onSaveMarkdown={handleDownloadMarkdown}
            onExportZip={handleExportZip}
            isExportingZip={isExportingZip}
            viewMode={viewMode}
         />
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* 左侧：编辑区 */}
        <div 
          ref={editorPanelRef}
          style={{ width: `${leftWidth}%` }}
          className={`flex flex-col z-10 relative transition-colors duration-500
            ${isDarkMode ? 'bg-[#23272e] shadow-none' : 'bg-[#fdfcf5] border-r border-[#e0e0e0] shadow-[4px_0_24px_rgba(0,0,0,0.02)]'}
          `}
        >
          {repairNotice && (
            <div
              key={repairNotice.id}
              className={`absolute right-6 top-14 z-30 px-3 py-1.5 rounded-md text-[11px] font-semibold shadow-md pointer-events-none ${
                isDarkMode ? 'bg-[#2c313a] text-[#e5c07b]' : 'bg-white text-[#8b7e74] border border-[#e8e6df]'
              }`}
            >
              {repairNotice.message}
            </div>
          )}
          {/* 编辑区头部（两行） */}
          <div className="flex flex-col relative z-20 transition-colors duration-500 group/toolbar">
             
             {/* 第一行：帮助与动作（保持头部背景） */}
             <div className={`h-12 flex items-center justify-between px-4 border-b ${isDarkMode ? 'bg-[#1e2227] border-[#181a1f]' : 'bg-[#f4f2eb] border-[#e8e6df]/50'}`}>
                 {/* 左侧：帮助入口 */}
                 <div className="flex items-center">
                    <a href="https://markdown.com.cn/basic-syntax/headings.html" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[#a8a49c] hover:text-[#8b7e74] transition-colors" title="Markdown 语法帮助">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span className="text-[10px] font-bold uppercase tracking-wide">格式说明</span>
                    </a>
                 </div>

                 {/* 右侧：动作按钮 */}
                 <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                        <button type="button" onClick={handleUndo} disabled={historyIndex <= 0} className={`p-1.5 rounded transition-colors flex-shrink-0 flex items-center gap-1 ${historyIndex > 0 ? (isDarkMode ? 'text-gray-500 hover:text-[#d4cfbf] hover:bg-[#3e4451]' : 'text-gray-500 hover:text-[#8b7e74] hover:bg-[#e0ded7]') : 'text-gray-300/20 cursor-not-allowed'}`} title="撤销 (Ctrl+Z)"><svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"/></svg></button>
                        <button type="button" onClick={handleRedo} disabled={historyIndex >= history.length - 1} className={`p-1.5 rounded transition-colors flex-shrink-0 flex items-center gap-1 ${historyIndex < history.length - 1 ? (isDarkMode ? 'text-gray-500 hover:text-[#d4cfbf] hover:bg-[#3e4451]' : 'text-gray-500 hover:text-[#8b7e74] hover:bg-[#e0ded7]') : 'text-gray-300/20 cursor-not-allowed'}`} title="重做 (Ctrl+Shift+Z)"><svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 14l5-5-5-5"/><path d="M20 9H9.5A5.5 5.5 0 0 0 4 14.5v0A5.5 5.5 0 0 0 9.5 20H13"/></svg></button>
                    </div>
                    <div className={`w-px h-3 mx-1 transition-colors ${isDarkMode ? 'bg-[#3e4451]' : 'bg-gray-300'}`}></div>
                    <div className="flex items-center gap-2">
                        <button onClick={handleSelectAll} className={`p-1.5 rounded transition-colors flex-shrink-0 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide ${isDarkMode ? 'text-gray-500 hover:text-[#d4cfbf] hover:bg-[#3e4451]' : 'text-gray-500 hover:text-[#8b7e74] hover:bg-[#e0ded7]'}`} title="全选"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg><span className="hidden xl:inline">全选</span></button>
                        <button onClick={handleCopySelection} className={`p-1.5 rounded transition-colors flex-shrink-0 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide ${isDarkMode ? 'text-gray-500 hover:text-[#d4cfbf] hover:bg-[#3e4451]' : 'text-gray-500 hover:text-[#8b7e74] hover:bg-[#e0ded7]'}`} title="复制选中内容"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg><span className="hidden xl:inline">复制</span></button>
                    </div>
                    <button type="button" onClick={() => updateMarkdownImmediate('')} className={`p-1.5 rounded transition-colors flex-shrink-0 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide ${isDarkMode ? 'text-gray-500 hover:text-[#d4cfbf] hover:bg-[#3e4451]' : 'text-gray-500 hover:text-[#8b7e74] hover:bg-[#e0ded7]'}`} title="清空"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg><span className="hidden xl:inline">清空</span></button>
                    <div className={`w-px h-3 mx-1 transition-colors ${isDarkMode ? 'bg-[#3e4451]' : 'bg-gray-300'}`}></div>
                    <div className="flex items-center gap-3">
                        <label className={`p-1.5 rounded transition-colors flex-shrink-0 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide cursor-pointer ${isDarkMode ? 'text-gray-500 hover:text-[#d4cfbf] hover:bg-[#3e4451]' : 'text-gray-500 hover:text-[#8b7e74] hover:bg-[#e0ded7]'}`}>
                            <input type="file" accept=".md,.txt" onChange={handleFileImport} className="hidden" />
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg><span className="hidden xl:inline">导入</span>
                        </label>
                        <button type="button" onClick={handleResetClick} className={`p-1.5 rounded transition-colors flex-shrink-0 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide ${isDarkMode ? 'text-gray-500 hover:text-[#d4cfbf] hover:bg-[#3e4451]' : 'text-gray-500 hover:text-[#8b7e74] hover:bg-[#e0ded7]'}`} title="重置为初始内容"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg><span className="hidden xl:inline">重置</span></button>
                    </div>
                 </div>
             </div>

             {/* 第二行：语法工具与统计（融入编辑区背景） */}
             <div className={`h-10 flex items-center justify-between pl-1 pr-4 border-b ${isDarkMode ? 'bg-[#23272e] border-[#181a1f]' : 'bg-[#fdfcf5] border-[#e0e0e0]'}`}>
                 
                 {/* 语法工具栏 */}
                 <div className="relative flex-1 min-w-0 h-full mx-1 group/format-scroll">
                    <div className={`absolute left-0 top-0 bottom-0 z-10 flex items-center justify-center w-6 transition-opacity duration-300 pointer-events-none ${formatCanScrollLeft ? 'opacity-100' : 'opacity-0'}`}>
                        <div className={`absolute inset-0 bg-gradient-to-r ${isDarkMode ? 'from-[#23272e] via-[#23272e] to-transparent' : 'from-[#fdfcf5] via-[#fdfcf5] to-transparent'}`} />
                        <button onMouseEnter={() => startScrolling('left')} onMouseLeave={stopScrolling} onMouseDown={(e) => e.preventDefault()} className={`relative z-20 w-4 h-full flex items-center justify-center pointer-events-auto hover:scale-110 transition-transform ${isDarkMode ? 'text-[#abb2bf]' : 'text-gray-500'} ${!formatCanScrollLeft ? 'pointer-events-none' : ''}`}>
                           <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                    </div>

                    <div ref={formatToolbarRef} onScroll={checkFormatScroll} className="flex items-center overflow-x-auto no-scrollbar h-full px-1 gap-1 scroll-smooth" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                        <style>{`.no-scrollbar::-webkit-scrollbar { display: none; }`}</style>
                        
                        {/* 标题选择器（原生 select 覆盖层） */}
                        <div className={`relative p-1.5 rounded transition-colors flex-shrink-0 ${isDarkMode ? 'hover:text-[#d4cfbf] hover:bg-[#3e4451] text-gray-500' : 'text-gray-500 hover:text-[#8b7e74] hover:bg-[#e0ded7]'}`} title="标题">
                             <svg className="w-4 h-4 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 12h12M6 20V4M18 20V4"/></svg>
                             <select 
                                onChange={handleHeadingChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                defaultValue=""
                             >
                                <option value="" disabled>选择标题级别</option>
                                <option value="1">H1 - 一级标题</option>
                                <option value="2">H2 - 二级标题</option>
                                <option value="3">H3 - 三级标题</option>
                                <option value="4">H4 - 四级标题</option>
                             </select>
                        </div>

                        <button onClick={() => insertMarkdownSyntax('**', '**')} className={`p-1.5 rounded transition-colors flex-shrink-0 ${isDarkMode ? 'hover:text-[#d4cfbf] hover:bg-[#3e4451] text-gray-500' : 'text-gray-500 hover:text-[#8b7e74] hover:bg-[#e0ded7]'}`} title="粗体"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path></svg></button>
                        <button onClick={() => insertMarkdownSyntax('*', '*')} className={`p-1.5 rounded transition-colors flex-shrink-0 ${isDarkMode ? 'hover:text-[#d4cfbf] hover:bg-[#3e4451] text-gray-500' : 'text-gray-500 hover:text-[#8b7e74] hover:bg-[#e0ded7]'}`} title="斜体"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="4" x2="10" y2="4"></line><line x1="14" y1="20" x2="5" y2="20"></line><line x1="15" y1="4" x2="9" y2="20"></line></svg></button>
                        <button onClick={() => insertMarkdownSyntax('`', '`')} className={`p-1.5 rounded transition-colors flex-shrink-0 ${isDarkMode ? 'hover:text-[#d4cfbf] hover:bg-[#3e4451] text-gray-500' : 'text-gray-500 hover:text-[#8b7e74] hover:bg-[#e0ded7]'}`} title="行内代码"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg></button>
                        
                        <div className={`w-px h-3 mx-1 flex-shrink-0 transition-colors ${isDarkMode ? 'bg-[#3e4451]' : 'bg-gray-300'}`}></div>

                        <button onClick={() => handleLinePrefix('- ')} className={`p-1.5 rounded transition-colors flex-shrink-0 ${isDarkMode ? 'hover:text-[#d4cfbf] hover:bg-[#3e4451] text-gray-500' : 'text-gray-500 hover:text-[#8b7e74] hover:bg-[#e0ded7]'}`} title="列表"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg></button>
                        <button onClick={() => handleLinePrefix('1. ')} className={`p-1.5 rounded transition-colors flex-shrink-0 ${isDarkMode ? 'hover:text-[#d4cfbf] hover:bg-[#3e4451] text-gray-500' : 'text-gray-500 hover:text-[#8b7e74] hover:bg-[#e0ded7]'}`} title="数字列表"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="10" y1="6" x2="21" y2="6"></line><line x1="10" y1="12" x2="21" y2="12"></line><line x1="10" y1="18" x2="21" y2="18"></line><path d="M4 6h1v4"></path><path d="M4 10h2"></path><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"></path></svg></button>
                        
                        <div className={`w-px h-3 mx-1 flex-shrink-0 transition-colors ${isDarkMode ? 'bg-[#3e4451]' : 'bg-gray-300'}`}></div>
                        
                        <button onClick={() => handleLinePrefix('> ')} className={`p-1.5 rounded transition-colors flex-shrink-0 ${isDarkMode ? 'hover:text-[#d4cfbf] hover:bg-[#3e4451] text-gray-500' : 'text-gray-500 hover:text-[#8b7e74] hover:bg-[#e0ded7]'}`} title="引用"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 9L9 9.01"/><path d="M15 9L14 9.01"/><path d="M3 21V11C3 6.58 6.58 3 11 3h2c4.42 0 8 3.58 8 8v10H3z"/></svg></button>
                        <button onClick={handleCenter} className={`p-1.5 rounded transition-colors flex-shrink-0 ${isDarkMode ? 'hover:text-[#d4cfbf] hover:bg-[#3e4451] text-gray-500' : 'text-gray-500 hover:text-[#8b7e74] hover:bg-[#e0ded7]'}`} title="居中"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16M7 12h10M4 18h16"></path></svg></button>
                        
                        <div className={`w-px h-3 mx-1 flex-shrink-0 transition-colors ${isDarkMode ? 'bg-[#3e4451]' : 'bg-gray-300'}`}></div>
                        
                        <button onClick={() => insertMarkdownSyntax('[', '](https://example.com)', '链接文字')} className={`p-1.5 rounded transition-colors flex-shrink-0 ${isDarkMode ? 'hover:text-[#d4cfbf] hover:bg-[#3e4451] text-gray-500' : 'text-gray-500 hover:text-[#8b7e74] hover:bg-[#e0ded7]'}`} title="链接"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg></button>
                        <label className={`p-1.5 rounded transition-colors flex-shrink-0 cursor-pointer ${isDarkMode ? 'hover:text-[#d4cfbf] hover:bg-[#3e4451] text-gray-500' : 'text-gray-500 hover:text-[#8b7e74] hover:bg-[#e0ded7]'}`} title="图片">
                            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                        </label>

                        {/* 表格选择器（原生 select 覆盖层） */}
                        <div className={`relative p-1.5 rounded transition-colors flex-shrink-0 ${isDarkMode ? 'hover:text-[#d4cfbf] hover:bg-[#3e4451] text-gray-500' : 'text-gray-500 hover:text-[#8b7e74] hover:bg-[#e0ded7]'}`} title="表格">
                                <svg className="w-4 h-4 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18"/></svg>
                                <select 
                                    onChange={handleTableChange}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    defaultValue=""
                                >
                                    <option value="" disabled>选择表格大小</option>
                                    <option value="2x2">2 行 x 2 列</option>
                                    <option value="3x3">3 行 x 3 列</option>
                                    <option value="4x4">4 行 x 4 列</option>
                                    <option value="5x5">5 行 x 5 列</option>
                                </select>
                        </div>

                        <div className={`w-px h-3 mx-1 flex-shrink-0 transition-colors ${isDarkMode ? 'bg-[#3e4451]' : 'bg-gray-300'}`}></div>

                        <button
                          onClick={handleRepair}
                          className={`p-1.5 rounded transition-colors flex-shrink-0 ${
                            isDarkMode
                              ? 'text-[#e5c07b] hover:bg-[#3e4451]'
                              : 'text-[#c28c2c] hover:bg-[#f4ecd9]'
                          }`}
                          title="修理 Markdown 格式"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14.7 6.3a4 4 0 0 0-5.66 5.66l-6.1 6.1a2 2 0 1 0 2.83 2.83l6.1-6.1a4 4 0 0 0 5.66-5.66l-2.12 2.12a1.5 1.5 0 0 1-2.12-2.12z" />
                          </svg>
                        </button>
                    </div>

                    <div className={`absolute right-0 top-0 bottom-0 z-10 flex items-center justify-center w-6 transition-opacity duration-300 pointer-events-none ${formatCanScrollRight ? 'opacity-100' : 'opacity-0'}`}>
                        <div className={`absolute inset-0 bg-gradient-to-l ${isDarkMode ? 'from-[#23272e] via-[#23272e] to-transparent' : 'from-[#fdfcf5] via-[#fdfcf5] to-transparent'}`} />
                        <button onMouseEnter={() => startScrolling('right')} onMouseLeave={stopScrolling} onMouseDown={(e) => e.preventDefault()} className={`relative z-20 w-4 h-full flex items-center justify-center pointer-events-auto hover:scale-110 transition-transform ${isDarkMode ? 'text-[#abb2bf]' : 'text-gray-500'} ${!formatCanScrollRight ? 'pointer-events-none' : ''}`}>
                           <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                        </button>
                    </div>
                 </div>

                 {/* 字数与日期统计 */}
                 <div className="flex-shrink-0 ml-2 select-none">
                    <span className={`text-[10px] font-medium font-sans tracking-widest transition-colors ${isDarkMode ? 'text-[#5c6370]' : 'text-[#8c8880]/60'}`}>
                      {wordCount} 字 <span className="mx-1 opacity-50">|</span> {dateStr}
                    </span>
                 </div>
             </div>

          </div>

          <div className="relative flex-1 flex min-h-0">
            <div
              className={`relative w-14 flex-shrink-0 ${
                isDarkMode ? 'bg-[#1e2227]' : 'bg-[#fdfcf5]'
              }`}
            >
              <div
                className={`absolute left-2 top-24 z-30 flex flex-col items-center gap-2 rounded-full px-1.5 py-2 shadow-lg ${
                  isDarkMode
                    ? 'bg-[#2c313a] text-[#d4cfbf]'
                    : 'bg-[#f1efea] text-[#6f6558]'
                }`}
              >
              {[
                { key: 'semantic', label: '语义排版', icon: (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h10M4 18h13" />
                  </svg>
                )},
                { key: 'event', label: '活动海报', icon: (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect x="3" y="5" width="18" height="16" rx="2" ry="2" strokeWidth={2} />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 3v4M8 3v4M3 11h18" />
                  </svg>
                )},
                { key: 'poem', label: '竖排诗', icon: (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M12 6v12M17 8v8" />
                  </svg>
                )},
                { key: 'illustration', label: '插图生成', icon: (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect x="3" y="5" width="18" height="14" rx="2" ry="2" strokeWidth={2} />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14l3-3 3 3 2-2 3 3M8 9h.01" />
                  </svg>
                )},
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => openTemplatePopover(item.key as TemplateKind)}
                  className={`group relative w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                    smartPanelTemplate === item.key && isTemplatePopoverOpen
                      ? (isDarkMode ? 'bg-[#3e4451] text-[#e5c07b]' : 'bg-white text-[#c28c2c]')
                      : (isDarkMode ? 'hover:bg-[#3e4451]' : 'hover:bg-white')
                  }`}
                >
                  {item.icon}
                  <span
                    className={`absolute left-12 top-1/2 -translate-y-1/2 px-2 py-1 rounded text-[10px] whitespace-nowrap opacity-0 pointer-events-none transition-opacity group-hover:opacity-100 ${
                      isDarkMode
                        ? 'bg-[#1e2227] text-[#d4cfbf]'
                        : 'bg-white text-[#6f6558] shadow-sm border border-[#e8e6df]'
                    }`}
                  >
                    {item.label}
                  </span>
                </button>
              ))}
              </div>
            </div>
            <div className="relative flex-1 min-h-0">
              <textarea
                ref={textareaRef}
                onScroll={handleEditorScroll}
                className={`h-full w-full pl-8 pr-8 pb-8 pt-2 resize-none focus:outline-none font-mono text-[15px] leading-[32px] bg-[length:100%_32px] bg-[position:0_0] bg-local transition-colors duration-500 ${isDarkMode ? 'text-[#d4cfbf] bg-[image:linear-gradient(transparent_31px,#333842_31px)] placeholder-[#5c6370] bg-[#23272e]' : 'text-[#2d2d2d] bg-transparent bg-[image:linear-gradient(transparent_31px,#e8e8e8_31px)] placeholder-gray-400/50'}`}
                value={markdown}
                onChange={handleTextChange}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder="在此输入 Markdown..."
                spellCheck={false}
              />

            </div>
          </div>
        </div>

        {/* 中间拖拽分割条 */}
        <div className="w-6 -ml-3 h-full z-20 cursor-col-resize flex items-center justify-center group flex-shrink-0 select-none relative" onMouseDown={startResizing} title="拖动调整宽度">
           <div className={`absolute inset-y-0 left-1/2 -translate-x-1/2 w-px h-full transition-colors ${isDarkMode ? 'bg-transparent group-hover:bg-[#5c6370]/50' : 'bg-transparent group-hover:bg-[#8b7e74]/50'}`} />
           <div className={`relative z-30 w-2 h-16 border shadow-sm flex flex-col items-center justify-center gap-2 transition-all duration-200 ${isDarkMode ? 'bg-[#1e2227] border-[#181a1f] group-hover:bg-[#2c313a] group-hover:border-[#5c6370]' : 'bg-white border-gray-300 group-hover:border-[#8b7e74] group-hover:bg-[#8b7e74]/10'}`}>
             <div className={`w-0.5 h-0.5 ${isDarkMode ? 'bg-[#5c6370]' : 'bg-gray-400 group-hover:bg-[#8b7e74]'}`} />
             <div className={`w-0.5 h-0.5 ${isDarkMode ? 'bg-[#5c6370]' : 'bg-gray-400 group-hover:bg-[#8b7e74]'}`} />
             <div className={`w-0.5 h-0.5 ${isDarkMode ? 'bg-[#5c6370]' : 'bg-gray-400 group-hover:bg-[#8b7e74]'}`} />
           </div>
        </div>

        {/* 右侧：预览工作区 */}
        <div className={`flex-1 flex flex-col min-w-0 relative transition-colors duration-500 ${isDarkMode ? 'bg-[#1a1d23]' : 'bg-gray-100'}`}>
          
          <PreviewControlBar 
            currentTheme={theme} 
            setTheme={setTheme} 
            layoutTheme={layoutTheme}
            setLayoutTheme={setLayoutTheme}
            padding={padding}
            setPadding={setPadding}
            spacing={spacing}
            setSpacing={setSpacing}
            watermarkAlign={watermarkAlign}
            setWatermarkAlign={setWatermarkAlign}

            onExport={handleDownloadPoster}
            onCopyImage={handleCopyPoster}
            
            onSaveMarkdown={handleDownloadMarkdown}
            onExportZip={handleExportZip}
            isExportingZip={isExportingZip}
            
            isExporting={isExportingPoster || isCopyingWeChat} 
            showWatermark={showWatermark}
            setShowWatermark={setShowWatermark}
            watermarkText={watermarkText}
            setWatermarkText={setWatermarkText}
            fontSize={fontSize}
            setFontSize={setFontSize}
            isDarkMode={isDarkMode}
            
            viewMode={viewMode}
            setViewMode={setViewMode}
            
            weChatConfig={weChatConfig}
            setWeChatConfig={setWeChatConfig}
            onCopyWeChatHtml={handleCopyHtml}

            customThemeColor={customThemeColor}
            setCustomThemeColor={setCustomThemeColor}

            writingTheme={writingTheme}
            setWritingTheme={setWritingTheme}

            onApplyTemplate={handleApplyTemplate}
            onRestorePosterTemplateDefaults={handleRestorePosterTemplateDefaults}
          />
          
          <div className="relative flex-1 min-h-0 overflow-hidden">
             
             {/* --- POSTER MODE RENDER --- */}
             <PosterPreview 
               ref={exportRef}
               visible={viewMode === ViewMode.Poster}
               markdown={markdown}
               theme={theme}
               layoutTheme={layoutTheme}
               fontSize={fontSize}
               padding={padding}
               spacing={spacing}
               showWatermark={showWatermark}
               watermarkText={watermarkText}
               watermarkAlign={watermarkAlign}
               imagePool={imagePool}
               isDarkMode={isDarkMode}
               containerRef={posterScrollRef}
               onScroll={handlePreviewScroll}
               customThemeColor={customThemeColor}
               presetWidth={posterWidthPreset}
               presetWidthToken={posterWidthPresetToken}
               onPosterWidthChange={handlePosterWidthChange}
             />

            {/* --- WRITING MODE RENDER --- */}
            <WritingPreview 
               visible={viewMode === ViewMode.Writing}
               markdown={markdown}
               fontSize={fontSize}
               imagePool={imagePool}
               writingTheme={writingTheme}
               isDarkMode={isDarkMode}
               containerRef={writingScrollRef}
               onScroll={handlePreviewScroll}
            />

            {/* --- WECHAT MODE RENDER --- */}
            <WeChatPreview
               ref={weChatRef}
               visible={viewMode === ViewMode.WeChat}
               markdown={markdown}
               config={weChatConfig}
               imagePool={imagePool}
               isDarkMode={isDarkMode}
               containerRef={wechatScrollRef}
               onScroll={handlePreviewScroll}
            />

             {/* 回到顶部按钮 */}
             <div className={`absolute bottom-8 right-8 transition-all duration-300 z-50 ${showBackToTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                 <button 
                    onClick={scrollToTop}
                    className={`p-3 rounded-full shadow-lg border transition-all duration-300 hover:-translate-y-1 ${
                        isDarkMode 
                        ? 'bg-[#2c313a] border-[#3e4451] text-[#abb2bf] hover:bg-[#323842] hover:text-white shadow-black/40' 
                        : 'bg-white border-gray-100 text-gray-500 hover:bg-gray-50 hover:text-blue-500 shadow-xl'
                    }`}
                    title="回到顶部"
                 >
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                 </button>
             </div>
          </div>
        </div>
      </div>

      {isTemplatePopoverOpen && (
        <div
          className="fixed z-[120]"
          style={{ left: smartPanelPosition.x, top: smartPanelPosition.y }}
        >
          <ContentTemplatePopover
            isDarkMode={isDarkMode}
            sourceText={templateContext.sourceText}
            hasSelection={templateContext.hasSelection}
            initialTemplate={smartPanelTemplate}
            showTabs={false}
            onApply={handleApplyTemplateResult}
            onClose={() => setIsTemplatePopoverOpen(false)}
            onDragStart={startSmartPanelDrag}
          />
        </div>
      )}
      
      {/* 重置确认弹窗 */}
      <ConfirmationModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onConfirm={confirmReset}
        title="确认重置？"
        message="这将清空当前编辑区的所有内容、格式和历史记录，恢复到默认的示例文本。此操作无法撤销。"
        isDarkMode={isDarkMode}
        confirmText="彻底清空"
        cancelText="我再想想"
      />
    </div>
  );
}
