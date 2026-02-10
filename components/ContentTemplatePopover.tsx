/**
 * 模块说明：智能内容弹层组件，执行语义排版、活动模板和竖排诗转换。
 */

import React, { useEffect, useMemo, useState } from 'react';
import { AiAction } from '../types';
import { inferPoemMetaWithAi, processMarkdownWithAi } from '../services/geminiService';
import { EVENT_POSTER_TEMPLATE } from '../config/aiTemplates';

export type TemplateApplyMode = 'replace' | 'insert' | 'append';
export type TemplateKind = 'semantic' | 'event' | 'poem';
export interface TemplateApplyOptions {
  sourceTemplate: TemplateKind;
  poemAttribution?: string;
}

interface ContentTemplatePopoverProps {
  isDarkMode: boolean;
  sourceText: string;
  hasSelection: boolean;
  initialTemplate?: TemplateKind;
  showTabs?: boolean;
  onApply: (result: string, mode: TemplateApplyMode, options?: TemplateApplyOptions) => void;
  onClose: () => void;
  onDragStart?: (event: React.MouseEvent<HTMLDivElement>) => void;
}

const FULL_WIDTH_SPACE = '　';

const parsePoemSource = (text: string) => {
  const trimmed = text.trim();
  if (!trimmed) {
    return { right: '', left: '' };
  }

  const lines = trimmed
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  if (lines.length >= 2) {
    // 多行输入时，约定“第一行->左列，第二行->右列”。
    return { right: lines[1], left: lines[0] };
  }

  const splitByPunctuation = trimmed
    .split(/[，。；;、]/)
    .map(part => part.trim())
    .filter(Boolean);

  if (splitByPunctuation.length >= 2) {
    // 单行输入按常见诗句标点切分，前半句左列、后半句右列。
    return { right: splitByPunctuation[1], left: splitByPunctuation[0] };
  }

  return { right: trimmed, left: '' };
};

const buildVerticalPoem = (right: string, left: string, separator: string) => {
  const rightChars = Array.from(right.trim());
  const leftChars = Array.from(left.trim());
  const maxLen = Math.max(rightChars.length, leftChars.length);

  const pad = (chars: string[]) => {
    // 按最长列补全全角空格，确保两列逐行对齐。
    if (chars.length >= maxLen) return chars;
    return [...chars, ...Array.from({ length: maxLen - chars.length }, () => FULL_WIDTH_SPACE)];
  };

  const rightPadded = pad(rightChars);
  const leftPadded = pad(leftChars);

  const gap = separator === 'full' ? FULL_WIDTH_SPACE : '  ';

  const lines = Array.from({ length: maxLen }, (_, idx) => {
    const rightChar = rightPadded[idx] ?? FULL_WIDTH_SPACE;
    const leftChar = leftPadded[idx] ?? FULL_WIDTH_SPACE;
    // 每行末尾补两个半角空格，保证 Markdown 强制换行。
    return `${rightChar}${gap}${leftChar}  `;
  });

  return `:::center\n${lines.join('\n')}\n:::`;
};

const normalizePoemTitle = (title: string) => {
  const trimmed = title.trim().replace(/\s+/g, ' ');
  if (!trimmed || trimmed.includes('·')) return trimmed;

  const punctNormalized = trimmed.replace(/\s*[：:／/|｜\-—–]\s*/, '·');
  if (punctNormalized !== trimmed) return punctNormalized;

  if (trimmed.includes(' ')) {
    return trimmed.replace(' ', '·');
  }
  return trimmed;
};

export const ContentTemplatePopover: React.FC<ContentTemplatePopoverProps> = ({
  isDarkMode,
  sourceText,
  hasSelection,
  initialTemplate,
  showTabs = true,
  onApply,
  onClose,
  onDragStart,
}) => {
  const [activeTemplate, setActiveTemplate] = useState<TemplateKind>(initialTemplate ?? 'semantic');
  const [output, setOutput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<'idle' | 'ok' | 'err'>('idle');
  const [isPoemMetaLoading, setIsPoemMetaLoading] = useState(false);
  const [poemRight, setPoemRight] = useState('');
  const [poemLeft, setPoemLeft] = useState('');
  const [poemTitle, setPoemTitle] = useState('');
  const [poemAuthor, setPoemAuthor] = useState('');
  const [poemSeparator, setPoemSeparator] = useState<'full' | 'half'>('full');

  const effectiveTemplate: TemplateKind = showTabs ? activeTemplate : (initialTemplate ?? activeTemplate);

  useEffect(() => {
    setError(null);
    if (effectiveTemplate === 'poem') {
      // 切到竖排诗时，用当前文本自动预填左右列，减少手工输入。
      const parsed = parsePoemSource(sourceText);
      setPoemRight(parsed.right);
      setPoemLeft(parsed.left);
      return;
    }
    setOutput('');
  }, [effectiveTemplate, sourceText]);

  useEffect(() => {
    if (initialTemplate) {
      setActiveTemplate(initialTemplate);
    }
  }, [initialTemplate]);

  const poemOutput = useMemo(() => {
    if (!poemRight.trim() && !poemLeft.trim()) return '';
    return buildVerticalPoem(poemRight, poemLeft, poemSeparator);
  }, [poemRight, poemLeft, poemSeparator]);
  const poemAttribution = useMemo(() => {
    const title = normalizePoemTitle(poemTitle);
    const author = poemAuthor.trim();
    if (title && author) return `${title} - ${author}`;
    return title || author || '';
  }, [poemTitle, poemAuthor]);

  const activeOutput = effectiveTemplate === 'poem' ? poemOutput : output;

  const handleGenerate = async () => {
    if (!sourceText.trim()) {
      setError('没有可处理的文本');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 语义排版与活动海报共用统一 AI 接口，只切换 action 模板。
      const action = effectiveTemplate === 'event' ? AiAction.EVENT_POSTER : AiAction.SEMANTIC_FORMAT;
      const result = await processMarkdownWithAi(sourceText, action);
      setOutput(result.trim());
    } catch (err) {
      console.error(err);
      setError('生成失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  const canApply = effectiveTemplate === 'poem'
    ? Boolean(poemOutput.trim())
    : Boolean(output.trim());

  const activeLabel =
    effectiveTemplate === 'semantic'
      ? '语义排版'
      : effectiveTemplate === 'event'
        ? '活动海报'
        : '竖排诗';

  const templateHint =
    effectiveTemplate === 'event'
      ? '用预设的发布海报的格式，调整当前内容。'
      : '不改写、不编造，只做结构整理。字段缺失时使用（待补充）。';

  const contentTopSpacing = showTabs ? 'mt-4' : 'mt-0';
  const previewText = activeOutput || (effectiveTemplate === 'event' ? EVENT_POSTER_TEMPLATE : '暂无预览');

  const handleCopy = async () => {
    if (!canApply) return;
    try {
      await navigator.clipboard.writeText(activeOutput);
      setCopyState('ok');
    } catch (e) {
      console.error(e);
      setCopyState('err');
    } finally {
      setTimeout(() => setCopyState('idle'), 1500);
    }
  };
  const resolvePoemAttribution = async () => {
    const poemCombined = [poemLeft.trim(), poemRight.trim()].filter(Boolean).join('，');
    if (!poemCombined) return '';

    setIsPoemMetaLoading(true);
    setError(null);
    try {
      // 识别结果仅回填标题/作者字段，不直接改动正文。
      const meta = await inferPoemMetaWithAi(poemCombined);
      if (meta.title) setPoemTitle(meta.title);
      if (meta.author) setPoemAuthor(meta.author);
      const normalizedTitle = normalizePoemTitle(meta.title || '');
      if (normalizedTitle && meta.author) return `${normalizedTitle} - ${meta.author}`;
      return normalizedTitle || meta.author || '';
    } catch (err) {
      console.error(err);
      setError('诗名/作者识别失败，可手动填写');
      return '';
    } finally {
      setIsPoemMetaLoading(false);
    }
  };

  const handleApply = (mode: TemplateApplyMode) => {
    if (!canApply) return;
    if (
      effectiveTemplate === 'poem' &&
      (mode === 'insert' || mode === 'replace') &&
      !poemTitle.trim() &&
      !poemAuthor.trim()
    ) {
      // 竖排诗在无署名时二次确认，避免误覆盖后无法追溯出处。
      const confirmed = window.confirm('诗名和作者都为空，是否继续插入/替换？');
      if (!confirmed) return;
    }
    onApply(activeOutput, mode, {
      sourceTemplate: effectiveTemplate,
      poemAttribution: effectiveTemplate === 'poem' ? poemAttribution.trim() : undefined,
    });
  };

  return (
    <div className={`w-[560px] rounded-xl border shadow-xl overflow-hidden ${
      isDarkMode
        ? 'bg-[#1e2227] border-[#3e4451] text-[#d4cfbf]'
        : 'bg-white border-gray-200 text-gray-800'
    }`}>
      <div
        className={`flex items-center justify-between px-4 py-3 border-b ${
        isDarkMode ? 'border-[#3e4451]' : 'border-gray-100'
      } ${onDragStart ? 'cursor-move' : ''}`}
        onMouseDown={onDragStart}
      >
        <div>
          <div className="text-base font-semibold tracking-wide">{activeLabel}</div>
          <div className={`text-[10px] mt-1 ${isDarkMode ? 'text-[#9aa1ac]' : 'text-gray-400'}`}>
            作用范围：{hasSelection ? '已选中内容' : '全文'}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className={`p-1 rounded-md transition-colors ${isDarkMode ? 'hover:bg-[#2c313a]' : 'hover:bg-gray-100'}`}
          title="关闭"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="px-4 pt-2">
        {showTabs && (
          <div className="flex items-center gap-2">
            {[
              { key: 'semantic', label: '语义排版' },
              { key: 'event', label: '活动海报' },
              { key: 'poem', label: '竖排诗' },
            ].map(item => (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveTemplate(item.key as TemplateKind)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                  activeTemplate === item.key
                    ? (isDarkMode ? 'bg-[#3e4451] text-[#e5c07b]' : 'bg-[#f4f2eb] text-[#8b7e74]')
                    : (isDarkMode ? 'text-[#9aa1ac] hover:bg-[#2c313a]' : 'text-gray-500 hover:bg-gray-100')
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}

      {effectiveTemplate === 'poem' ? (
          <div className={`${contentTopSpacing} space-y-3`}>
            <div>
              <div className={`text-[10px] font-semibold tracking-wide ${isDarkMode ? 'text-[#9aa1ac]' : 'text-gray-400'}`}>
                右侧列（第二句）
              </div>
              <input
                value={poemRight}
                onChange={(e) => setPoemRight(e.target.value)}
                className={`mt-1 w-full rounded-md px-2 py-1.5 text-xs border ${
                  isDarkMode
                    ? 'bg-[#23272e] border-[#3e4451] text-[#d4cfbf]'
                    : 'bg-white border-gray-200 text-gray-700'
                }`}
                placeholder="请输入第二句"
              />
            </div>
            <div>
              <div className={`text-[10px] font-semibold tracking-wide ${isDarkMode ? 'text-[#9aa1ac]' : 'text-gray-400'}`}>
                左侧列（第一句）
              </div>
              <input
                value={poemLeft}
                onChange={(e) => setPoemLeft(e.target.value)}
                className={`mt-1 w-full rounded-md px-2 py-1.5 text-xs border ${
                  isDarkMode
                    ? 'bg-[#23272e] border-[#3e4451] text-[#d4cfbf]'
                    : 'bg-white border-gray-200 text-gray-700'
                }`}
                placeholder="请输入第一句"
              />
            </div>
            <div>
              <div className={`text-[10px] font-semibold tracking-wide ${isDarkMode ? 'text-[#9aa1ac]' : 'text-gray-400'}`}>
                诗名 / 词名
              </div>
              <input
                value={poemTitle}
                onChange={(e) => setPoemTitle(e.target.value)}
                className={`mt-1 w-full rounded-md px-2 py-1.5 text-xs border ${
                  isDarkMode
                    ? 'bg-[#23272e] border-[#3e4451] text-[#d4cfbf]'
                    : 'bg-white border-gray-200 text-gray-700'
                }`}
                placeholder="宋词示例：玉春楼·春景"
              />
            </div>
            <div>
              <div className={`text-[10px] font-semibold tracking-wide ${isDarkMode ? 'text-[#9aa1ac]' : 'text-gray-400'}`}>
                作者
              </div>
              <input
                value={poemAuthor}
                onChange={(e) => setPoemAuthor(e.target.value)}
                className={`mt-1 w-full rounded-md px-2 py-1.5 text-xs border ${
                  isDarkMode
                    ? 'bg-[#23272e] border-[#3e4451] text-[#d4cfbf]'
                    : 'bg-white border-gray-200 text-gray-700'
                }`}
                placeholder="例如：宋祁"
              />
            </div>
            <button
              type="button"
              onClick={resolvePoemAttribution}
              disabled={isPoemMetaLoading || (!poemLeft.trim() && !poemRight.trim())}
              className={`w-full px-3 py-2 rounded-md text-xs font-semibold transition-colors ${
                isPoemMetaLoading
                  ? 'bg-gray-400 text-white cursor-wait'
                  : (isDarkMode
                    ? 'bg-[#2f3540] text-[#e5c07b] hover:bg-[#3e4451]'
                    : 'bg-[#f4f2eb] text-[#8b7e74] hover:bg-[#ede7da]')
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isPoemMetaLoading ? '识别中...' : '识别诗名与作者'}
            </button>
            <div className="flex items-center justify-between">
              <div className={`text-[10px] font-semibold tracking-wide ${isDarkMode ? 'text-[#9aa1ac]' : 'text-gray-400'}`}>
                列间空隙
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPoemSeparator('full')}
                  className={`px-2 py-1 rounded text-[10px] ${
                    poemSeparator === 'full'
                      ? (isDarkMode ? 'bg-[#3e4451] text-[#e5c07b]' : 'bg-[#f4f2eb] text-[#8b7e74]')
                      : (isDarkMode ? 'text-[#9aa1ac] hover:bg-[#2c313a]' : 'text-gray-500 hover:bg-gray-100')
                  }`}
                >
                  全角空格
                </button>
                <button
                  type="button"
                  onClick={() => setPoemSeparator('half')}
                  className={`px-2 py-1 rounded text-[10px] ${
                    poemSeparator === 'half'
                      ? (isDarkMode ? 'bg-[#3e4451] text-[#e5c07b]' : 'bg-[#f4f2eb] text-[#8b7e74]')
                      : (isDarkMode ? 'text-[#9aa1ac] hover:bg-[#2c313a]' : 'text-gray-500 hover:bg-gray-100')
                  }`}
                >
                  两个半角
                </button>
              </div>
            </div>
            {isPoemMetaLoading && (
              <div className={`text-[11px] ${isDarkMode ? 'text-[#e5c07b]' : 'text-[#8b7e74]'}`}>
                正在识别诗名与作者...
              </div>
            )}
          </div>
        ) : (
          <div className={`${contentTopSpacing} space-y-3`}>
            <div className={`text-[10px] leading-relaxed ${isDarkMode ? 'text-[#9aa1ac]' : 'text-gray-400'}`}>
              {templateHint}
            </div>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isLoading}
              className={`w-full px-3 py-2 rounded-md text-xs font-semibold transition-colors ${
                isLoading
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : (isDarkMode
                    ? 'bg-[#e5c07b] text-[#1e2227] hover:bg-[#d19a66]'
                    : 'bg-[#997343] text-white hover:bg-[#85633e]')
              }`}
            >
              {output ? (isLoading ? '生成中...' : '重新生成') : (isLoading ? '生成中...' : '生成内容')}
            </button>
          </div>
        )}
      </div>

      <div className="px-4 py-3">
        <div className={`text-[10px] font-semibold tracking-wide mb-2 ${isDarkMode ? 'text-[#9aa1ac]' : 'text-gray-400'}`}>
          预览
        </div>
        <div className={`rounded-md border p-2 text-[11px] leading-relaxed font-mono whitespace-pre overflow-auto max-h-[200px] ${
          isDarkMode
            ? 'bg-[#23272e] border-[#3e4451] text-[#d4cfbf]'
            : 'bg-[#fdfcf5] border-gray-200 text-gray-700'
        }`}>
          {previewText}
        </div>
        {error && (
          <div className="mt-2 text-[10px] text-red-500">
            {error}
          </div>
        )}
      </div>

      <div className={`flex items-center justify-between px-4 py-3 border-t ${
        isDarkMode ? 'border-[#3e4451]' : 'border-gray-100'
      }`}>
        <div
          className={`inline-flex items-center rounded-xl border px-2 py-1 gap-1 ${
            isDarkMode ? 'border-[#3e4451] bg-[#23272e]' : 'border-gray-200 bg-[#f7f7f7]'
          }`}
        >
          <button
            type="button"
            onClick={() => handleApply('insert')}
            disabled={!canApply || isPoemMetaLoading}
            className={`px-3 py-1.5 rounded-md text-sm font-semibold inline-flex items-center gap-1.5 ${
              canApply
                ? (isDarkMode ? 'hover:bg-[#2f3540]' : 'hover:bg-white')
                : 'opacity-40 cursor-not-allowed'
            }`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12h16" />
              <path d="M10 6l-6 6 6 6" />
            </svg>
            插入
          </button>
          <div className={`w-px h-5 ${isDarkMode ? 'bg-[#3e4451]' : 'bg-gray-300'}`} />
          <button
            type="button"
            onClick={() => handleApply('replace')}
            disabled={!canApply || isPoemMetaLoading}
            className={`px-3 py-1.5 rounded-md text-sm font-semibold inline-flex items-center gap-1.5 ${
              canApply
                ? (isDarkMode ? 'hover:bg-[#2f3540]' : 'hover:bg-white')
                : 'opacity-40 cursor-not-allowed'
            }`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 7h10" />
              <path d="M4 17h10" />
              <path d="M18 5v14" />
              <path d="M14 9l4-4 4 4" />
            </svg>
            替换
          </button>
          <div className={`w-px h-5 ${isDarkMode ? 'bg-[#3e4451]' : 'bg-gray-300'}`} />
          <button
            type="button"
            onClick={handleCopy}
            disabled={!canApply || isPoemMetaLoading}
            className={`px-3 py-1.5 rounded-md text-sm font-semibold inline-flex items-center gap-1.5 ${
              canApply
                ? (isDarkMode ? 'hover:bg-[#2f3540]' : 'hover:bg-white')
                : 'opacity-40 cursor-not-allowed'
            }`}
            title={copyState === 'ok' ? '已复制' : copyState === 'err' ? '复制失败' : '复制结果'}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="11" height="11" rx="2" ry="2" />
              <rect x="4" y="4" width="11" height="11" rx="2" ry="2" />
            </svg>
            {copyState === 'ok' ? '已复制' : copyState === 'err' ? '失败' : '复制'}
          </button>
        </div>
      </div>
    </div>
  );
};
