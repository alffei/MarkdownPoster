/**
 * 模块说明：公众号预览组件，负责生成接近公众号排版的预览效果。
 */

import React, { useMemo, forwardRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkDirective from 'remark-directive';
import rehypeKatex from 'rehype-katex';
import { Highlight } from 'prism-react-renderer';
import { WeChatConfig } from '../types';
import { hexToRgba } from '../utils/themeUtils';
import { WeChatThemeRegistry } from '../utils/wechatThemeRegistry';
import { StableImage } from './StableImage';
import {
  remarkRuby,
  remarkCenter,
  remarkGuobiCards,
  remarkInspirationSections,
  remarkRecruitSections,
  remarkSpringSections,
} from '../utils/markdownPlugins';
import { RubyRender } from './RubyRender';
import { normalizeQuotedEmphasis } from '../utils/markdownNormalize';
import { safeMarkdownUrlTransform } from '../utils/security';
import {
  getWeChatFontStyleDefinition,
  getWeChatRenderProfile,
  WeChatRemarkPluginKey,
} from '../config/wechatTemplates';

interface WeChatPreviewProps {
  markdown: string;
  config: WeChatConfig;
  imagePool: Record<string, string>;
  isDarkMode: boolean;
  visible: boolean;
  containerRef?: React.RefObject<HTMLDivElement | null>;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
}

const readNodeText = (input: any): string => {
  if (typeof input === 'string' || typeof input === 'number') return String(input);
  if (Array.isArray(input)) return input.map((item) => readNodeText(item)).join('');
  if (React.isValidElement(input)) return readNodeText((input as React.ReactElement<any>).props.children);
  return '';
};

type InspirationMarkerKind = 'none' | 'check' | 'warning' | 'idea';

const parseInspirationMarker = (text: string): { kind: InspirationMarkerKind; cleanText: string } => {
  const source = text.trim();
  const patterns: Array<{ kind: InspirationMarkerKind; regex: RegExp }> = [
    { kind: 'check', regex: /^(?:[-*]\s*)?(?:✅|✔️?|☑️)\s*/u },
    { kind: 'warning', regex: /^(?:[-*]\s*)?(?:⚠️?|❗|‼️)\s*/u },
    { kind: 'idea', regex: /^(?:[-*]\s*)?(?:💡|👉)\s*/u },
  ];

  for (const entry of patterns) {
    if (entry.regex.test(source)) {
      return {
        kind: entry.kind,
        cleanText: source.replace(entry.regex, '').trim(),
      };
    }
  }

  return { kind: 'none', cleanText: source };
};

const SPRING_DECORATIVE_ASSETS = {
  titleBrush: './wechat-assets/spring-fresh/decorative/wx-spring-deco-title-brush-bg-v1.png',
  curveBottom: './wechat-assets/spring-fresh/decorative/wx-spring-deco-divider-wave-thin-v1.png',
  leafTopLeft: './wechat-assets/spring-fresh/decorative/wx-spring-deco-leaf-corner-top-left-v1.png',
  leafRight: './wechat-assets/spring-fresh/decorative/wx-spring-deco-leaf-corner-right-v1.png',
};

export const WeChatPreview = forwardRef<HTMLDivElement, WeChatPreviewProps>(({
  markdown,
  config,
  imagePool,
  isDarkMode,
  visible,
  containerRef,
  onScroll
}, ref) => {
  type FootnoteLink = {
    label: string;
    url: string;
  };

  const templateRender = useMemo(
    () => getWeChatRenderProfile(config.template, config.typographyStyle),
    [config.template, config.typographyStyle]
  );
  const fontStyleDef = useMemo(
    () => getWeChatFontStyleDefinition(config.fontStyle),
    [config.fontStyle]
  );
  const resolvedLayoutId = templateRender.fixedLayoutId;

  // 1) 根据当前布局与主色，取出主题样式
  const themeStyle = useMemo(() => {
    return WeChatThemeRegistry.getLayoutStyles(resolvedLayoutId, config.primaryColor || '#07c160');
  }, [resolvedLayoutId, config.primaryColor]);

  // 2) 读取代码块主题定义
  const codeThemeDef = useMemo(() => {
    return WeChatThemeRegistry.getCodeThemeDef(config.codeTheme);
  }, [config.codeTheme]);

  // 根据枚举值换算实际字号像素
  const baseFontSize = useMemo(() => {
    return WeChatThemeRegistry.getFontSizePixel(config.fontSize);
  }, [config.fontSize]);

  // 根据枚举值换算行高系数
  const lineHeightValue = useMemo(() => {
    return WeChatThemeRegistry.getLineHeightScale(config.lineHeight);
  }, [config.lineHeight]);

  // 标题字号按正文基准做比例放大
  const headingSizes = useMemo(() => {
    const base = parseInt(baseFontSize.replace('px', ''), 10);
    return {
      h1: `${Math.round(base * 1.6)}px`,
      h2: `${Math.round(base * 1.4)}px`,
      h3: `${Math.round(base * 1.2)}px`,
    }
  }, [baseFontSize]);

  // 正文通用样式，供段落/列表等复用
  const commonTextStyle = {
    fontSize: baseFontSize,
    lineHeight: lineHeightValue,
    letterSpacing: `calc(${templateRender.commonText.letterSpacing} + ${fontStyleDef.extraLetterSpacing})`,
    color: templateRender.commonText.color,
    textAlign: (config.justify ? 'justify' : 'left') as any,
    maxWidth: '100%',
    boxSizing: 'border-box' as const,
    fontFamily: fontStyleDef.fontFamily
  };

  const remarkPlugins = useMemo(() => {
    const templateRemarkPlugins: Record<WeChatRemarkPluginKey, any> = {
      guobiCards: remarkGuobiCards,
      inspirationSections: remarkInspirationSections,
      recruitSections: remarkRecruitSections,
      springSections: remarkSpringSections,
    };
    const plugins = [remarkGfm, remarkMath, remarkDirective, remarkRuby, remarkCenter];
    templateRender.remarkPluginKeys.forEach((key) => {
      plugins.push(templateRemarkPlugins[key]);
    });
    return plugins;
  }, [templateRender]);

  // 3) 预处理 Markdown：提取标题、生成引用脚注、规范强调语法
  const { processedMarkdown, footnotes, headerInfo } = useMemo(() => {
    let text = markdown;
    let extractedTitle = "";

    // 提取首个 H1 作为文章标题
    const titleMatch = text.match(/^#\s+(.*$)/m);
    if (titleMatch) {
      extractedTitle = titleMatch[1];
      if (templateRender.titleBlockMode !== 'keep-first-h1') {
        text = text.replace(/^#\s+(.*$)\n?/m, '');
      }
    } else {
      extractedTitle = "无标题";
    }

    // 开启“引用链接”时，把正文链接转成脚注编号
    const links: FootnoteLink[] = [];
    if (config.linkReferences) {
      let linkCounter = 0;
      const linkRegex = /([^!]|^)\[([^\]]+)\]\(([^)]+)\)/g;

      text = text.replace(linkRegex, (match, prefix, linkText, url) => {
        if (url.startsWith('#')) return match;
        // `ruby:` 协议用于注音渲染，不应计入脚注
        if (url.startsWith('ruby:')) return match;

        linkCounter++;
        links.push({
          label: linkText.trim() || url.trim(),
          url: url.trim(),
        });
        return `${prefix}[${linkText}](${url})\`[${linkCounter}]\``;
      });
    }

    text = normalizeQuotedEmphasis(text);

    return {
      processedMarkdown: text,
      footnotes: links,
      headerInfo: {
        title: extractedTitle,
        date: new Date().toLocaleDateString('zh-CN'),
        author: "公众号",
        account: "人人智学社"
      }
    };
  }, [markdown, config.linkReferences, templateRender.titleBlockMode]);

  // 4) 自定义渲染器：确保和公众号显示习惯一致
  const components = useMemo(() => {
    const isInspirationTemplate = templateRender.blockquote.mode === 'inspiration-sections';
    const isRecruitTemplateMode = templateRender.blockquote.mode === 'recruit-sections';
    const isSpringTemplateMode = templateRender.blockquote.mode === 'spring-sections';
    const isEditorialTemplate = templateRender.blockquote.mode === 'editorial-accent';
    let inspirationCoverCount = 0;

    return {
      // 任务列表复选框：替换默认 checkbox，统一视觉
      input: ({ type, checked }: any) => {
        if (type !== 'checkbox') return null;
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '1.2em',
            height: '1.2em',
            marginRight: '0.4em',
            transform: 'translateY(0.1em)',
            flexShrink: 0,
            verticalAlign: 'middle'
          }}>
            {checked ? (
              <svg viewBox="0 0 24 24" fill="none" style={{ width: '100%', height: '100%' }}>
                <rect x="2" y="2" width="20" height="20" rx="4" fill={config.primaryColor} />
                <path d="M7 12l3 3l7-7" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" style={{ width: '100%', height: '100%' }}>
                <rect x="2" y="2" width="20" height="20" rx="4" stroke="#d1d5db" strokeWidth="2" fill="transparent" />
              </svg>
            )}
          </span>
        );
      },

      pre: ({ children }: any) => {
        const codeElement = children as React.ReactElement<any>;
        if (!React.isValidElement(codeElement)) return <pre>{children}</pre>;

        const props = codeElement.props as { className?: string; children?: React.ReactNode };
        const className = props?.className || '';
        const codeContent = String(props?.children || '').replace(/\n$/, '');
        const match = /language-(\w+)/.exec(className);
        const prismTheme = codeThemeDef.theme;

        // 根据主题明暗，切换代码头部与分割线颜色
        const isDarkTheme = codeThemeDef.isDark;

        // 优先使用主题色，缺省时回退到安全背景色
        const themeBg = prismTheme.plain.backgroundColor || (isDarkTheme ? '#1e1e1e' : '#f6f8fa');
        const themeColor = prismTheme.plain.color || (isDarkTheme ? '#d4d4d4' : '#24292e');

        // 使用 section 提高微信场景下的样式保真度
        return (
          <section style={{
            margin: '1.5em 0',
            borderRadius: '8px',
            boxShadow: '0 0 0 1px rgba(0,0,0,0.03)',
            overflow: 'hidden',
            fontSize: '13px',
            lineHeight: '1.6',
            backgroundColor: themeBg, // Applied Theme Background
            color: themeColor,
            maxWidth: '100%',
            position: 'relative' // For positioning
          }}>
            {config.macCodeBlock && (
              <section style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '12px 16px',
                // 暗色主题用半透明，亮色主题用浅灰，增强层级
                backgroundColor: isDarkTheme ? 'rgba(255, 255, 255, 0.03)' : '#e6e8eb',
                borderBottom: isDarkTheme ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid #dce0e3'
              }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#ff5f56', display: 'inline-block' }}></span>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#ffbd2e', display: 'inline-block' }}></span>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#27c93f', display: 'inline-block' }}></span>
              </section>
            )}
            <div style={{
              padding: '16px',
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch'
            }}>
              <Highlight
                theme={prismTheme}
                code={codeContent}
                language={match ? match[1] : 'text'}
              >
                {({ className, style, tokens, getLineProps, getTokenProps }) => (
                  <pre className={className} style={{
                    ...style,
                    margin: 0,
                    padding: 0,
                    fontFamily: '"Operator Mono", "JetBrains Mono", Consolas, Monaco, Menlo, monospace',
                    backgroundColor: 'transparent', // Important: Let wrapper handle BG
                    float: 'left',
                    minWidth: '100%',
                  }}>
                    {tokens.map((line, i) => (
                      <div key={i} {...getLineProps({ line })} style={{ display: 'block', whiteSpace: 'pre' }}>
                        {config.lineNumbers && (
                          <span style={{
                            display: 'inline-block',
                            userSelect: 'none',
                            opacity: 0.4,
                            textAlign: 'right',
                            width: '2.5em',
                            paddingRight: '1em',
                            marginRight: '0.5em',
                            borderRight: isDarkTheme ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)'
                          }}>
                            {i + 1}
                          </span>
                        )}
                        <span style={{ display: 'inline-block' }}>
                          {line.map((token, key) => (
                            <span key={key} {...getTokenProps({ token })} />
                          ))}
                        </span>
                      </div>
                    ))}
                  </pre>
                )}
              </Highlight>
              <div style={{ clear: 'both' }}></div>
            </div>
          </section>
        );
      },

      code({ node, className, children, ...props }: any) {
        const content = String(children || '');
        if (/^\[\d+\]$/.test(content)) {
          return (
            <sup style={{ fontSize: '0.7em', color: '#9ca3af', marginLeft: '2px', verticalAlign: 'super' }}>
              {children}
            </sup>
          );
        }

        // 行内代码使用主色的低透明背景，保持一致性
        const isPillStyle = isInspirationTemplate || isSpringTemplateMode;
        const inlineCodeBg = isPillStyle ? hexToRgba(config.primaryColor, 0.15) : hexToRgba(config.primaryColor, 0.1);
        const inlineCodeColor = config.primaryColor;

        return (
          <code
            style={{
              margin: '0 4px',
              padding: isPillStyle ? '2px 8px' : '2px 4px',
              borderRadius: isPillStyle ? '6px' : '4px',
              fontFamily: 'Monaco, Consolas, monospace',
              fontSize: '0.9em',
              fontWeight: '600',
              backgroundColor: inlineCodeBg,
              color: inlineCodeColor,
              ...props.style
            }}
            {...props}
          >
            {children}
          </code>
        );
      },

      img: ({ node, ...props }: any) => {
        let caption = "";
        if (config.captionType === 'title' && props.title) caption = props.title;
        else if (config.captionType === 'alt' && props.alt) caption = props.alt;

        const imageStyle = templateRender.image.style;

        return (
          <section style={{ display: 'block', margin: templateRender.image.sectionMargin, textAlign: 'center' }}>
            <span style={{ display: 'block', maxWidth: '100%', overflow: 'hidden', borderRadius: templateRender.image.wrapperRadius }}>
              {/* 图片组件内部负责 data-id 与图片池映射 */}
              <StableImage {...props} imagePool={imagePool} style={imageStyle} />
            </span>
            {caption && (
              <span style={{ display: 'block', marginTop: '0.6em', fontSize: '13px', color: '#888', lineHeight: '1.4' }}>
                {caption}
              </span>
            )}
          </section>
        );
      },
      p: ({ node, children, ...props }: any) => {
        const paragraphText = readNodeText(children).trim();
        const paragraphMarker = parseInspirationMarker(paragraphText);
        if (isInspirationTemplate && paragraphMarker.kind === 'idea') {
          return (
            <p
              style={{
                ...commonTextStyle,
                ...templateRender.paragraph.style,
                margin: '18px 0 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: 700,
                color: config.primaryColor,
                textIndent: '0',
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  width: '22px',
                  height: '22px',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '999px',
                  background: hexToRgba(config.primaryColor, 0.16),
                  color: config.primaryColor,
                  fontSize: '13px',
                  flexShrink: 0,
                }}
              >
                💡
              </span>
              <span>{paragraphMarker.cleanText || paragraphText}</span>
            </p>
          );
        }

        return (
          <p
            style={{
              ...commonTextStyle,
              ...templateRender.paragraph.style,
              ...(templateRender.paragraph.marginBottom ? { marginBottom: templateRender.paragraph.marginBottom } : {}),
              textIndent: config.indent ? '2em' : '0',
              ...(templateRender.paragraph.minHeight ? { minHeight: templateRender.paragraph.minHeight } : {}),
              ...(props.style || {}) // 合并外部样式，保留块引用末段覆盖能力
            }}
          >
            {children}
          </p>
        );
      },
      h1: ({ node, children }: any) => {
        if (isInspirationTemplate && templateRender.titleBlockMode === 'keep-first-h1') {
          inspirationCoverCount += 1;
          if (inspirationCoverCount === 1) {
            return (
              <section
                style={{
                  position: 'relative',
                  overflow: 'hidden',
                  margin: '8px 0 24px',
                  borderRadius: '28px',
                  padding: '56px 26px 72px',
                  background: `linear-gradient(135deg, ${hexToRgba(config.primaryColor, 0.7)} 0%, ${config.primaryColor} 100%)`,
                  boxShadow: `0 18px 36px ${hexToRgba(config.primaryColor, 0.28)}`,
                }}
              >
                <section
                  style={{
                    position: 'absolute',
                    top: '22px',
                    left: '26px',
                    width: '170px',
                    height: '170px',
                    borderRadius: '50%',
                    border: '8px solid rgba(255,255,255,0.18)',
                  }}
                />
                <section
                  style={{
                    position: 'absolute',
                    top: '54px',
                    left: '58px',
                    width: '108px',
                    height: '108px',
                    borderRadius: '50%',
                    border: '8px solid rgba(255,255,255,0.18)',
                  }}
                />
                <section
                  style={{
                    position: 'absolute',
                    right: '-40px',
                    bottom: '-36px',
                    width: '220px',
                    height: '220px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0) 72%)',
                  }}
                />
                <section
                  style={{
                    position: 'absolute',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    bottom: '-34px',
                    width: '88%',
                    height: '56px',
                    borderRadius: '999px',
                    background: 'rgba(255,255,255,0.96)',
                  }}
                />
                <h1
                  style={{
                    margin: 0,
                    position: 'relative',
                    zIndex: 2,
                    color: '#fff',
                    fontSize: `clamp(${headingSizes.h1}, 8.4vw, 40px)`,
                    lineHeight: 1.22,
                    letterSpacing: '0.01em',
                    fontWeight: 800,
                    textShadow: '0 3px 16px rgba(0,0,0,0.18)',
                    maxWidth: '90%',
                    fontFamily: fontStyleDef.headingFontFamily,
                  }}
                >
                  {children}
                </h1>
              </section>
            );
          }
        }
        return <h1 style={{ ...themeStyle.h1, fontSize: headingSizes.h1, fontFamily: fontStyleDef.headingFontFamily }}>{children}</h1>;
      },
      h2: ({ node, children }: any) => {
        if (isEditorialTemplate) {
          return (
            <h2
              style={{
                ...themeStyle.h2,
                fontSize: headingSizes.h2,
                margin: '30px 0 14px',
                borderBottom: `1px solid ${config.primaryColor}`,
                paddingBottom: '8px',
                color: (themeStyle.h2 as any)?.color || '#8F2422',
                letterSpacing: '2px',
                fontFamily: fontStyleDef.headingFontFamily,
              }}
            >
              {children}
            </h2>
          );
        }
        return (
          <h2
            style={{
              ...themeStyle.h2,
              fontSize: templateRender.headingSizeMode === 'keep-layout-h2-h3' ? ((themeStyle.h2 as any).fontSize || '16px') : headingSizes.h2,
              fontFamily: fontStyleDef.headingFontFamily,
            }}
          >
            {children}
          </h2>
        );
      },
      h3: ({ node, children }: any) => {
        if (isEditorialTemplate) {
          return (
            <h3
              style={{
                ...themeStyle.h3,
                marginTop: '22px',
                marginBottom: '10px',
                color: '#CC7C5B',
                letterSpacing: '2px',
                fontSize: headingSizes.h3,
                fontWeight: 700,
                fontFamily: fontStyleDef.headingFontFamily,
              }}
            >
              {children}
            </h3>
          );
        }
        if (isInspirationTemplate) {
          return (
            <h3
              style={{
                ...themeStyle.h3,
                marginTop: '18px',
                marginBottom: '12px',
                fontSize: templateRender.headingSizeMode === 'keep-layout-h2-h3' ? ((themeStyle.h3 as any).fontSize || '16px') : headingSizes.h3,
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                color: (themeStyle.h3 as any)?.color || '#111827',
                letterSpacing: '0.02em',
                fontFamily: fontStyleDef.headingFontFamily,
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${hexToRgba(config.primaryColor, 0.92)} 0%, ${config.primaryColor} 100%)`,
                  boxShadow: `0 2px 6px ${hexToRgba(config.primaryColor, 0.4)}`,
                  flexShrink: 0,
                }}
              />
              <span>{children}</span>
            </h3>
          );
        }
        if (isRecruitTemplateMode) {
          return (
            <h3
              style={{
                ...themeStyle.h3,
                fontSize: templateRender.headingSizeMode === 'keep-layout-h2-h3' ? ((themeStyle.h3 as any).fontSize || '16px') : headingSizes.h3,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                letterSpacing: '0.05em',
                color: '#2a2624',
                fontFamily: fontStyleDef.headingFontFamily,
              }}
            >
              <span
                style={{
                  width: '9px',
                  height: '9px',
                  borderRadius: 0,
                  background: `linear-gradient(135deg, ${config.primaryColor} 0%, ${hexToRgba(config.primaryColor, 0.55)} 100%)`,
                  border: '1px solid #000000',
                  display: 'inline-block',
                  flexShrink: 0,
                }}
              />
              <span>{children}</span>
            </h3>
          );
        }
        if (isSpringTemplateMode) {
          return (
            <h3
              style={{
                ...themeStyle.h3,
                fontSize: templateRender.headingSizeMode === 'keep-layout-h2-h3' ? ((themeStyle.h3 as any).fontSize || '16px') : headingSizes.h3,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                letterSpacing: '0.06em',
                fontFamily: fontStyleDef.headingFontFamily,
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: config.primaryColor,
                  display: 'inline-block',
                  flexShrink: 0,
                }}
              />
              <span>{children}</span>
            </h3>
          );
        }
        return <h3 style={{ ...themeStyle.h3, fontSize: templateRender.headingSizeMode === 'keep-layout-h2-h3' ? ((themeStyle.h3 as any).fontSize || '16px') : headingSizes.h3, fontFamily: fontStyleDef.headingFontFamily }}>{children}</h3>;
      },
      blockquote: ({ node, children }: any) => {
        // 扁平化 children，兼容 react-markdown 混合文本/元素输出
        const childrenArray = React.Children.toArray(children);
        const guobiQuoteStyle = {
          margin: '1.2em 0',
          padding: '0.8em 1em',
          borderRadius: '10px',
          borderLeft: `4px solid ${hexToRgba(config.primaryColor, 0.35)}`,
          backgroundColor: 'rgba(250, 249, 245, 0.8)'
        };
        const isTemplateCard = Boolean(
          (node as any)?.properties?.['data-guobi-card'] ||
          (node as any)?.data?.hProperties?.['data-guobi-card']
        );
        const isInspirationSection = Boolean(
          (node as any)?.properties?.['data-inspiration-section'] ||
          (node as any)?.data?.hProperties?.['data-inspiration-section']
        );
        const isSpringSection = Boolean(
          (node as any)?.properties?.['data-spring-section'] ||
          (node as any)?.data?.hProperties?.['data-spring-section']
        );
        const isRecruitSection = Boolean(
          (node as any)?.properties?.['data-recruit-section'] ||
          (node as any)?.data?.hProperties?.['data-recruit-section']
        );
        const inspirationSectionIndex = String(
          (node as any)?.properties?.['data-inspiration-index'] ||
          (node as any)?.data?.hProperties?.['data-inspiration-index'] ||
          ''
        );
        const recruitSectionTitle = String(
          (node as any)?.properties?.['data-recruit-title'] ||
          (node as any)?.data?.hProperties?.['data-recruit-title'] ||
          ''
        );
        const springSectionTitle = String(
          (node as any)?.properties?.['data-spring-title'] ||
          (node as any)?.data?.hProperties?.['data-spring-title'] ||
          ''
        );

        if (templateRender.blockquote.mode === 'inspiration-sections' && isInspirationSection) {
          const headingElement = childrenArray.find(
            (child) => React.isValidElement(child) && child.type === 'h2'
          ) as React.ReactElement<any> | undefined;
          const headingText = headingElement
            ? readNodeText(headingElement.props.children)
            : readNodeText(childrenArray);

          return (
            <section style={{ margin: '28px 0 16px' }}>
              <section
                style={{
                  height: '1px',
                  background: `linear-gradient(90deg, ${hexToRgba(config.primaryColor, 0.2)} 0%, ${hexToRgba(config.primaryColor, 0.05)} 100%)`,
                  marginBottom: '14px',
                }}
              />
              <section style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <section
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    background: `linear-gradient(135deg, ${hexToRgba(config.primaryColor, 0.95)} 0%, ${config.primaryColor} 100%)`,
                    color: '#fff',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '17px',
                    fontWeight: 700,
                    boxShadow: `0 6px 16px ${hexToRgba(config.primaryColor, 0.35)}`,
                    flexShrink: 0,
                  }}
                >
                  {inspirationSectionIndex}
                </section>
                <h2
                  style={{
                    margin: 0,
                    fontSize: (themeStyle.h2 as any)?.fontSize || '21px',
                    fontWeight: 700,
                    lineHeight: 1.35,
                    letterSpacing: '0.5px',
                    color: '#111827',
                    fontFamily: fontStyleDef.headingFontFamily,
                  }}
                >
                  {headingText}
                </h2>
              </section>
            </section>
          );
        }

        if (templateRender.blockquote.mode === 'recruit-sections' && isRecruitSection) {
          const headingText = recruitSectionTitle || '章节';
          const sectionChildren = childrenArray;

          let sectionLastElementIndex = -1;
          for (let i = sectionChildren.length - 1; i >= 0; i--) {
            if (React.isValidElement(sectionChildren[i])) {
              sectionLastElementIndex = i;
              break;
            }
          }

          return (
            <section style={{ margin: '26px 0 20px' }}>
              <section
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  marginBottom: '12px',
                }}
              >
                <section
                  style={{
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    width: '100%',
                    maxWidth: '100%',
                    boxSizing: 'border-box',
                    padding: '0 24px',
                  }}
                >
                  <span
                    style={{
                      display: 'block',
                      maxWidth: '100%',
                      fontSize: 'clamp(16px, 2.5vw, 21px)',
                      lineHeight: 1.24,
                      letterSpacing: '0.6px',
                      color: '#000000',
                      fontWeight: 700,
                      fontFamily: fontStyleDef.headingFontFamily,
                      textAlign: 'center',
                      whiteSpace: 'normal',
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {headingText}
                  </span>
                  <span
                    style={{
                      position: 'absolute',
                      left: '-10px',
                      top: '4px',
                      width: 0,
                      height: 0,
                      borderLeft: '12px solid transparent',
                      borderRight: '34px solid transparent',
                      borderBottom: `16px solid ${hexToRgba(config.primaryColor, 0.72)}`,
                      transform: 'rotate(-8deg)',
                      pointerEvents: 'none',
                    }}
                  />
                </section>
              </section>

              <section
                style={{
                  position: 'relative',
                  border: '1px solid #000000',
                  backgroundColor: '#ffffff',
                  overflow: 'hidden',
                }}
              >
                <section
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    height: '34px',
                    padding: '0 14px',
                    borderBottom: '1px solid #000000',
                    backgroundColor: '#ffffff',
                  }}
                >
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#000000' }} />
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#000000' }} />
                </section>

                <section
                  style={{
                    position: 'absolute',
                    right: '-10px',
                    top: '38px',
                    width: '38px',
                    height: '28px',
                    background: `linear-gradient(135deg, ${hexToRgba(config.primaryColor, 0.9)} 0%, ${config.primaryColor} 100%)`,
                    transform: 'rotate(16deg)',
                    boxShadow: `0 3px 8px ${hexToRgba(config.primaryColor, 0.26)}`,
                    zIndex: 2,
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      left: '11px',
                      top: '9px',
                      width: '14px',
                      height: '8px',
                      borderLeft: '2px solid #fff',
                      borderBottom: '2px solid #fff',
                      transform: 'rotate(-35deg)',
                    }}
                  />
                </section>

                <section style={{ position: 'relative', zIndex: 1, padding: '16px 14px 16px' }}>
                  {sectionChildren.map((child, index) => {
                    if (index === sectionLastElementIndex && React.isValidElement(child)) {
                      const element = child as React.ReactElement<any>;
                      return React.cloneElement(element, {
                        style: {
                          ...(element.props.style || {}),
                          marginBottom: 0,
                        },
                      });
                    }
                    return child;
                  })}

                  <section
                    style={{
                      marginTop: '14px',
                      width: '100%',
                      height: '12px',
                      background: `linear-gradient(to right, ${hexToRgba(config.primaryColor, 0.85)} 0%, rgba(255,255,255,0.95) 100%)`,
                    }}
                  />
                </section>
              </section>
            </section>
          );
        }

        if (templateRender.blockquote.mode === 'spring-sections' && isSpringSection) {
          const headingText = springSectionTitle || '章节';
          const sectionChildren = childrenArray;

          let sectionLastElementIndex = -1;
          for (let i = sectionChildren.length - 1; i >= 0; i--) {
            if (React.isValidElement(sectionChildren[i])) {
              sectionLastElementIndex = i;
              break;
            }
          }

          return (
            <section style={{ margin: '28px 0 20px' }}>
              <section
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  marginBottom: '8px',
                }}
              >
                <section
                  style={{
                    backgroundImage: `url(${SPRING_DECORATIVE_ASSETS.titleBrush})`,
                    backgroundSize: '100% 100%',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    padding: '11px 3em',
                    boxSizing: 'border-box',
                    minWidth: '190px',
                    maxWidth: '90%',
                  }}
                >
                  <section
                    style={{
                      fontSize: '20px',
                      color: '#ffffff',
                      textAlign: 'center',
                      letterSpacing: '2px',
                      fontWeight: 700,
                      lineHeight: 1.3,
                      fontFamily: fontStyleDef.headingFontFamily,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {headingText}
                  </section>
                </section>
              </section>
              <section
                style={{
                  position: 'relative',
                  marginTop: '16px',
                }}
              >
                <img
                  src={SPRING_DECORATIVE_ASSETS.leafTopLeft}
                  alt=""
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    left: '-18px',
                    top: '-26px',
                    width: '92px',
                    opacity: 0.72,
                    pointerEvents: 'none',
                    zIndex: 2,
                  }}
                />
                <section
                  style={{
                    position: 'relative',
                    backgroundColor: '#f3faed',
                    border: '1px solid #dbe8cc',
                    padding: '22px 15px 18px',
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                  }}
                >
                  <section
                    style={{
                      width: 'calc(100% - 58px)',
                      height: '1px',
                      margin: '0 0 14px 58px',
                      backgroundColor: config.primaryColor,
                      opacity: 0.9,
                    }}
                  />
                  <img
                    src={SPRING_DECORATIVE_ASSETS.leafRight}
                    alt=""
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      right: '-10px',
                      bottom: '6px',
                      width: '54px',
                      opacity: 0.35,
                      pointerEvents: 'none',
                    }}
                  />
                  <section style={{ position: 'relative', zIndex: 1 }}>
                    {sectionChildren.map((child, index) => {
                      if (index === sectionLastElementIndex && React.isValidElement(child)) {
                        const element = child as React.ReactElement<any>;
                        return React.cloneElement(element, {
                          style: {
                            ...(element.props.style || {}),
                            marginBottom: 0,
                          },
                        });
                      }
                      return child;
                    })}
                  </section>
                  <section
                    style={{
                      position: 'relative',
                      zIndex: 1,
                      marginTop: '14px',
                      display: 'flex',
                      justifyContent: 'center',
                    }}
                  >
                    <img
                      src={SPRING_DECORATIVE_ASSETS.curveBottom}
                      alt=""
                      aria-hidden="true"
                      style={{
                        width: '84%',
                        maxWidth: '680px',
                        opacity: 0.9,
                        pointerEvents: 'none',
                      }}
                    />
                  </section>
                </section>
              </section>
            </section>
          );
        }

        const blockquoteText = readNodeText(childrenArray).trim();
        const hasWarningTone = /(?:⚠️?|❗|警告|风险|注意)/u.test(blockquoteText);
        const hasCheckTone = /(?:✅|✔️?|建议|推荐)/u.test(blockquoteText);
        const inspirationQuoteStyle = hasWarningTone
          ? {
            margin: '16px 0',
            padding: '16px 18px',
            borderRadius: '14px',
            borderLeft: `4px solid ${config.primaryColor}`,
            background: 'linear-gradient(180deg, #fff7ed 0%, #fff1e7 100%)',
            boxShadow: `inset 0 0 0 1px ${hexToRgba(config.primaryColor, 0.15)}`,
          }
          : hasCheckTone
            ? {
              margin: '16px 0',
              padding: '16px 18px',
              borderRadius: '14px',
              border: `1px solid ${hexToRgba(config.primaryColor, 0.18)}`,
              background: 'linear-gradient(180deg, #f8fafc 0%, #f3f4f6 100%)',
            }
            : {};

        const blockquoteStyle = templateRender.blockquote.mode === 'card-aware-guobi'
          ? (isTemplateCard ? { ...themeStyle.blockquote, ...commonTextStyle } : { ...guobiQuoteStyle, ...commonTextStyle })
          : {
            ...themeStyle.blockquote,
            ...(isInspirationTemplate ? inspirationQuoteStyle : {}),
            ...(isEditorialTemplate ? {
              margin: '12px 0',
              padding: '15px 12px',
              borderLeft: '7px solid rgba(228, 177, 160, 1)',
              borderRadius: '10px',
              backgroundColor: 'rgba(255, 255, 255, 0.6)',
              color: '#3B3B38',
            } : {}),
            ...(isSpringTemplateMode ? {
              margin: '16px 0',
              padding: '14px 16px',
              borderRadius: '8px',
              border: '1px solid #d9e8c7',
              borderLeft: `3px solid ${hexToRgba(config.primaryColor, 0.65)}`,
              background: '#f3faed',
            } : {}),
            ...(isRecruitTemplateMode ? {
              margin: '16px 0',
              padding: '14px 16px',
              borderRadius: '0',
              border: '1px solid #000000',
              borderLeft: `3px solid ${config.primaryColor}`,
              background: '#ffffff',
            } : {}),
            ...commonTextStyle,
            ...(isInspirationTemplate ? { lineHeight: 1.95 } : {}),
            ...(isEditorialTemplate ? { lineHeight: 2, letterSpacing: '2px' } : {}),
          };

        // 找到最后一个有效元素节点，避免空白文本干扰
        let lastElementIndex = -1;
        for (let i = childrenArray.length - 1; i >= 0; i--) {
          if (React.isValidElement(childrenArray[i])) {
            lastElementIndex = i;
            break;
          }
        }

        return (
          <section style={blockquoteStyle}>
            {childrenArray.map((child, index) => {
              // 仅最后一个有效节点去掉下边距，避免多余留白
              if (index === lastElementIndex && React.isValidElement(child)) {
                const element = child as React.ReactElement<any>;
                return React.cloneElement(element, {
                  style: {
                    ...(element.props.style || {}),
                    marginBottom: 0
                  }
                });
              }
              return child;
            })}
          </section>
        );
      },
      ul: ({ node, className, children }: any) => {
        // 检测 GFM 任务列表
        const isTaskList = className?.includes('contains-task-list');
        const listText = readNodeText(children).trim();
        const listMarker = parseInspirationMarker(listText);
        const isInspirationChecklist = isInspirationTemplate && !isTaskList && listMarker.kind === 'check';
        if (isEditorialTemplate && !isTaskList) {
          const items = React.Children.toArray(children).filter(
            (item) => React.isValidElement(item) && item.type === 'li'
          ) as React.ReactElement<any>[];
          if (!items.length) {
            return (
              <ul
                style={{
                  listStyleType: 'disc',
                  paddingLeft: '1.4em',
                  marginBottom: templateRender.list.blockMarginBottom,
                  color: '#3B3B38',
                }}
              >
                {children}
              </ul>
            );
          }
          return (
            <ul
              style={{
                listStyleType: 'none',
                paddingLeft: 0,
                marginBottom: templateRender.list.blockMarginBottom,
              }}
            >
              {items.map((item, index) => {
                const key = item.key != null ? item.key : `editorial-ul-${index}`;
                return (
                  <li
                    key={String(key)}
                    style={{
                      ...commonTextStyle,
                      color: '#3B3B38',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      marginBottom: '0.8em',
                      listStyleType: 'none',
                    }}
                  >
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: config.primaryColor,
                        marginTop: '0.72em',
                        flexShrink: 0,
                        boxShadow: `0 0 0 3px ${hexToRgba(config.primaryColor, 0.12)}`,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>{item.props.children}</div>
                  </li>
                );
              })}
            </ul>
          );
        }
        if (isRecruitTemplateMode && !isTaskList) {
          const items = React.Children.toArray(children).filter(
            (item) => React.isValidElement(item) && item.type === 'li'
          ) as React.ReactElement<any>[];
          if (!items.length) {
            return (
              <ul
                style={{
                  listStyleType: 'none',
                  paddingLeft: 0,
                  marginBottom: templateRender.list.blockMarginBottom,
                  marginTop: '2px',
                }}
              >
                {children}
              </ul>
            );
          }
          return (
            <ul
              style={{
                listStyleType: 'none',
                paddingLeft: 0,
                marginBottom: templateRender.list.blockMarginBottom,
                marginTop: '2px',
              }}
            >
              {items.map((item, index) => {
                const key = item.key != null ? item.key : `recruit-ul-${index}`;
                const content = item.props.children;
                return (
                  <li
                    key={String(key)}
                    style={{
                      ...commonTextStyle,
                      listStyleType: 'none',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
                      marginBottom: '0.9em',
                    }}
                  >
                    <span
                      style={{
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        backgroundColor: '#000000',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginTop: '0.32em',
                        flexShrink: 0,
                      }}
                    >
                      <span
                        style={{
                          width: '4px',
                          height: '4px',
                          borderRadius: '50%',
                          backgroundColor: '#ffffff',
                          display: 'block',
                        }}
                      />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>{content}</div>
                  </li>
                );
              })}
            </ul>
          );
        }
        return (
          <ul style={{
            paddingLeft: isTaskList || isInspirationChecklist ? '0' : '1.5em',
            marginBottom: templateRender.list.blockMarginBottom,
            listStyleType: isTaskList || isInspirationChecklist ? 'none' : 'disc',
            color: (themeStyle.list as any).color,
            ...(isInspirationChecklist
              ? {
                background: `linear-gradient(180deg, ${hexToRgba(config.primaryColor, 0.04)} 0%, ${hexToRgba(config.primaryColor, 0.01)} 100%)`,
                borderRadius: '16px',
                border: `1px solid ${hexToRgba(config.primaryColor, 0.1)}`,
                padding: '14px 18px 6px',
                marginTop: '12px',
              }
              : {})
          }}>
            {children}
          </ul>
        );
      },
      ol: ({ node, children, start, style, ...props }: any) => {
        const startIndex = Number.isFinite(start) ? start : 1;
        if (isEditorialTemplate) {
          const items = React.Children.toArray(children).filter(
            (item) => React.isValidElement(item) && item.type === 'li'
          ) as React.ReactElement<any>[];
          if (!items.length) {
            return (
              <ol
                {...props}
                start={start}
                style={{
                  paddingLeft: '1.5em',
                  marginBottom: templateRender.list.blockMarginBottom,
                  listStyleType: 'decimal',
                  color: '#3B3B38',
                  ...(style || {}),
                }}
              >
                {children}
              </ol>
            );
          }
          return (
            <ol
              {...props}
              start={start}
              style={{
                listStyleType: 'none',
                paddingLeft: 0,
                marginBottom: templateRender.list.blockMarginBottom,
                ...(style || {}),
              }}
            >
              {items.map((item, index) => {
                const key = item.key != null ? item.key : `editorial-ol-${index}`;
                const marker = `${startIndex + index}.`;
                return (
                  <li
                    key={String(key)}
                    style={{
                      ...commonTextStyle,
                      listStyleType: 'none',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      marginBottom: '0.95em',
                      color: '#3B3B38',
                    }}
                  >
                    <span
                      style={{
                        color: config.primaryColor,
                        minWidth: '1.6em',
                        display: 'inline-block',
                        fontWeight: 700,
                        lineHeight: 2,
                        flexShrink: 0,
                      }}
                    >
                      {marker}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>{item.props.children}</div>
                  </li>
                );
              })}
            </ol>
          );
        }
        if (isRecruitTemplateMode) {
          const items = React.Children.toArray(children).filter(
            (item) => React.isValidElement(item) && item.type === 'li'
          ) as React.ReactElement<any>[];
          if (!items.length) {
            return (
              <ol
                {...props}
                start={start}
                style={{
                  paddingLeft: '1.5em',
                  marginBottom: templateRender.list.blockMarginBottom,
                  listStyleType: 'decimal',
                  color: (themeStyle.list as any).color,
                  ...(style || {}),
                }}
              >
                {children}
              </ol>
            );
          }
          return (
            <ol
              {...props}
              start={start}
              style={{
                listStyleType: 'none',
                paddingLeft: 0,
                marginBottom: templateRender.list.blockMarginBottom,
                marginTop: '4px',
                ...(style || {}),
              }}
            >
              {items.map((item, index) => {
                const key = item.key != null ? item.key : `recruit-ol-${index}`;
                const content = item.props.children;
                const no = String(startIndex + index).padStart(2, '0');
                return (
                  <li
                    key={String(key)}
                    style={{
                      listStyleType: 'none',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      marginBottom: '0.95em',
                    }}
                  >
                    <span
                      style={{
                        width: '28px',
                        height: '28px',
                        border: '1px solid #000000',
                        background: `linear-gradient(135deg, ${hexToRgba(config.primaryColor, 0.92)} 0%, #fffdfc 100%)`,
                        color: '#111111',
                        fontSize: '14px',
                        fontWeight: 700,
                        lineHeight: 1,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: '0.08em',
                      }}
                    >
                      {no}
                    </span>
                    <div
                      style={{
                        ...commonTextStyle,
                        flex: 1,
                        minWidth: 0,
                        paddingTop: '2px',
                        borderBottom: `1px dashed ${hexToRgba(config.primaryColor, 0.35)}`,
                        paddingBottom: '8px',
                      }}
                    >
                      {content}
                    </div>
                  </li>
                );
              })}
            </ol>
          );
        }
        return (
          <ol
            {...props}
            start={start}
            style={{
              paddingLeft: '1.5em',
              marginBottom: templateRender.list.blockMarginBottom,
              listStyleType: 'decimal',
              color: (themeStyle.list as any).color,
              ...(style || {}),
            }}
          >
            {children}
          </ol>
        );
      },
      li: ({ node, className, children }: any) => {
        const isTaskList = className?.includes('task-list-item');
        const listText = readNodeText(children).trim();
        const marker = parseInspirationMarker(listText);
        if (isInspirationTemplate && !isTaskList && marker.kind !== 'none') {
          const iconBackgroundMap: Record<Exclude<InspirationMarkerKind, 'none'>, string> = {
            check: hexToRgba(config.primaryColor, 0.12),
            warning: hexToRgba('#C2410C', 0.14),
            idea: hexToRgba(config.primaryColor, 0.14),
          };
          const iconColorMap: Record<Exclude<InspirationMarkerKind, 'none'>, string> = {
            check: config.primaryColor,
            warning: '#C2410C',
            idea: config.primaryColor,
          };
          const iconLabelMap: Record<Exclude<InspirationMarkerKind, 'none'>, string> = {
            check: '✓',
            warning: '!',
            idea: 'i',
          };
          return (
            <li
              style={{
                ...commonTextStyle,
                marginBottom: '0.85em',
                listStyleType: 'none',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                paddingLeft: 0,
              }}
            >
              <span
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '999px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: iconBackgroundMap[marker.kind],
                  color: iconColorMap[marker.kind],
                  fontSize: '12px',
                  fontWeight: 700,
                  flexShrink: 0,
                  marginTop: '0.18em',
                }}
              >
                {iconLabelMap[marker.kind]}
              </span>
              <span style={{ color: '#374151', lineHeight: 1.9 }}>{marker.cleanText || listText}</span>
            </li>
          );
        }
        return (
          <li style={{
            ...commonTextStyle,
            marginBottom: templateRender.list.itemMarginBottom,
            paddingLeft: isTaskList ? '0' : '0.2em',
            listStyleType: isTaskList ? 'none' : 'inherit',
            display: isTaskList ? 'flex' : 'list-item', // 任务列表用 flex 以对齐复选框
            alignItems: isTaskList ? 'flex-start' : undefined,
            ...(isEditorialTemplate ? { color: '#3B3B38' } : {})
          }}>
            {children}
          </li>
        );
      },
      strong: ({ node, children }: any) => {
        if (isEditorialTemplate) {
          return (
            <strong
              style={{
                color: '#CC7C5B',
                fontWeight: 700,
              }}
            >
              {children}
            </strong>
          );
        }
        return <strong>{children}</strong>;
      },
      a: ({ node, href, children }: any) => {
        // 拦截 ruby: 链接，交给注音渲染组件
        if (href && href.startsWith('ruby:')) {
          const reading = href.replace('ruby:', '');
          const decodedReading = decodeURIComponent(reading);
          return <RubyRender baseText={children} reading={decodedReading} style={{ fontSize: 'inherit', color: 'inherit' }} />;
        }
        return (
          <span
            style={{
              ...themeStyle.link,
              textDecoration: 'none',
              cursor: 'text',
            }}
          >
            {children}
          </span>
        );
      },
      hr: ({ node }: any) => <hr style={themeStyle.hr} />,

      table: ({ node, children }: any) => (
        <section style={{ overflowX: 'auto', margin: '1.5em 0', borderRadius: '4px', border: '1px solid #e5e7eb' }}>
          <table style={{ minWidth: '100%', borderCollapse: 'collapse', fontSize: '14px', lineHeight: '1.5' }}>
            {children}
          </table>
        </section>
      ),
      thead: ({ node, children }: any) => <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>{children}</thead>,
      tbody: ({ node, children }: any) => <tbody>{children}</tbody>,
      tr: ({ node, children }: any) => <tr style={{ borderBottom: '1px solid #e5e7eb' }}>{children}</tr>,
      th: ({ node, children }: any) => (
        <th style={{ padding: '0.75em 1em', textAlign: 'left', fontWeight: 'bold', color: '#374151', borderRight: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>
          {children}
        </th>
      ),
      td: ({ node, children }: any) => (
        <td style={{ padding: '0.75em 1em', color: '#4b5563', borderRight: '1px solid #e5e7eb', verticalAlign: 'top' }}>
          {children}
        </td>
      )
    };
  }, [config, themeStyle, imagePool, baseFontSize, lineHeightValue, headingSizes, commonTextStyle, codeThemeDef, templateRender, fontStyleDef]);

  return (
    <div
      ref={containerRef}
      onScroll={onScroll}
      className={`absolute inset-0 overflow-y-auto overflow-x-hidden ${visible ? 'z-10 visible' : 'z-0 invisible'} transition-colors duration-500 ${isDarkMode ? 'bg-[#1a1d23]' : 'bg-gray-100'}`}
    >
      <div className={`w-full min-h-full flex justify-center py-8 origin-center transition-all duration-300 ease-out delay-75 ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}>

        {/* 手机壳模拟层 */}
        <div className={`relative flex flex-col items-center rounded-[3rem] p-3 shadow-2xl border transition-colors duration-500
                 ${isDarkMode
            ? 'bg-[#2c313a] border-[#3e4451] shadow-black/50'
            : 'bg-white border-gray-200 shadow-xl'
          }
            `}>
          {/* 屏幕容器 */}
          <div className={`relative overflow-hidden rounded-[2.5rem] border-[4px] ${isDarkMode ? 'border-[#1a1d23]' : 'border-gray-50'}`}>

            {/* 刘海区域 */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
              <div className={`w-36 h-6 rounded-b-2xl shadow-sm ${isDarkMode ? 'bg-[#1a1d23]' : 'bg-gray-100'}`}></div>
            </div>

            {/* 内容容器 */}
            <div
              className="w-[375px] md:w-[480px] bg-white min-h-[800px] relative flex flex-col"
              ref={ref}
            >
              {/* 头部信息 */}
              <div className="px-5 pt-12 pb-2">
                <h1
                  style={{
                    fontSize: '22px',
                    fontWeight: 'bold',
                    lineHeight: '1.35',
                    color: '#333',
                    marginBottom: '0.75em',
                    letterSpacing: '0.025em',
                    textAlign: 'left',
                    fontFamily: fontStyleDef.headingFontFamily,
                  }}
                >
                  {headerInfo.title}
                </h1>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    flexWrap: 'wrap',
                    fontSize: '14px',
                    color: 'rgba(0,0,0,0.4)',
                    marginBottom: '1.2em',
                  }}
                >
                  <span style={{ marginRight: '10px' }}>原创</span>
                  <span style={{ marginRight: '10px', color: '#576b95', fontWeight: '500' }}>{headerInfo.author}</span>
                  <span style={{ marginRight: '10px', color: '#576b95' }}>{headerInfo.account}</span>
                  <span>{headerInfo.date}</span>
                </div>
              </div>

              {/* 正文区域 */}
              <div className="flex-1 px-4 pb-12 wechat-content">
                <ReactMarkdown
                  remarkPlugins={remarkPlugins}
                  rehypePlugins={[rehypeKatex]}
                  components={components}
                  // 允许 local:// 与 ruby:，并过滤 javascript: 等危险协议
                  urlTransform={safeMarkdownUrlTransform}
                >
                  {processedMarkdown}
                </ReactMarkdown>

                {/* 脚注区域 */}
                {config.linkReferences && footnotes.length > 0 && (
                  <div style={{ marginTop: '3em', paddingTop: '1.5em', borderTop: '1px dashed #e5e7eb' }}>
                    <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#374151', margin: '0 0 0.75em' }}>引用链接</p>
                    {footnotes.map((fn, idx) => (
                      <p
                        key={idx}
                        style={{
                          margin: '0 0 8px',
                          fontSize: '12px',
                          color: '#6b7280',
                          lineHeight: '1.8',
                          wordBreak: 'break-all',
                        }}
                      >
                        {`[${idx + 1}] ${fn.label}: ${fn.url}`}
                      </p>
                    ))}
                  </div>
                )}
              </div>

              {/* 底部互动区 */}
              <div style={{ padding: '24px 16px', fontSize: '14px', color: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f3f4f6', marginTop: 'auto', backgroundColor: '#fff' }}>
                <div style={{ display: 'flex', gap: '24px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '16px' }}>❤</span> 3
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '16px' }}>★</span> 8
                  </span>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

WeChatPreview.displayName = 'WeChatPreview';
