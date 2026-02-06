import React, { useEffect, useMemo, useState } from 'react';
import { AiAction } from '../types';
import { processMarkdownWithAi } from '../services/geminiService';

export type TemplateApplyMode = 'replace' | 'insert' | 'append';

type TemplateKind = 'semantic' | 'event' | 'poem';

interface ContentTemplatePopoverProps {
  isDarkMode: boolean;
  sourceText: string;
  hasSelection: boolean;
  onApply: (result: string, mode: TemplateApplyMode) => void;
  onClose: () => void;
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
    return { right: lines[1], left: lines[0] };
  }

  const splitByPunctuation = trimmed
    .split(/[，。；;、]/)
    .map(part => part.trim())
    .filter(Boolean);

  if (splitByPunctuation.length >= 2) {
    return { right: splitByPunctuation[1], left: splitByPunctuation[0] };
  }

  return { right: trimmed, left: '' };
};

const buildVerticalPoem = (right: string, left: string, separator: string) => {
  const rightChars = Array.from(right.trim());
  const leftChars = Array.from(left.trim());
  const maxLen = Math.max(rightChars.length, leftChars.length);

  const pad = (chars: string[]) => {
    if (chars.length >= maxLen) return chars;
    return [...chars, ...Array.from({ length: maxLen - chars.length }, () => FULL_WIDTH_SPACE)];
  };

  const rightPadded = pad(rightChars);
  const leftPadded = pad(leftChars);

  const gap = separator === 'full' ? FULL_WIDTH_SPACE : '  ';

  const lines = Array.from({ length: maxLen }, (_, idx) => {
    const rightChar = rightPadded[idx] ?? FULL_WIDTH_SPACE;
    const leftChar = leftPadded[idx] ?? FULL_WIDTH_SPACE;
    return `${rightChar}${gap}${leftChar}  `;
  });

  return `:::center\n${lines.join('\n')}\n:::`;
};

export const ContentTemplatePopover: React.FC<ContentTemplatePopoverProps> = ({
  isDarkMode,
  sourceText,
  hasSelection,
  onApply,
  onClose,
}) => {
  const [activeTemplate, setActiveTemplate] = useState<TemplateKind>('semantic');
  const [applyMode, setApplyMode] = useState<TemplateApplyMode>('replace');
  const [output, setOutput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [poemRight, setPoemRight] = useState('');
  const [poemLeft, setPoemLeft] = useState('');
  const [poemSeparator, setPoemSeparator] = useState<'full' | 'half'>('full');

  useEffect(() => {
    setError(null);
    if (activeTemplate === 'poem') {
      const parsed = parsePoemSource(sourceText);
      setPoemRight(parsed.right);
      setPoemLeft(parsed.left);
      return;
    }
    setOutput('');
  }, [activeTemplate, sourceText]);

  const poemOutput = useMemo(() => {
    if (!poemRight.trim() && !poemLeft.trim()) return '';
    return buildVerticalPoem(poemRight, poemLeft, poemSeparator);
  }, [poemRight, poemLeft, poemSeparator]);

  const activeOutput = activeTemplate === 'poem' ? poemOutput : output;

  const handleGenerate = async () => {
    if (!sourceText.trim()) {
      setError('没有可处理的文本');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const action = activeTemplate === 'event' ? AiAction.EVENT_POSTER : AiAction.SEMANTIC_FORMAT;
      const result = await processMarkdownWithAi(sourceText, action);
      setOutput(result.trim());
    } catch (err) {
      console.error(err);
      setError('生成失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  const canApply = activeTemplate === 'poem'
    ? Boolean(poemOutput.trim())
    : Boolean(output.trim());

  return (
    <div className={`w-[360px] rounded-xl border shadow-xl overflow-hidden ${
      isDarkMode
        ? 'bg-[#1e2227] border-[#3e4451] text-[#d4cfbf]'
        : 'bg-white border-gray-200 text-gray-800'
    }`}>
      <div className={`flex items-center justify-between px-4 py-3 border-b ${
        isDarkMode ? 'border-[#3e4451]' : 'border-gray-100'
      }`}>
        <div>
          <div className="text-xs font-semibold tracking-wide">内容模板</div>
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

      <div className="px-4 pt-3">
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

      {activeTemplate === 'poem' ? (
          <div className="mt-4 space-y-3">
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
                placeholder="请输入第一句"
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
                placeholder="请输入第二句"
              />
            </div>
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
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <div className={`text-[10px] leading-relaxed ${isDarkMode ? 'text-[#9aa1ac]' : 'text-gray-400'}`}>
              不改写、不编造，只做结构整理。字段缺失时使用（待补充）。
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
          {activeOutput || '暂无预览'}
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
        <div className="flex items-center gap-1">
          {([
            { key: 'replace', label: '替换' },
            { key: 'insert', label: '插入' },
            { key: 'append', label: '追加' },
          ] as const).map(item => (
            <button
              key={item.key}
              type="button"
              onClick={() => setApplyMode(item.key)}
              className={`px-2 py-1 rounded text-[10px] font-semibold transition-colors ${
                applyMode === item.key
                  ? (isDarkMode ? 'bg-[#3e4451] text-[#e5c07b]' : 'bg-[#f4f2eb] text-[#8b7e74]')
                  : (isDarkMode ? 'text-[#9aa1ac] hover:bg-[#2c313a]' : 'text-gray-500 hover:bg-gray-100')
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => onApply(activeOutput, applyMode)}
          disabled={!canApply}
          className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
            canApply
              ? (isDarkMode
                ? 'bg-[#e5c07b] text-[#1e2227] hover:bg-[#d19a66]'
                : 'bg-[#997343] text-white hover:bg-[#85633e]')
              : 'bg-gray-300 text-white cursor-not-allowed'
          }`}
        >
          应用
        </button>
      </div>
    </div>
  );
};
