/**
 * 模块说明：Markdown 修复工具，自动补全常见语法闭环错误。
 */

export interface MarkdownRepairResult {
  output: string;
  changes: number;
}

const isFenceLine = (line: string) => /^\s*```/.test(line);

const isHorizontalRule = (line: string) => /^([-*_])(?:\s*\1){2,}\s*$/.test(line.trim());

const trimLineEndPreserveHardBreak = (line: string): { line: string; changed: boolean } => {
  const match = line.match(/[ \t]+$/);
  if (!match) return { line, changed: false };
  const trailing = match[0];
  const base = line.slice(0, -trailing.length);
  if (!base) return { line: '', changed: line !== '' };
  const onlySpaces = /^[ ]+$/.test(trailing);
  // 在 Markdown 中，行尾两个空格代表硬换行；清理空白时要保留这个语义。
  const keepHardBreak = onlySpaces && trailing.length >= 2;
  const next = base + (keepHardBreak ? '  ' : '');
  return { line: next, changed: next !== line };
};

const fixHeadingSpace = (line: string): { line: string; changed: boolean } => {
  const next = line.replace(/^(#{1,6})([^\s#])/, '$1 $2');
  return { line: next, changed: next !== line };
};

const fixQuoteSpace = (line: string): { line: string; changed: boolean } => {
  const next = line.replace(/^(>)([^\s>])/, '$1 $2');
  return { line: next, changed: next !== line };
};

const fixListSpace = (line: string): { line: string; changed: boolean } => {
  if (isHorizontalRule(line)) return { line, changed: false };
  const next = line.replace(/^(\s*[-+*]|^\s*[•·])([^\s])/, '$1 $2');
  return { line: next, changed: next !== line };
};

export const repairMarkdownBlock = (text: string): MarkdownRepairResult => {
  const endsWithNewline = text.endsWith('\n');
  const lines = text.split('\n');
  const output: string[] = [];
  let inFence = false;
  let blankRun = 0;
  let changes = 0;

  for (const originalLine of lines) {
    if (isFenceLine(originalLine)) {
      output.push(originalLine);
      // 代码块内不做文本修复，避免破坏代码原样。
      inFence = !inFence;
      blankRun = 0;
      continue;
    }

    if (inFence) {
      output.push(originalLine);
      continue;
    }

    let line = originalLine.replace(/\r$/, '');
    let changed = line !== originalLine;

    const headingFix = fixHeadingSpace(line);
    line = headingFix.line;
    changed = changed || headingFix.changed;

    const quoteFix = fixQuoteSpace(line);
    line = quoteFix.line;
    changed = changed || quoteFix.changed;

    const listFix = fixListSpace(line);
    line = listFix.line;
    changed = changed || listFix.changed;

    const trimmed = trimLineEndPreserveHardBreak(line);
    line = trimmed.line;
    changed = changed || trimmed.changed;

    if (line.trim() === '') {
      blankRun += 1;
      if (blankRun > 1) {
        // 连续空行压缩为一行，减少排版噪音。
        changes += 1;
        continue;
      }
      if (line !== '') {
        line = '';
        changed = true;
      }
    } else {
      blankRun = 0;
    }

    if (changed) changes += 1;
    output.push(line);
  }

  let outputText = output.join('\n');
  if (endsWithNewline && !outputText.endsWith('\n')) {
    outputText += '\n';
  }

  return { output: outputText, changes };
};
