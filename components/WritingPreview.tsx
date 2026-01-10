
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkDirective from 'remark-directive';
import rehypeKatex from 'rehype-katex';
import { FontSize, WritingTheme } from '../types';
import { getFontSizeClass } from '../utils/themeUtils';
import { StableImage } from './StableImage';
import { remarkRuby, remarkCenter } from '../utils/markdownPlugins';
import { RubyRender } from './RubyRender';
import { ThemeRegistry } from '../utils/themeRegistry';
import { normalizeQuotedEmphasis } from '../utils/markdownNormalize';

interface WritingPreviewProps {
  markdown: string;
  fontSize: FontSize;
  imagePool: Record<string, string>;
  visible: boolean;
  isDarkMode: boolean; // Retained for fallback or chrome styling if needed
  writingTheme?: WritingTheme;
  containerRef?: React.RefObject<HTMLDivElement | null>;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
}

export const WritingPreview: React.FC<WritingPreviewProps> = ({
  markdown,
  fontSize,
  imagePool,
  visible,
  isDarkMode,
  writingTheme,
  containerRef,
  onScroll
}) => {
  const normalizedMarkdown = normalizeQuotedEmphasis(markdown);
  
  // Look up the selected theme definition
  const themeDef = writingTheme ? ThemeRegistry.getWritingTheme(writingTheme) : undefined;

  // Determine styles based on theme, fallback to legacy isDarkMode logic if theme not found
  const containerBgClass = themeDef?.className || (isDarkMode ? 'bg-[#1a1d23]' : 'bg-gray-100');
  
  const proseClass = themeDef?.prose || (isDarkMode 
    ? 'prose-invert prose-p:text-[#abb2bf] prose-headings:text-[#d4cfbf] prose-a:text-[#61afef] prose-strong:text-[#d19a66] prose-code:text-[#98c379] prose-ul:text-[#abb2bf] prose-ol:text-[#abb2bf] prose-li:text-[#abb2bf] prose-th:text-[#abb2bf] prose-td:text-[#abb2bf] prose-blockquote:text-[#abb2bf] [&_.katex]:text-[#abb2bf] [&_.katex-html]:text-[#abb2bf] [&_.katex-display]:text-[#abb2bf] prose-tr:border-[#3e4451] prose-thead:border-[#3e4451]' 
    : 'prose-slate text-gray-800 prose-headings:text-gray-900');

  return (
    <div 
        ref={containerRef}
        onScroll={onScroll}
        className={`absolute inset-0 overflow-y-auto overflow-x-hidden transition-colors duration-500 ${
            visible ? 'z-10 visible' : 'z-0 invisible'
        } ${containerBgClass}`}
    >
       {/* 
          Updated Layout:
          - w-[90%] md:w-[85%]: Takes up a proportional width of the container.
          - max-w-7xl: Allows expansion up to ~1280px (significantly larger than before).
          - mx-auto: Centers the content.
       */}
       <div className={`w-[90%] md:w-[85%] max-w-7xl mx-auto py-12 min-h-full origin-center transition-all duration-300 ease-out delay-75 ${
           visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
       }`}>
          <div className={`prose max-w-none ${proseClass} ${getFontSizeClass(fontSize)}`}>
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
                  }
                }}
              >
                {normalizedMarkdown}
              </ReactMarkdown>
          </div>
       </div>
    </div>
  );
};
