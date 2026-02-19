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
import { remarkRuby, remarkCenter, remarkGuobiCards } from '../utils/markdownPlugins';
import { RubyRender } from './RubyRender';
import { normalizeQuotedEmphasis } from '../utils/markdownNormalize';

interface WeChatPreviewProps {
  markdown: string;
  config: WeChatConfig;
  imagePool: Record<string, string>;
  isDarkMode: boolean;
  visible: boolean;
  containerRef?: React.RefObject<HTMLDivElement | null>;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
}

export const WeChatPreview = forwardRef<HTMLDivElement, WeChatPreviewProps>(({
  markdown,
  config,
  imagePool,
  isDarkMode,
  visible,
  containerRef,
  onScroll
}, ref) => {
  const isGuobiTemplate = config.template === 'guobi';
  const resolvedLayoutId = isGuobiTemplate ? 'Guobi' : config.layout;
  
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
      letterSpacing: isGuobiTemplate ? '0.03em' : '0.05em',
      color: isGuobiTemplate ? '#646A73' : '#333333',
      textAlign: (config.justify ? 'justify' : 'left') as any,
      maxWidth: '100%',
      boxSizing: 'border-box' as const,
      fontFamily: config.layout === 'Classic'
        ? '"Songti SC", "Noto Serif SC", serif'
        : '"SF Pro SC", "SF Pro Text", "PingFang SC", "Helvetica Neue", Helvetica, Arial, sans-serif'
  };

  const remarkPlugins = useMemo(() => {
      const plugins = [remarkGfm, remarkMath, remarkDirective, remarkRuby, remarkCenter];
      if (isGuobiTemplate) plugins.push(remarkGuobiCards);
      return plugins;
  }, [isGuobiTemplate]);

  // 3) 预处理 Markdown：提取标题、生成引用脚注、规范强调语法
  const { processedMarkdown, footnotes, headerInfo } = useMemo(() => {
     let text = markdown;
     let extractedTitle = "";
     
     // 提取首个 H1 作为文章标题
     const titleMatch = text.match(/^#\s+(.*$)/m);
     if (titleMatch) {
         extractedTitle = titleMatch[1];
         text = text.replace(/^#\s+(.*$)\n?/m, '');
     } else {
         extractedTitle = "无标题";
     }

     // 开启“引用链接”时，把正文链接转成脚注编号
     const links: string[] = [];
     if (config.linkReferences) {
        let linkCounter = 0;
        const linkRegex = /([^!]|^)\[([^\]]+)\]\(([^)]+)\)/g;
        
        text = text.replace(linkRegex, (match, prefix, linkText, url) => {
            if (url.startsWith('#')) return match; 
            // `ruby:` 协议用于注音渲染，不应计入脚注
            if (url.startsWith('ruby:')) return match;

            linkCounter++;
            links.push(`${linkText}: ${url}`);
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
             author: "人人智学社",
             account: "人人智学社"
         }
     };
  }, [markdown, config.linkReferences]);

  // 4) 自定义渲染器：确保和公众号显示习惯一致
  const components = useMemo(() => ({
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
                    <svg viewBox="0 0 24 24" fill="none" style={{width: '100%', height: '100%'}}>
                       <rect x="2" y="2" width="20" height="20" rx="4" fill={config.primaryColor} />
                       <path d="M7 12l3 3l7-7" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                ) : (
                    <svg viewBox="0 0 24 24" fill="none" style={{width: '100%', height: '100%'}}>
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
                        <span style={{width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#ff5f56', display: 'inline-block'}}></span>
                        <span style={{width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#ffbd2e', display: 'inline-block'}}></span>
                        <span style={{width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#27c93f', display: 'inline-block'}}></span>
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
                            <div key={i} {...getLineProps({ line })} style={{display: 'block', whiteSpace: 'pre'}}>
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
                                <span style={{display: 'inline-block'}}>
                                    {line.map((token, key) => (
                                        <span key={key} {...getTokenProps({ token })} />
                                    ))}
                                </span>
                            </div>
                            ))}
                        </pre>
                        )}
                    </Highlight>
                    <div style={{clear: 'both'}}></div>
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
        const inlineCodeBg = hexToRgba(config.primaryColor, 0.1);
        const inlineCodeColor = config.primaryColor;

        return (
            <code 
              style={{ 
                  margin: '0 4px',
                  padding: '2px 4px',
                  borderRadius: '4px',
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

          const imageStyle = isGuobiTemplate
            ? {
                maxWidth: '100%',
                height: 'auto',
                display: 'block',
                margin: '8px auto',
                borderRadius: '12px',
                border: '1px solid rgb(250, 249, 245)',
                boxSizing: 'border-box' as const
              }
            : {
                maxWidth: '100%',
                height: 'auto',
                display: 'block',
                margin: '0 auto',
                borderRadius: '6px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
              };
          
          return (
              <section style={{display: 'block', margin: isGuobiTemplate ? '12px 0' : '1.5em 0', textAlign: 'center'}}>
                  <span style={{display: 'block', maxWidth: '100%', overflow: 'hidden', borderRadius: isGuobiTemplate ? '12px' : '6px'}}>
                    {/* 图片组件内部负责 data-id 与图片池映射 */}
                    <StableImage {...props} imagePool={imagePool} style={imageStyle} />
                  </span>
                  {caption && (
                      <span style={{display: 'block', marginTop: '0.6em', fontSize: '13px', color: '#888', lineHeight: '1.4'}}>
                          {caption}
                      </span>
                  )}
              </section>
          );
      },
      p: ({node, children, ...props}: any) => {
          const guobiParagraphStyle = isGuobiTemplate
            ? {
                color: '#646A73',
                lineHeight: '2',
                letterSpacing: '0.03em',
                margin: '12px 0',
                minHeight: '20px'
              }
            : {};

          return (
              <p 
                 style={{ 
                     ...commonTextStyle,
                     ...guobiParagraphStyle,
                     marginBottom: isGuobiTemplate ? undefined : '1.5em',
                     textIndent: config.indent ? '2em' : '0',
                     minHeight: isGuobiTemplate ? undefined : '1em', // 防止空段落塌陷导致节奏跳动
                     ...(props.style || {}) // 合并外部样式，保留块引用末段覆盖能力
                 }}
              >
                  {children}
              </p>
          );
      },
      h1: ({node, children}: any) => <h1 style={{...themeStyle.h1, fontSize: headingSizes.h1}}>{children}</h1>,
      h2: ({node, children}: any) => <h2 style={{...themeStyle.h2, fontSize: isGuobiTemplate ? ((themeStyle.h2 as any).fontSize || '16px') : headingSizes.h2}}>{children}</h2>,
      h3: ({node, children}: any) => <h3 style={{...themeStyle.h3, fontSize: isGuobiTemplate ? ((themeStyle.h3 as any).fontSize || '16px') : headingSizes.h3}}>{children}</h3>,
      blockquote: ({node, children}: any) => {
          // 扁平化 children，兼容 react-markdown 混合文本/元素输出
          const childrenArray = React.Children.toArray(children);
          const isGuobiCard = Boolean(
            (node as any)?.properties?.['data-guobi-card'] ||
            (node as any)?.data?.hProperties?.['data-guobi-card']
          );
          const guobiQuoteStyle = {
            margin: '1.2em 0',
            padding: '0.8em 1em',
            borderRadius: '10px',
            borderLeft: `4px solid ${hexToRgba(config.primaryColor, 0.35)}`,
            backgroundColor: 'rgba(250, 249, 245, 0.8)'
          };
          const blockquoteStyle = isGuobiTemplate
            ? (isGuobiCard ? { ...themeStyle.blockquote, ...commonTextStyle } : { ...guobiQuoteStyle, ...commonTextStyle })
            : { ...themeStyle.blockquote, ...commonTextStyle };
          
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
      ul: ({node, className, children}: any) => {
        // 检测 GFM 任务列表
        const isTaskList = className?.includes('contains-task-list');
        return (
            <ul style={{
                paddingLeft: isTaskList ? '0' : '1.5em', 
                marginBottom: isGuobiTemplate ? '12px' : '1.5em', 
                listStyleType: isTaskList ? 'none' : 'disc', 
                color: (themeStyle.list as any).color
            }}>
                {children}
            </ul>
        );
      },
      ol: ({node, children}: any) => <ol style={{paddingLeft: '1.5em', marginBottom: isGuobiTemplate ? '12px' : '1.5em', listStyleType: 'decimal', color: (themeStyle.list as any).color}}>{children}</ol>,
      li: ({node, className, children}: any) => {
         const isTaskList = className?.includes('task-list-item');
         return (
             <li style={{
                ...commonTextStyle, 
                marginBottom: isGuobiTemplate ? '0.5em' : '0.2em', 
                paddingLeft: isTaskList ? '0' : '0.2em',
                listStyleType: isTaskList ? 'none' : 'inherit',
                display: isTaskList ? 'flex' : 'list-item', // 任务列表用 flex 以对齐复选框
                alignItems: isTaskList ? 'flex-start' : undefined
             }}>
                {children}
             </li>
         );
      },
      a: ({node, href, children}: any) => {
        // 拦截 ruby: 链接，交给注音渲染组件
        if (href && href.startsWith('ruby:')) {
            const reading = href.replace('ruby:', '');
            const decodedReading = decodeURIComponent(reading);
            return <RubyRender baseText={children} reading={decodedReading} style={{ fontSize: 'inherit', color: 'inherit' }} />;
        }
        return <a href={href} style={themeStyle.link}>{children}</a>;
      },
      hr: ({node}: any) => <hr style={themeStyle.hr} />,
      
      table: ({node, children}: any) => (
         <section style={{overflowX: 'auto', margin: '1.5em 0', borderRadius: '4px', border: '1px solid #e5e7eb'}}>
            <table style={{minWidth: '100%', borderCollapse: 'collapse', fontSize: '14px', lineHeight: '1.5'}}>
              {children}
            </table>
         </section>
      ),
      thead: ({node, children}: any) => <thead style={{backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb'}}>{children}</thead>,
      tbody: ({node, children}: any) => <tbody>{children}</tbody>,
      tr: ({node, children}: any) => <tr style={{borderBottom: '1px solid #e5e7eb'}}>{children}</tr>,
      th: ({node, children}: any) => (
          <th style={{padding: '0.75em 1em', textAlign: 'left', fontWeight: 'bold', color: '#374151', borderRight: '1px solid #e5e7eb', whiteSpace: 'nowrap'}}>
            {children}
          </th>
      ),
      td: ({node, children}: any) => (
          <td style={{padding: '0.75em 1em', color: '#4b5563', borderRight: '1px solid #e5e7eb', verticalAlign: 'top'}}>
             {children}
          </td>
      )
  }), [config, themeStyle, imagePool, baseFontSize, lineHeightValue, headingSizes, commonTextStyle, codeThemeDef, isGuobiTemplate]);

  return (
    <div 
        ref={containerRef}
        onScroll={onScroll}
        className={`absolute inset-0 overflow-y-auto overflow-x-hidden ${visible ? 'z-10 visible' : 'z-0 invisible'} transition-colors duration-500 ${isDarkMode ? 'bg-[#1a1d23]' : 'bg-gray-100'}`}
    >
        <div className={`w-full min-h-full flex justify-center py-8 origin-center transition-all duration-300 ease-out delay-75 ${
            visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
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
                            <h1 style={{fontSize: '22px', fontWeight: 'bold', lineHeight: '1.4', color: '#333', marginBottom: '0.75em', letterSpacing: '0.025em'}}>
                                {headerInfo.title}
                            </h1>
                            <div style={{display: 'flex', alignItems: 'center', fontSize: '14px', color: 'rgba(0,0,0,0.4)', marginBottom: '1.5em'}}>
                                <span style={{marginRight: '10px'}}>原创</span>
                                <span style={{marginRight: '10px', color: '#576b95', fontWeight: '500'}}>{headerInfo.author}</span>
                                <span style={{marginRight: '10px', color: '#576b95'}}>{headerInfo.account}</span>
                                <span>{headerInfo.date}</span>
                            </div>
                        </div>

                        {/* 正文区域 */}
                        <div className="flex-1 px-4 pb-12 wechat-content">
                            <ReactMarkdown 
                                remarkPlugins={remarkPlugins}
                                rehypePlugins={[rehypeKatex]}
                                components={components}
                                // 允许 local:// 协议，供 StableImage 访问本地缓存图
                                urlTransform={(value) => value}
                            >
                                {processedMarkdown}
                            </ReactMarkdown>

                            {/* 脚注区域 */}
                            {config.linkReferences && footnotes.length > 0 && (
                                <div style={{marginTop: '3em', paddingTop: '1.5em', borderTop: '1px dashed #e5e7eb'}}>
                                    <h4 style={{fontSize: '14px', fontWeight: 'bold', color: '#374151', marginBottom: '0.75em'}}>引用链接</h4>
                                    <div style={{fontSize: '12px', color: '#6b7280'}}>
                                        {footnotes.map((fn, idx) => (
                                            <div key={idx} style={{marginBottom: '4px', display: 'flex', gap: '4px', wordBreak: 'break-all'}}>
                                                <span style={{flexShrink: 0, width: '1.5em', textAlign: 'center', opacity: 0.6}}>[{idx + 1}]</span>
                                                <span>{fn}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 底部互动区 */}
                        <div style={{padding: '24px 16px', fontSize: '14px', color: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f3f4f6', marginTop: 'auto', backgroundColor: '#fff'}}>
                           <div style={{display: 'flex', gap: '24px'}}>
                              <span style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                                <span style={{fontSize: '16px'}}>❤</span> 3
                              </span>
                              <span style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                                <span style={{fontSize: '16px'}}>★</span> 8
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
