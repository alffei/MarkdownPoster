/**
 * 模块说明：公众号模板配置源，定义模板元数据与默认参数。
 */

import { CSSProperties } from 'react';
import { WeChatConfig, WeChatTemplateKind } from '../types';

export type WeChatRemarkPluginKey = 'guobiCards';

export interface WeChatTemplateRenderProfile {
  layoutMode: 'follow-config' | 'fixed';
  fixedLayoutId?: string;
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
    mode: 'theme-only' | 'card-aware-guobi';
  };
}

export interface WeChatTemplateDefinition {
  value: WeChatTemplateKind;
  label: string;
  summary: string;
  typographyControlLabel: string;
  defaults: Omit<WeChatConfig, 'template'>;
  render: WeChatTemplateRenderProfile;
}

const BASIC_DEFAULTS: Omit<WeChatConfig, 'template'> = {
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
};

const GUOBI_DEFAULTS: Omit<WeChatConfig, 'template'> = {
  layout: 'Base',
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

const TEMPLATE_DEFINITION_MAP: Record<WeChatTemplateKind, WeChatTemplateDefinition> = {
  basic: {
    value: 'basic',
    label: '基础',
    summary: '通用排版，标题结构可调。',
    typographyControlLabel: '排版风格',
    defaults: BASIC_DEFAULTS,
    render: {
      layoutMode: 'follow-config',
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
    },
  },
  guobi: {
    value: 'guobi',
    label: '果比',
    summary: '固定果比风格，保留专属卡片结构。',
    typographyControlLabel: '字体风格',
    defaults: GUOBI_DEFAULTS,
    render: {
      layoutMode: 'fixed',
      fixedLayoutId: 'Guobi',
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
    },
  },
};

export const DEFAULT_WECHAT_TEMPLATE: WeChatTemplateKind = 'basic';

export const WECHAT_TEMPLATE_OPTIONS: WeChatTemplateDefinition[] = Object.values(
  TEMPLATE_DEFINITION_MAP
);

const isWeChatTemplateKind = (value: unknown): value is WeChatTemplateKind => (
  typeof value === 'string'
  && Object.prototype.hasOwnProperty.call(TEMPLATE_DEFINITION_MAP, value)
);

export const getWeChatTemplateDefinition = (
  template: WeChatTemplateKind
): WeChatTemplateDefinition => TEMPLATE_DEFINITION_MAP[template];

export const getWeChatTemplateDefaultConfig = (template: WeChatTemplateKind): WeChatConfig => ({
  template,
  ...getWeChatTemplateDefinition(template).defaults,
});

export const getDefaultWeChatConfig = (): WeChatConfig => (
  getWeChatTemplateDefaultConfig(DEFAULT_WECHAT_TEMPLATE)
);

export const normalizeWeChatConfig = (
  input: Partial<WeChatConfig> | null | undefined
): WeChatConfig => {
  const template = isWeChatTemplateKind(input?.template)
    ? input.template
    : DEFAULT_WECHAT_TEMPLATE;

  return {
    ...getWeChatTemplateDefaultConfig(template),
    ...input,
    template,
  };
};
