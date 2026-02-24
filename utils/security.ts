/**
 * 模块说明：前端安全辅助工具，集中处理 Markdown 链接协议白名单。
 */

const CONTROL_AND_WHITESPACE = /[\u0000-\u001f\u007f-\u009f\s]+/g;

const isSafeRelativeUrl = (value: string) => (
  value.startsWith('#')
  || value.startsWith('/')
  || value.startsWith('./')
  || value.startsWith('../')
  || value.startsWith('?')
);

const isSafeDataImage = (value: string) => /^data:image\/[a-z0-9.+-]+;base64,/i.test(value);

/**
 * ReactMarkdown URL 过滤器：
 * - 允许常规安全协议（http/https/mailto/tel）；
 * - 允许项目内部协议（local://、ruby:）；
 * - 拒绝 javascript:/vbscript: 等危险协议。
 */
export const safeMarkdownUrlTransform = (value: string, key?: string): string => {
  const raw = String(value || '').trim();
  if (!raw) return '';

  if (raw.startsWith('ruby:')) return raw;

  if (raw.startsWith('local://')) {
    return key === 'src' ? raw : '';
  }

  if (raw.startsWith('blob:')) {
    return key === 'src' ? raw : '';
  }

  if (raw.startsWith('data:')) {
    if (key !== 'src') return '';
    return isSafeDataImage(raw) ? raw : '';
  }

  const normalized = raw.replace(CONTROL_AND_WHITESPACE, '').toLowerCase();
  if (
    normalized.startsWith('javascript:')
    || normalized.startsWith('vbscript:')
    || normalized.startsWith('file:')
  ) {
    return '';
  }

  if (normalized.startsWith('//')) return '';

  if (isSafeRelativeUrl(raw)) return raw;

  try {
    const parsed = new URL(raw, window.location.origin);
    if (
      parsed.protocol === 'http:'
      || parsed.protocol === 'https:'
      || parsed.protocol === 'mailto:'
      || parsed.protocol === 'tel:'
    ) {
      return raw;
    }
    return '';
  } catch {
    return '';
  }
};

