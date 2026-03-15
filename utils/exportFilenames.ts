/**
 * 模块说明：统一生成导出文件名，优先使用 Markdown 标题并追加时间戳。
 */

const FALLBACK_EXPORT_TITLE = '未命名';

const sanitizeFileSegment = (value: string) => {
  return value
    .replace(/^#+\s*/, '')
    .replace(/[\\/:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);
};

const extractMarkdownTitle = (markdown: string) => {
  const headingMatch = markdown.match(/^\s*#\s+(.+)\s*$/m);
  if (headingMatch?.[1]) {
    return sanitizeFileSegment(headingMatch[1]) || FALLBACK_EXPORT_TITLE;
  }

  const firstMeaningfulLine = markdown
    .split(/\r?\n/)
    .map(line => line.trim())
    .find(Boolean);

  if (!firstMeaningfulLine) return FALLBACK_EXPORT_TITLE;
  return sanitizeFileSegment(firstMeaningfulLine) || FALLBACK_EXPORT_TITLE;
};

const pad = (value: number) => String(value).padStart(2, '0');

const buildTimestamp = (date = new Date()) => {
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate())
  ].join('') + '_' + [
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds())
  ].join('');
};

export const buildExportFilename = (markdown: string, extension: string, date = new Date()) => {
  const title = extractMarkdownTitle(markdown);
  const suffix = extension.startsWith('.') ? extension : `.${extension}`;
  return `${title}_${buildTimestamp(date)}${suffix}`;
};
