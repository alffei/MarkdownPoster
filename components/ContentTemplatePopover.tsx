/**
 * 模块说明：智能内容弹层组件，执行语义排版、活动模板和竖排诗转换。
 */

import React, { useEffect, useMemo, useState } from 'react';
import { AiAction } from '../types';
import { generateIllustrationWithAi, inferPoemMetaWithAi, processMarkdownWithAi } from '../services/geminiService';
import { EVENT_POSTER_TEMPLATE, ILLUSTRATION_STYLE_PROMPT } from '../config/aiTemplates';

export type TemplateApplyMode = 'replace' | 'insert' | 'append';
export type TemplateKind = 'semantic' | 'event' | 'poem' | 'illustration';
export interface TemplateApplyOptions {
  sourceTemplate: TemplateKind;
  poemAttribution?: string;
  illustrationDataUrl?: string;
  illustrationAlt?: string;
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
const ILLUSTRATION_RATIO_OPTIONS = ['4:3', '2:1', '16:9', '3:4', '1:2', '9:16', '1:1'] as const;
const DEV_MOCK_ILLUSTRATION_DATA_URL = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#f3e8d2" />
        <stop offset="100%" stop-color="#d6e6f5" />
      </linearGradient>
    </defs>
    <rect width="1200" height="900" fill="url(#bg)" />
    <rect x="120" y="120" width="960" height="660" rx="36" fill="#ffffff" opacity="0.78" />
    <circle cx="270" cy="280" r="90" fill="#997343" opacity="0.18" />
    <path d="M220 620c110-150 220-225 330-225s220 75 330 225" fill="none" stroke="#997343" stroke-width="18" stroke-linecap="round" opacity="0.75" />
    <text x="600" y="375" text-anchor="middle" font-size="92" font-family="Arial, sans-serif" fill="#6f4f2c">Mock Illustration</text>
    <text x="600" y="470" text-anchor="middle" font-size="42" font-family="Arial, sans-serif" fill="#8f8478">development only</text>
  </svg>`
)}`;

const getRatioShapeStyle = (ratio: string): React.CSSProperties => {
  const [wRaw, hRaw] = ratio.split(':');
  const widthRatio = Number(wRaw);
  const heightRatio = Number(hRaw);
  const w = Number.isFinite(widthRatio) && widthRatio > 0 ? widthRatio : 1;
  const h = Number.isFinite(heightRatio) && heightRatio > 0 ? heightRatio : 1;
  const maxSide = 24;

  if (w >= h) {
    return {
      width: `${maxSide}px`,
      height: `${Math.max(11, (maxSide * h) / w)}px`,
    };
  }
  return {
    width: `${Math.max(11, (maxSide * w) / h)}px`,
    height: `${maxSide}px`,
  };
};

const toReadableError = (prefix: string, error: unknown) => {
  const detail = error instanceof Error
    ? error.message
    : String(error ?? '');
  const normalized = detail.replace(/\s+/g, ' ').trim();
  if (!normalized) return `${prefix}，请稍后重试`;
  return `${prefix}：${normalized.length > 180 ? `${normalized.slice(0, 180)}...` : normalized}`;
};

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
  const [isIllustrationLoading, setIsIllustrationLoading] = useState(false);
  const [pendingConfirmMode, setPendingConfirmMode] = useState<TemplateApplyMode | null>(null);
  const [poemRight, setPoemRight] = useState('');
  const [poemLeft, setPoemLeft] = useState('');
  const [poemTitle, setPoemTitle] = useState('');
  const [poemAuthor, setPoemAuthor] = useState('');
  const [poemSeparator, setPoemSeparator] = useState<'full' | 'half'>('full');
  const [illustrationStylePrompt, setIllustrationStylePrompt] = useState(ILLUSTRATION_STYLE_PROMPT);
  const [illustrationContent, setIllustrationContent] = useState(sourceText.trim());
  const [illustrationRatio, setIllustrationRatio] = useState<(typeof ILLUSTRATION_RATIO_OPTIONS)[number]>('4:3');
  const [illustrationPreviewUrl, setIllustrationPreviewUrl] = useState('');
  const [isStylePromptExpanded, setIsStylePromptExpanded] = useState(false);
  const isDevMode = import.meta.env.DEV;

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
    if (effectiveTemplate === 'illustration') {
      setIllustrationContent(sourceText.trim());
      setIllustrationPreviewUrl('');
      setIsStylePromptExpanded(false);
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
    if (effectiveTemplate === 'illustration') {
      if (!illustrationStylePrompt.trim()) {
        setError('请填写风格提示词');
        return;
      }
      if (!illustrationContent.trim()) {
        setError('请填写内容描述');
        return;
      }

      setIsIllustrationLoading(true);
      setError(null);
      try {
        const imageResult = await generateIllustrationWithAi(
          illustrationStylePrompt,
          illustrationContent,
          illustrationRatio
        );
        setIllustrationPreviewUrl(imageResult.dataUrl);
      } catch (err) {
        console.error('插图生成失败', err);
        setError(toReadableError('插图生成失败', err));
      } finally {
        setIsIllustrationLoading(false);
      }
      return;
    }

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
      console.error('内容生成失败', err);
      setError(toReadableError('生成失败', err));
    } finally {
      setIsLoading(false);
    }
  };

  const canApply = effectiveTemplate === 'poem'
    ? Boolean(poemOutput.trim())
    : effectiveTemplate === 'illustration'
      ? Boolean(illustrationPreviewUrl)
      : Boolean(output.trim());

  const activeLabel =
    effectiveTemplate === 'semantic'
      ? '语义排版'
      : effectiveTemplate === 'event'
        ? '活动海报'
        : effectiveTemplate === 'poem'
          ? '竖排诗'
          : '插图生成';

  const templateHint =
    effectiveTemplate === 'event'
      ? '用预设的发布海报的格式，调整当前内容。'
      : effectiveTemplate === 'illustration'
        ? '输入风格提示词与内容描述，生成一张插图。'
        : '不改写、不编造，只做结构整理。字段缺失时使用（待补充）。';

  const contentTopSpacing = showTabs ? 'mt-4' : 'mt-0';
  const previewText = activeOutput || (effectiveTemplate === 'event' ? EVENT_POSTER_TEMPLATE : '暂无预览');

  const handleCopy = async () => {
    if (effectiveTemplate === 'illustration') return;
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
      setError(toReadableError('诗名/作者识别失败', err));
      return '';
    } finally {
      setIsPoemMetaLoading(false);
    }
  };

  const applyResult = (mode: TemplateApplyMode) => {
    if (effectiveTemplate === 'illustration') {
      if (!illustrationPreviewUrl) return;
      onApply('', 'insert', {
        sourceTemplate: effectiveTemplate,
        illustrationDataUrl: illustrationPreviewUrl,
        illustrationAlt: illustrationContent.trim(),
      });
      return;
    }

    if (
      effectiveTemplate === 'poem' &&
      (mode === 'insert' || mode === 'replace') &&
      !poemTitle.trim() &&
      !poemAuthor.trim()
    ) {
      // 竖排诗在无署名时二次确认，避免误覆盖后无法追溯出处。
      setPendingConfirmMode(mode);
      return;
    }
    onApply(activeOutput, mode, {
      sourceTemplate: effectiveTemplate,
      poemAttribution: effectiveTemplate === 'poem' ? poemAttribution.trim() : undefined,
    });
  };

  const handleApply = (mode: TemplateApplyMode) => {
    if (!canApply) return;
    if (effectiveTemplate === 'illustration') {
      applyResult('insert');
      return;
    }
    applyResult(mode);
  };

  const handleConfirmProceed = () => {
    if (!pendingConfirmMode) return;
    const mode = pendingConfirmMode;
    setPendingConfirmMode(null);
    onApply(activeOutput, mode, {
      sourceTemplate: effectiveTemplate,
      poemAttribution: effectiveTemplate === 'poem' ? poemAttribution.trim() : undefined,
    });
  };

  const preserveEditorFocus = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  return (
    <div className={`relative rounded-xl border shadow-xl overflow-hidden ${
      effectiveTemplate === 'illustration' ? 'w-[960px] max-h-[96vh] flex flex-col' : 'w-[560px]'
    } ${
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
            作用范围：{effectiveTemplate === 'illustration' ? (hasSelection ? '已选中内容' : '光标位置') : (hasSelection ? '已选中内容' : '全文')}
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

      <div className={effectiveTemplate === 'illustration' ? 'flex flex-col' : ''}>
        <div className={`${
          effectiveTemplate === 'illustration' ? 'px-6 pt-3' : 'px-4 pt-2'
        } ${
          effectiveTemplate === 'illustration'
            ? (isDarkMode ? 'border-b border-[#3e4451] pb-3' : 'border-b border-gray-100 pb-3')
            : ''
        }`}>
          {showTabs && (
            <div className="flex items-center gap-2">
              {[
                { key: 'semantic', label: '语义排版' },
                { key: 'event', label: '活动海报' },
                { key: 'poem', label: '竖排诗' },
                { key: 'illustration', label: '插图生成' },
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
          ) : effectiveTemplate === 'illustration' ? (
            <div className={`${contentTopSpacing}`}>
              <div className={`text-xs leading-relaxed ${isDarkMode ? 'text-[#9aa1ac]' : 'text-gray-500'}`}>
                {templateHint}
              </div>
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

        {effectiveTemplate === 'illustration' ? (
          <div className="px-6 py-4">
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)]">
              <div className="space-y-3 pb-2">
                <div className={`rounded-xl border p-3 ${
                  isDarkMode ? 'border-[#3e4451] bg-[#23272e]' : 'border-gray-200 bg-[#f8f6ef]'
                }`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className={`text-xs font-semibold ${isDarkMode ? 'text-[#d4cfbf]' : 'text-gray-700'}`}>
                      风格提示词模板
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsStylePromptExpanded(prev => !prev)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                        isDarkMode
                          ? 'bg-[#2f3540] text-[#e5c07b] hover:bg-[#3e4451]'
                          : 'bg-white text-[#8b7e74] border border-gray-200 hover:bg-[#f4f2eb]'
                      }`}
                    >
                      {isStylePromptExpanded ? '收起' : '展开编辑'}
                    </button>
                  </div>
                  {isStylePromptExpanded ? (
                    <textarea
                      value={illustrationStylePrompt}
                      onChange={(e) => setIllustrationStylePrompt(e.target.value)}
                      rows={7}
                      className={`mt-2 w-full rounded-md px-2.5 py-2 text-xs leading-relaxed border resize-y ${
                        isDarkMode
                          ? 'bg-[#1f242c] border-[#3e4451] text-[#d4cfbf]'
                          : 'bg-white border-gray-200 text-gray-700'
                      }`}
                      placeholder="输入插图风格提示词"
                    />
                  ) : (
                    <div className={`mt-2 rounded-md px-2.5 py-2 text-[11px] leading-relaxed ${
                      isDarkMode ? 'bg-[#1f242c] text-[#9aa1ac]' : 'bg-white text-gray-500 border border-gray-200'
                    }`}>
                      已启用默认风格模板。若要调整细节，可点击“展开编辑”。
                    </div>
                  )}
                </div>

                <div className={`rounded-xl border p-3 ${
                  isDarkMode ? 'border-[#3e4451] bg-[#23272e]' : 'border-gray-200 bg-[#f8f6ef]'
                }`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className={`text-xs font-semibold ${isDarkMode ? 'text-[#d4cfbf]' : 'text-gray-700'}`}>
                      内容描述（必填）
                    </div>
                    <div className={`text-[11px] ${isDarkMode ? 'text-[#9aa1ac]' : 'text-gray-400'}`}>
                      {illustrationContent.trim().length} 字
                    </div>
                  </div>
                  <textarea
                    value={illustrationContent}
                    onChange={(e) => setIllustrationContent(e.target.value)}
                    rows={8}
                    className={`mt-2 w-full rounded-md px-2.5 py-2 text-sm leading-relaxed border resize-y ${
                      isDarkMode
                        ? 'bg-[#1f242c] border-[#3e4451] text-[#d4cfbf]'
                        : 'bg-white border-gray-200 text-gray-700'
                    }`}
                    placeholder="若你在编辑器中已选中文字，这里会自动填入；也可手动补充描述，例如：一位科技演讲者在极简舞台演讲（非真实人物）"
                  />
                </div>

                <div className={`rounded-xl border p-3 ${
                  isDarkMode ? 'border-[#3e4451] bg-[#23272e]' : 'border-gray-200 bg-[#f8f6ef]'
                }`}>
                  <div className={`text-xs font-semibold mb-2 ${isDarkMode ? 'text-[#d4cfbf]' : 'text-gray-700'}`}>
                    画面比例
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
                    {ILLUSTRATION_RATIO_OPTIONS.map((ratio) => {
                      const active = illustrationRatio === ratio;
                      return (
                        <button
                          key={ratio}
                          type="button"
                          onClick={() => setIllustrationRatio(ratio)}
                          className={`group flex items-center justify-center gap-2 rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition-colors ${
                            active
                              ? (isDarkMode
                                ? 'border-[#e5c07b] bg-[#2f3540] text-[#e5c07b]'
                                : 'border-[#997343] bg-[#f4ede0] text-[#6f4f2c]')
                              : (isDarkMode
                                ? 'border-[#3e4451] text-[#9aa1ac] hover:bg-[#2c313a]'
                                : 'border-gray-200 text-gray-500 hover:bg-white')
                          }`}
                        >
                          <span
                            className={`inline-flex rounded-[4px] border transition-colors ${
                              active
                                ? (isDarkMode ? 'border-[#e5c07b] bg-[#3e4451]' : 'border-[#997343] bg-white')
                                : (isDarkMode ? 'border-[#616a78] bg-[#2c313a]' : 'border-gray-300 bg-[#f8f8f8]')
                            }`}
                            style={getRatioShapeStyle(ratio)}
                          />
                          <span>{ratio}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {error && (
                  <div className="text-xs text-red-500 leading-relaxed">
                    {error}
                  </div>
                )}
              </div>

              <div className="min-h-0 flex items-center justify-center overflow-hidden">
                <div
                  className={`relative h-full max-h-[520px] w-full max-w-[460px] rounded-xl border p-3 overflow-hidden ${
                    isDarkMode
                      ? 'bg-[#1f242c] border-[#3e4451]'
                      : 'border-gray-200'
                  }`}
                  style={isDarkMode
                    ? undefined
                    : {
                      backgroundColor: '#f6f1e4',
                      backgroundImage:
                        'linear-gradient(45deg, rgba(153,115,67,0.07) 25%, transparent 25%), linear-gradient(-45deg, rgba(153,115,67,0.07) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(153,115,67,0.07) 75%), linear-gradient(-45deg, transparent 75%, rgba(153,115,67,0.07) 75%)',
                      backgroundSize: '14px 14px',
                      backgroundPosition: '0 0, 0 7px, 7px -7px, -7px 0px',
                    }}
                >
                  {illustrationPreviewUrl ? (
                    <div className="h-full w-full p-2">
                      <div className={`relative h-full w-full rounded-lg overflow-hidden ${
                        isDarkMode ? 'bg-[#23272e]' : 'bg-[#fcfaf2]'
                      }`}>
                        <div className="h-full w-full flex items-center justify-center overflow-hidden">
                          <img
                            src={illustrationPreviewUrl}
                            alt="AI 生成插图预览"
                            className={`block w-auto h-auto max-h-full max-w-full object-contain rounded-lg shadow-sm transition-opacity ${
                              isIllustrationLoading ? 'opacity-45' : 'opacity-100'
                            }`}
                            style={{ objectFit: 'contain' }}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className={`h-full w-full rounded-lg border flex items-center justify-center text-sm transition-colors ${
                      isDarkMode
                        ? 'border-dashed border-[#3e4451] text-[#9aa1ac]'
                        : 'border-dashed border-[#d7cfbf] text-[#8f8478] bg-[#fbf8ef]'
                    } ${isIllustrationLoading ? 'animate-pulse' : ''}`}>
                      {isIllustrationLoading ? '正在准备预览画布...' : '生成后将在这里展示预览'}
                    </div>
                  )}
                  {isIllustrationLoading && (
                    <div
                      className={`absolute inset-3 rounded-lg flex flex-col items-center justify-center ${
                        isDarkMode ? 'bg-black/45 text-[#f4e8cf]' : 'bg-white/68 text-[#7c5b35]'
                      }`}
                    >
                      <svg
                        className="w-7 h-7 animate-spin"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="9" opacity="0.3" />
                        <path d="M21 12a9 9 0 0 0-9-9" />
                      </svg>
                      <div className="mt-2 text-xs font-semibold tracking-wide">
                        AI 正在生成插图...
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className={`mt-4 border-t pt-3 ${isDarkMode ? 'border-[#3e4451]' : 'border-gray-100'}`}>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isIllustrationLoading || !illustrationContent.trim()}
                  className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors md:min-w-[140px] ${
                    isIllustrationLoading || !illustrationContent.trim()
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : (isDarkMode
                        ? 'bg-[#e5c07b] text-[#1e2227] hover:bg-[#d19a66]'
                        : 'bg-[#997343] text-white hover:bg-[#85633e]')
                  }`}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 4 23 10 17 10" />
                    <polyline points="1 20 1 14 7 14" />
                    <path d="M3.51 9a9 9 0 0 1 14.13-3.36L23 10" />
                    <path d="M20.49 15a9 9 0 0 1-14.13 3.36L1 14" />
                  </svg>
                  {illustrationPreviewUrl
                    ? (isIllustrationLoading ? '生成中...' : '重新生成')
                    : (isIllustrationLoading ? '生成中...' : '生成插图')}
                </button>
                {isDevMode && (
                  <button
                    type="button"
                    onClick={() => setIllustrationPreviewUrl(DEV_MOCK_ILLUSTRATION_DATA_URL)}
                    className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors md:min-w-[140px] ${
                      isDarkMode
                        ? 'bg-[#2f3540] text-[#e5c07b] hover:bg-[#3e4451]'
                        : 'bg-white text-[#8b7e74] border border-gray-200 hover:bg-[#f4f2eb]'
                    }`}
                  >
                    模拟插图
                  </button>
                )}
                <div className={`text-xs text-center md:flex-1 ${isDarkMode ? 'text-[#9aa1ac]' : 'text-gray-500'}`}>
                  生成预览后可插入到当前光标位置
                </div>
                <button
                  type="button"
                  onMouseDown={preserveEditorFocus}
                  onClick={() => handleApply('insert')}
                  disabled={!canApply || isIllustrationLoading}
                  className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors md:min-w-[140px] ${
                    canApply && !isIllustrationLoading
                      ? (isDarkMode
                        ? 'bg-[#e5c07b] text-[#1e2227] hover:bg-[#d19a66]'
                        : 'bg-[#997343] text-white hover:bg-[#85633e]')
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 12h16" />
                    <path d="M10 6l-6 6 6 6" />
                  </svg>
                  插入到正文
                </button>
              </div>
            </div>
          </div>
        ) : (
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
        )}
      </div>

      {effectiveTemplate !== 'illustration' && (
      <div className={`flex items-center justify-between px-4 py-3 border-t ${isDarkMode ? 'border-[#3e4451]' : 'border-gray-100'}`}>
          <div
            className={`inline-flex items-center rounded-xl border px-2 py-1 gap-1 ${
              isDarkMode ? 'border-[#3e4451] bg-[#23272e]' : 'border-gray-200 bg-[#f7f7f7]'
            }`}
          >
            <button
              type="button"
              onMouseDown={preserveEditorFocus}
              onClick={() => handleApply('insert')}
              disabled={!canApply || isPoemMetaLoading || isIllustrationLoading}
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
              onMouseDown={preserveEditorFocus}
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
      )}

      {pendingConfirmMode && (
        <div
          className={`absolute inset-0 z-20 flex items-center justify-center p-4 ${
            isDarkMode ? 'bg-black/60' : 'bg-black/30'
          }`}
        >
          <div
            className={`w-full max-w-[360px] rounded-lg border p-4 shadow-xl ${
              isDarkMode
                ? 'bg-[#1f242c] border-[#3e4451] text-[#d4cfbf]'
                : 'bg-white border-gray-200 text-gray-800'
            }`}
          >
            <div className="text-sm font-semibold">确认继续操作？</div>
            <div className={`mt-2 text-xs leading-relaxed ${isDarkMode ? 'text-[#aab1bc]' : 'text-gray-600'}`}>
              当前诗名和作者都为空。继续后将按已填内容写入，署名可能为空。
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingConfirmMode(null)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold ${
                  isDarkMode ? 'bg-[#2c313a] hover:bg-[#3e4451]' : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmProceed}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold ${
                  isDarkMode ? 'bg-[#e5c07b] text-[#1e2227] hover:bg-[#d19a66]' : 'bg-[#997343] text-white hover:bg-[#85633e]'
                }`}
              >
                继续
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
