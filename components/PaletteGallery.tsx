/**
 * 模块说明：调色板展示组件，用于开发阶段预览样式组合。
 */

import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkDirective from 'remark-directive';
import rehypeKatex from 'rehype-katex';
import { ThemeRegistry } from '../utils/themeRegistry';
import { getThemeStyles, getLayoutClass, getFontSizeClass, getFramePaddingClass } from '../utils/themeUtils';
import { HEADER_PRESETS } from '../config/headerPresets';
import { DECOR_PRESETS } from '../config/decorPresets';
import { LayoutTheme, PaddingSize } from '../types';
import { remarkRuby, remarkCenter } from '../utils/markdownPlugins';
import { RubyRender } from './RubyRender';
import { DEFAULT_MARKDOWN } from '../constants/defaultContent';

const layoutOrder: LayoutTheme[] = ['Base', 'Classic', 'Marker', 'Ribbon'];

export const PaletteGallery: React.FC = () => {
  const themes = ThemeRegistry.getBorderThemes();
  const layouts = ThemeRegistry.getLayoutThemes().filter(l => layoutOrder.includes(l.id));
  const fontSizeClass = getFontSizeClass('Medium');
  const paddingClass = getFramePaddingClass('Medium' as PaddingSize);
  const spacingClass = 'leading-normal';

  const cards = useMemo(() => {
    return themes.flatMap(theme => {
      const themeStyle = getThemeStyles(theme.id);
      const isDarkTheme = Boolean(themeStyle.isDark);
      const cssVariables = themeStyle.colors
        ? {
            '--mp-primary': themeStyle.colors.primary,
            '--mp-secondary': themeStyle.colors.secondary,
            '--mp-assist': themeStyle.colors.assist,
            '--mp-primary-text': isDarkTheme
              ? `color-mix(in srgb, ${themeStyle.colors.primary} 62%, white)`
              : themeStyle.colors.primary,
            '--mp-secondary-text': isDarkTheme
              ? `color-mix(in srgb, ${themeStyle.colors.secondary} 70%, white)`
              : themeStyle.colors.secondary,
          }
        : undefined;

        return layoutOrder.map(layoutId => {
          const layoutClass = getLayoutClass(layoutId);
          const layoutName = layouts.find(l => l.id === layoutId)?.name || layoutId;

          return {
            key: `${theme.id}-${layoutId}`,
            theme,
            layoutId,
            layoutName,
            themeStyle,
            cssVariables,
            layoutClass,
          };
        });
    });
  }, [themes, layouts]);

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800">
      <div className="max-w-[1600px] mx-auto px-6 py-10 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Poster 主题配色速览（BorderTheme × LayoutTheme）</h1>
          <p className="text-sm text-gray-600 mt-2">
            每个边框主题分别套用 Base / Classic / Marker / Ribbon 四种文字风格。固定：字号 Medium，边距 Medium，间距标准。
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4">
          {cards.map(card => (
            <div
              key={card.key}
              className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col"
            >
              <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between text-[11px] uppercase tracking-wide font-semibold text-gray-500">
                <span className="truncate">
                  {card.theme.name} <span className="text-gray-400 font-normal normal-case">({card.theme.id})</span>
                </span>
                <span className="text-gray-400">·</span>
                <span className="truncate">{card.layoutName}</span>
              </div>

              <div className="p-3">
                <div
                  className={`relative flex flex-col min-h-[220px] ${paddingClass} ${card.themeStyle.frame}`}
                  style={{ ...(card.themeStyle.frameStyle || {}), ...(card.cssVariables as React.CSSProperties) }}
                >
                  <div
                    className={`relative flex flex-col h-full ${card.themeStyle.card}`}
                    style={{ ...(card.themeStyle.cardStyle || {}) }}
                  >
                    {card.themeStyle.customHeader && HEADER_PRESETS[card.themeStyle.customHeader] && (
                      <div className={card.themeStyle.header}>
                        {HEADER_PRESETS[card.themeStyle.customHeader]}
                      </div>
                    )}

                    {card.themeStyle.customDecor && DECOR_PRESETS[card.themeStyle.customDecor] && (
                      <div className="pointer-events-none">{DECOR_PRESETS[card.themeStyle.customDecor]}</div>
                    )}

                    <div className={`flex-1 px-4 py-4 ${card.themeStyle.content} ${card.layoutClass}`}>
                      <div className={`prose max-w-none ${card.themeStyle.prose} ${fontSizeClass} ${spacingClass} max-h-80 overflow-auto pr-2`}>
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm, remarkMath, remarkDirective, remarkRuby, remarkCenter]}
                          rehypePlugins={[rehypeKatex]}
                          components={{
                            a: ({ node, href, children, ...props }) => {
                              if (href && href.startsWith('ruby:')) {
                                const reading = href.replace('ruby:', '');
                                const decodedReading = decodeURIComponent(reading);
                                return <RubyRender baseText={children} reading={decodedReading} {...props} />;
                              }
                              return <a href={href} {...props}>{children}</a>;
                            }
                          }}
                        >
                          {DEFAULT_MARKDOWN}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>

                  <div
                    className={`mt-3 text-center text-[10px] font-mono uppercase tracking-wide ${card.themeStyle.watermarkColor}`}
                    style={card.themeStyle.watermarkStyle}
                  >
                    {card.theme.name} ({card.theme.id}) · {card.layoutId}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
