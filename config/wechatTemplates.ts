/**
 * 模块说明：公众号模板配置源，定义模板、排版风格、字体风格与默认参数。
 */

import { CSSProperties } from 'react';
import {
  WeChatConfig,
  WeChatFontStyleKind,
  WeChatTemplateKind,
  WeChatTypographyStyleKind,
} from '../types';

export type WeChatRemarkPluginKey = 'guobiCards' | 'inspirationSections';

export interface WeChatTemplateRenderProfile {
  layoutMode: 'fixed';
  fixedLayoutId: string;
  titleBlockMode: 'header-only' | 'keep-first-h1';
  headingSizeMode: 'scaled' | 'keep-layout-h2-h3';
  remarkPluginKeys: WeChatRemarkPluginKey[];
  commonText: {
    letterSpacing: string;
    color: string;
  };
  image: {
    sectionMargin: string;
    wrapperRadius: string;
    style: CSSProperties;
  };
  paragraph: {
    style: CSSProperties;
    marginBottom?: string;
    minHeight?: string;
  };
  list: {
    blockMarginBottom: string;
    itemMarginBottom: string;
  };
  blockquote: {
    mode: 'theme-only' | 'card-aware-guobi' | 'inspiration-sections';
  };
}

export interface WeChatTemplateDefinition {
  value: WeChatTemplateKind;
  label: string;
  summary: string;
}

export interface WeChatTypographyStyleDefinition {
  value: WeChatTypographyStyleKind;
  label: string;
  summary: string;
}

export interface WeChatFontStyleDefinition {
  value: WeChatFontStyleKind;
  label: string;
  summary: string;
  fontFamily: string;
  headingFontFamily: string;
  extraLetterSpacing: string;
}

const TEMPLATE_DEFINITION_MAP: Record<WeChatTemplateKind, WeChatTemplateDefinition> = {
  basic: {
    value: 'basic',
    label: '基础',
    summary: '通用页面结构，支持多种排版风格。',
  },
  guobi: {
    value: 'guobi',
    label: '果比',
    summary: '固定果比页面结构，保留专属卡片样式。',
  },
};

const TYPOGRAPHY_STYLE_MAP: Record<WeChatTypographyStyleKind, WeChatTypographyStyleDefinition> = {
  standard: {
    value: 'standard',
    label: '标准',
    summary: '基础通用排版，结构稳定简洁。',
  },
  classic: {
    value: 'classic',
    label: '经典',
    summary: '传统结构排版，标题样式更稳重。',
  },
  vibrant: {
    value: 'vibrant',
    label: '活泼',
    summary: '节奏更轻快，标题结构更有动感。',
  },
  inspiration: {
    value: 'inspiration',
    label: '灵感',
    summary: '增强标题封面与章节信息卡。',
  },
};

const FONT_STYLE_MAP: Record<WeChatFontStyleKind, WeChatFontStyleDefinition> = {
  standard: {
    value: 'standard',
    label: '现代',
    summary: '现代无衬线，阅读中性稳健。',
    fontFamily: '"SF Pro SC", "SF Pro Text", "PingFang SC", "Helvetica Neue", Helvetica, Arial, sans-serif',
    headingFontFamily: '"SF Pro Display", "SF Pro SC", "PingFang SC", "Helvetica Neue", Helvetica, Arial, sans-serif',
    extraLetterSpacing: '0',
  },
  classic: {
    value: 'classic',
    label: '衬线',
    summary: '中文衬线，传统刊物质感。',
    fontFamily: '"Songti SC", "STSong", "Noto Serif SC", serif',
    headingFontFamily: '"Songti SC", "STSong", "Noto Serif SC", serif',
    extraLetterSpacing: '0.01em',
  },
  vibrant: {
    value: 'vibrant',
    label: '圆润',
    summary: '圆润无衬线，节奏更轻快。',
    fontFamily: '"PingFang SC", "Hiragino Sans GB", "Noto Sans SC", "Microsoft YaHei", sans-serif',
    headingFontFamily: '"PingFang SC", "Hiragino Sans GB", "Noto Sans SC", "Microsoft YaHei", sans-serif',
    extraLetterSpacing: '0.015em',
  },
};

const BASIC_STANDARD_DEFAULTS: Omit<WeChatConfig, 'template'> = {
  typographyStyle: 'standard',
  fontStyle: 'standard',
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
};

const BASIC_INSPIRATION_DEFAULTS: Omit<WeChatConfig, 'template'> = {
  typographyStyle: 'inspiration',
  fontStyle: 'standard',
  primaryColor: '#D97706',
  codeTheme: 'vsDark',
  macCodeBlock: false,
  lineNumbers: false,
  linkReferences: false,
  indent: false,
  justify: false,
  captionType: 'none',
  fontSize: 'Medium',
  lineHeight: 'comfortable',
};

const BASIC_CLASSIC_DEFAULTS: Omit<WeChatConfig, 'template'> = {
  ...BASIC_STANDARD_DEFAULTS,
  typographyStyle: 'classic',
  fontStyle: 'classic',
};

const BASIC_VIBRANT_DEFAULTS: Omit<WeChatConfig, 'template'> = {
  ...BASIC_STANDARD_DEFAULTS,
  typographyStyle: 'vibrant',
  fontStyle: 'vibrant',
};

const GUOBI_DEFAULTS: Omit<WeChatConfig, 'template'> = {
  typographyStyle: 'standard',
  fontStyle: 'standard',
  primaryColor: '#D97757',
  codeTheme: 'vsDark',
  macCodeBlock: false,
  lineNumbers: false,
  linkReferences: false,
  indent: false,
  justify: false,
  captionType: 'none',
  fontSize: 'Small',
  lineHeight: 'compact',
};

const BASIC_STANDARD_RENDER: WeChatTemplateRenderProfile = {
  layoutMode: 'fixed',
  fixedLayoutId: 'Base',
  titleBlockMode: 'header-only',
  headingSizeMode: 'scaled',
  remarkPluginKeys: [],
  commonText: {
    letterSpacing: '0.05em',
    color: '#333333',
  },
  image: {
    sectionMargin: '1.5em 0',
    wrapperRadius: '6px',
    style: {
      maxWidth: '100%',
      height: 'auto',
      display: 'block',
      margin: '0 auto',
      borderRadius: '6px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    },
  },
  paragraph: {
    style: {},
    marginBottom: '1.5em',
    minHeight: '1em',
  },
  list: {
    blockMarginBottom: '1.5em',
    itemMarginBottom: '0.2em',
  },
  blockquote: {
    mode: 'theme-only',
  },
};

const BASIC_INSPIRATION_RENDER: WeChatTemplateRenderProfile = {
  layoutMode: 'fixed',
  fixedLayoutId: 'Base',
  titleBlockMode: 'header-only',
  headingSizeMode: 'scaled',
  remarkPluginKeys: ['inspirationSections'],
  commonText: {
    letterSpacing: '0.03em',
    color: '#3D3D3D',
  },
  image: {
    sectionMargin: '16px 0',
    wrapperRadius: '16px',
    style: {
      maxWidth: '100%',
      height: 'auto',
      display: 'block',
      margin: '0 auto',
      borderRadius: '16px',
      boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
      border: '1px solid rgba(0, 0, 0, 0.02)',
      boxSizing: 'border-box',
    },
  },
  paragraph: {
    style: {
      lineHeight: '2',
    },
    marginBottom: '14px',
  },
  list: {
    blockMarginBottom: '16px',
    itemMarginBottom: '0.45em',
  },
  blockquote: {
    mode: 'inspiration-sections',
  },
};

const BASIC_CLASSIC_RENDER: WeChatTemplateRenderProfile = {
  ...BASIC_STANDARD_RENDER,
  fixedLayoutId: 'Classic',
  commonText: {
    letterSpacing: '0.045em',
    color: '#333333',
  },
};

const BASIC_VIBRANT_RENDER: WeChatTemplateRenderProfile = {
  ...BASIC_STANDARD_RENDER,
  fixedLayoutId: 'Vibrant',
  commonText: {
    letterSpacing: '0.055em',
    color: '#333333',
  },
};

const GUOBI_RENDER: WeChatTemplateRenderProfile = {
  layoutMode: 'fixed',
  fixedLayoutId: 'Guobi',
  titleBlockMode: 'header-only',
  headingSizeMode: 'keep-layout-h2-h3',
  remarkPluginKeys: ['guobiCards'],
  commonText: {
    letterSpacing: '0.03em',
    color: '#646A73',
  },
  image: {
    sectionMargin: '12px 0',
    wrapperRadius: '12px',
    style: {
      maxWidth: '100%',
      height: 'auto',
      display: 'block',
      margin: '8px auto',
      borderRadius: '12px',
      border: '1px solid rgb(250, 249, 245)',
      boxSizing: 'border-box',
    },
  },
  paragraph: {
    style: {
      color: '#646A73',
      lineHeight: '2',
      letterSpacing: '0.03em',
      margin: '12px 0',
      minHeight: '20px',
    },
  },
  list: {
    blockMarginBottom: '12px',
    itemMarginBottom: '0.5em',
  },
  blockquote: {
    mode: 'card-aware-guobi',
  },
};

const LEGACY_LAYOUT_TO_FONT_STYLE: Record<string, WeChatFontStyleKind> = {
  Base: 'standard',
  Classic: 'classic',
  Vibrant: 'vibrant',
  base: 'standard',
  classicLayout: 'classic',
  vibrantLayout: 'vibrant',
  standard: 'standard',
  classic: 'classic',
  vibrant: 'vibrant',
};

const LEGACY_LAYOUT_TO_TYPOGRAPHY_STYLE: Record<string, WeChatTypographyStyleKind> = {
  Base: 'standard',
  Classic: 'classic',
  Vibrant: 'vibrant',
  base: 'standard',
  standard: 'standard',
  classic: 'classic',
  vibrant: 'vibrant',
};

const BASIC_DEFAULTS_BY_STYLE: Record<WeChatTypographyStyleKind, Omit<WeChatConfig, 'template'>> = {
  standard: BASIC_STANDARD_DEFAULTS,
  classic: BASIC_CLASSIC_DEFAULTS,
  vibrant: BASIC_VIBRANT_DEFAULTS,
  inspiration: BASIC_INSPIRATION_DEFAULTS,
};

const isWeChatTemplateKind = (value: unknown): value is WeChatTemplateKind => (
  typeof value === 'string'
  && Object.prototype.hasOwnProperty.call(TEMPLATE_DEFINITION_MAP, value)
);

const isWeChatTypographyStyleKind = (value: unknown): value is WeChatTypographyStyleKind => (
  typeof value === 'string'
  && Object.prototype.hasOwnProperty.call(TYPOGRAPHY_STYLE_MAP, value)
);

const isWeChatFontStyleKind = (value: unknown): value is WeChatFontStyleKind => (
  typeof value === 'string'
  && Object.prototype.hasOwnProperty.call(FONT_STYLE_MAP, value)
);

const normalizeTemplateValue = (value: unknown): {
  template: WeChatTemplateKind;
  forcedTypographyStyle?: WeChatTypographyStyleKind;
} => {
  if (value === 'guobi') {
    return { template: 'guobi' };
  }
  if (value === 'inspiration') {
    return { template: 'basic', forcedTypographyStyle: 'inspiration' };
  }
  if (isWeChatTemplateKind(value)) {
    return { template: value };
  }
  return { template: 'basic' };
};

const normalizeTypographyStyleValue = (
  template: WeChatTemplateKind,
  value: unknown,
  forced?: WeChatTypographyStyleKind,
  legacyLayout?: unknown
): WeChatTypographyStyleKind => {
  if (template !== 'basic') return 'standard';
  if (forced) return forced;
  if (isWeChatTypographyStyleKind(value)) return value;
  if (typeof legacyLayout === 'string' && LEGACY_LAYOUT_TO_TYPOGRAPHY_STYLE[legacyLayout]) {
    return LEGACY_LAYOUT_TO_TYPOGRAPHY_STYLE[legacyLayout];
  }
  return 'standard';
};

const normalizeFontStyleValue = (
  value: unknown,
  legacyLayout: unknown,
  fallback: WeChatFontStyleKind
): WeChatFontStyleKind => {
  if (isWeChatFontStyleKind(value)) return value;
  if (typeof legacyLayout === 'string' && LEGACY_LAYOUT_TO_FONT_STYLE[legacyLayout]) {
    return LEGACY_LAYOUT_TO_FONT_STYLE[legacyLayout];
  }
  return fallback;
};

export const DEFAULT_WECHAT_TEMPLATE: WeChatTemplateKind = 'basic';
export const DEFAULT_WECHAT_TYPOGRAPHY_STYLE: WeChatTypographyStyleKind = 'standard';
export const DEFAULT_WECHAT_FONT_STYLE: WeChatFontStyleKind = 'standard';

export const WECHAT_TEMPLATE_OPTIONS: WeChatTemplateDefinition[] = Object.values(TEMPLATE_DEFINITION_MAP);
export const WECHAT_TYPOGRAPHY_STYLE_OPTIONS: WeChatTypographyStyleDefinition[] = Object.values(
  TYPOGRAPHY_STYLE_MAP
);
export const WECHAT_FONT_STYLE_OPTIONS: WeChatFontStyleDefinition[] = Object.values(FONT_STYLE_MAP);

export const getWeChatTemplateDefinition = (template: WeChatTemplateKind): WeChatTemplateDefinition => (
  TEMPLATE_DEFINITION_MAP[template]
);

export const getWeChatTypographyStyleDefinition = (
  style: WeChatTypographyStyleKind
): WeChatTypographyStyleDefinition => TYPOGRAPHY_STYLE_MAP[style];

export const getWeChatFontStyleDefinition = (
  style: WeChatFontStyleKind
): WeChatFontStyleDefinition => FONT_STYLE_MAP[style];

export const getWeChatRenderProfile = (
  template: WeChatTemplateKind,
  typographyStyle: WeChatTypographyStyleKind
): WeChatTemplateRenderProfile => {
  if (template === 'guobi') return GUOBI_RENDER;
  if (typographyStyle === 'classic') return BASIC_CLASSIC_RENDER;
  if (typographyStyle === 'vibrant') return BASIC_VIBRANT_RENDER;
  if (typographyStyle === 'inspiration') return BASIC_INSPIRATION_RENDER;
  return BASIC_STANDARD_RENDER;
};

export const getWeChatTemplateDefaultConfig = (
  template: WeChatTemplateKind,
  typographyStyle: WeChatTypographyStyleKind = DEFAULT_WECHAT_TYPOGRAPHY_STYLE
): WeChatConfig => {
  if (template === 'guobi') {
    return {
      template,
      ...GUOBI_DEFAULTS,
      typographyStyle: 'standard',
    };
  }

  const normalizedStyle = isWeChatTypographyStyleKind(typographyStyle)
    ? typographyStyle
    : DEFAULT_WECHAT_TYPOGRAPHY_STYLE;

  return {
    template: 'basic',
    ...BASIC_DEFAULTS_BY_STYLE[normalizedStyle],
    typographyStyle: normalizedStyle,
  };
};

export const getDefaultWeChatConfig = (): WeChatConfig => (
  getWeChatTemplateDefaultConfig(DEFAULT_WECHAT_TEMPLATE, DEFAULT_WECHAT_TYPOGRAPHY_STYLE)
);

type LegacyWeChatConfig = Partial<WeChatConfig> & {
  template?: unknown;
  typographyStyle?: unknown;
  fontStyle?: unknown;
  layout?: unknown;
};

export const normalizeWeChatConfig = (
  input: Partial<WeChatConfig> | Record<string, unknown> | null | undefined
): WeChatConfig => {
  const raw = (input || {}) as LegacyWeChatConfig;
  const { template, forcedTypographyStyle } = normalizeTemplateValue(raw.template);
  const typographyStyle = normalizeTypographyStyleValue(
    template,
    raw.typographyStyle,
    forcedTypographyStyle,
    raw.layout
  );

  const defaults = getWeChatTemplateDefaultConfig(template, typographyStyle);
  const merged = {
    ...defaults,
    ...(raw as Partial<WeChatConfig>),
  } as WeChatConfig & { layout?: unknown };

  const fontStyle = normalizeFontStyleValue(raw.fontStyle, raw.layout, defaults.fontStyle);
  const { layout: _legacyLayout, ...withoutLegacyLayout } = merged;

  return {
    ...(withoutLegacyLayout as WeChatConfig),
    template,
    typographyStyle: template === 'basic' ? typographyStyle : 'standard',
    fontStyle,
  };
};
