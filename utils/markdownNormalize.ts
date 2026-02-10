/**
 * 模块说明：Markdown 归一化工具，修正规范化前的文本标记格式。
 */

const STRAIGHT_QUOTE_EMPHASIS_RE = /(\*{2,3})"([^"\n]+)"\1/g;
const CURLY_QUOTE_EMPHASIS_RE = /(\*{2,3})“([^”\n]+)”\1/g;

const normalizeQuotedEmphasisInText = (text: string) =>
  text
    .replace(STRAIGHT_QUOTE_EMPHASIS_RE, '"$1$2$1"')
    .replace(CURLY_QUOTE_EMPHASIS_RE, '“$1$2$1”');

const isFenceLine = (line: string) => /^\s*(```+|~~~+)/.exec(line);

export const normalizeQuotedEmphasis = (markdown: string) => {
  let inFence = false;
  let fenceMarker = '';

  const lines = markdown.split('\n');
  const out: string[] = [];

  for (const line of lines) {
    const fence = isFenceLine(line);

    if (!inFence && fence) {
      inFence = true;
      fenceMarker = fence[1];
      out.push(line);
      continue;
    }

    if (inFence && fence) {
      const marker = fence[1];
      const sameChar = marker[0] === fenceMarker[0];
      const longEnough = marker.length >= fenceMarker.length;
      if (sameChar && longEnough) {
        inFence = false;
        fenceMarker = '';
      }
      out.push(line);
      continue;
    }

    if (inFence) {
      out.push(line);
      continue;
    }

    out.push(normalizeQuotedEmphasisInText(line));
  }

  return out.join('\n');
};

