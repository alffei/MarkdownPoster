/**
 * 模块说明：公众号导出工具集合，处理 HTML 转换与复制流程。
 */

import { uploadToImgbb } from '../services/imgbbService';

export interface WeChatCopyResult {
  success: boolean;
  totalImages: number;
  failedImages: number;
  errors: string[];
}

const blobToDataUrl = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const shouldMirrorHttpImage = (src: string): boolean => {
  try {
    const url = new URL(src, window.location.href);
    // 只中转同源资源（例如 /wechat-assets/... 的修饰图），避免把所有外链图都重复上传。
    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      url.origin === window.location.origin
    );
  } catch {
    return false;
  }
};

const KATEX_STYLE_PROPS = [
  'display',
  'position',
  'top',
  'right',
  'bottom',
  'left',
  'float',
  'clear',
  'font-family',
  'font-size',
  'font-style',
  'font-weight',
  'line-height',
  'letter-spacing',
  'white-space',
  'text-align',
  'vertical-align',
  'word-spacing',
  'color',
  'background-color',
  'margin',
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',
  'padding',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'border',
  'border-top',
  'border-right',
  'border-bottom',
  'border-left',
  'width',
  'height',
  'min-width',
  'max-width',
  'min-height',
  'max-height',
  'overflow',
  'overflow-x',
  'overflow-y',
  'transform',
  'transform-origin',
] as const;

const inlineComputedStyles = (source: HTMLElement, target: HTMLElement, properties: readonly string[]) => {
  const computed = window.getComputedStyle(source);
  properties.forEach((prop) => {
    const value = computed.getPropertyValue(prop);
    if (value) {
      target.style.setProperty(prop, value);
    }
  });
};

const stabilizeKatexForWeChat = (sourceRoot: HTMLElement, exportRoot: HTMLElement) => {
  const sourceKatexNodes = Array.from(sourceRoot.querySelectorAll<HTMLElement>('.katex, .katex *'));
  const exportKatexNodes = Array.from(exportRoot.querySelectorAll<HTMLElement>('.katex, .katex *'));
  const nodeCount = Math.min(sourceKatexNodes.length, exportKatexNodes.length);

  for (let i = 0; i < nodeCount; i += 1) {
    inlineComputedStyles(sourceKatexNodes[i], exportKatexNodes[i], KATEX_STYLE_PROPS);
  }

  // 微信端无 KaTeX CSS 时会把 MathML 兜底文本露出来，这里显式隐藏。
  exportRoot.querySelectorAll<HTMLElement>('.katex-mathml').forEach((node) => {
    node.style.setProperty('display', 'none');
    node.style.setProperty('position', 'absolute');
    node.style.setProperty('width', '1px');
    node.style.setProperty('height', '1px');
    node.style.setProperty('margin', '-1px');
    node.style.setProperty('padding', '0');
    node.style.setProperty('overflow', 'hidden');
    node.style.setProperty('clip', 'rect(0, 0, 0, 0)');
    node.style.setProperty('white-space', 'nowrap');
    node.style.setProperty('border', '0');
  });
};

const stabilizeRubyForWeChat = (exportRoot: HTMLElement) => {
  const blockLevelTags = new Set(['P', 'LI', 'DIV', 'BLOCKQUOTE', 'TD', 'TH']);

  exportRoot.querySelectorAll<HTMLElement>('ruby').forEach((node) => {
    node.style.setProperty('display', 'inline');
    node.style.setProperty('white-space', 'nowrap');
    node.style.setProperty('line-height', node.style.lineHeight || '1.1');
    node.style.setProperty('text-align', 'left');
    node.style.setProperty('ruby-align', 'start');
    node.style.setProperty('ruby-position', 'over');

    // 公众号端在两端对齐时会把 ruby 内汉字撑开，含 ruby 的行改为左对齐。
    let parent = node.parentElement as HTMLElement | null;
    while (parent && parent !== exportRoot) {
      if (blockLevelTags.has(parent.tagName)) {
        parent.style.setProperty('text-align', 'left');
        break;
      }
      parent = parent.parentElement as HTMLElement | null;
    }
  });

  exportRoot.querySelectorAll<HTMLElement>('rb').forEach((node) => {
    node.style.setProperty('white-space', 'nowrap');
    node.style.setProperty('letter-spacing', '0');
  });

  exportRoot.querySelectorAll<HTMLElement>('rt').forEach((node) => {
    node.style.setProperty('font-size', node.style.fontSize || '0.6em');
    node.style.setProperty('line-height', '1');
    node.style.setProperty('white-space', 'nowrap');
    node.style.setProperty('letter-spacing', '0');
  });
};

const stabilizeCodeBlocksForWeChat = (exportRoot: HTMLElement) => {
  exportRoot.querySelectorAll<HTMLElement>('pre').forEach((preNode) => {
    const parent = preNode.parentElement as HTMLElement | null;
    if (!parent) return;

    const currentPadding = preNode.style.padding || '';
    if (currentPadding && currentPadding !== '0' && currentPadding !== '0px') return;

    const parentPadding = parent.style.padding || '';
    if (!parentPadding || parentPadding === '0' || parentPadding === '0px') return;

    // 微信端可能丢失外层 div 的 padding，把内边距合并到 pre，确保代码块留白存在。
    preNode.style.setProperty('padding', parentPadding);
    preNode.style.setProperty('box-sizing', 'border-box');
    parent.style.setProperty('padding', '0');
  });
};

const preprocessWeChatClone = (sourceContentNode: HTMLElement, cloneNode: HTMLElement) => {
  stabilizeKatexForWeChat(sourceContentNode, cloneNode);
  stabilizeRubyForWeChat(cloneNode);
  stabilizeCodeBlocksForWeChat(cloneNode);
};

/**
 * 公众号复制流程：
 * 1. 克隆预览 DOM，避免操作真实页面节点。
 * 2. 扫描 base64/blob 图片并上传到图床，替换为公网地址。
 * 3. 将最终 HTML + 纯文本写入系统剪贴板，兼容不同粘贴目标。
 */
export const processAndCopyWeChatHtml = async (container: HTMLElement): Promise<WeChatCopyResult> => {
    const contentNode = container.querySelector('.wechat-content');
    if (!contentNode) throw new Error("Content node not found");

    // 先克隆后处理，确保任何上传失败都不会影响当前预览状态。
    const clone = contentNode.cloneNode(true) as HTMLElement;
    preprocessWeChatClone(contentNode as HTMLElement, clone);

    // 收集所有图片节点，后续统一并行处理。
    const images = Array.from(clone.querySelectorAll('img'));
    
    const errors: string[] = [];
    let failedCount = 0;

    if (images.length > 0) {
        console.log(`Processing ${images.length} images for WeChat export...`);
    }

    // 并行处理图片上传：单张失败不打断整体导出。
    await Promise.all(images.map(async (img) => {
        const src = img.src;
        try {
            let base64Data = '';

            // 场景 A：本地图片（data URI），直接上传。
            if (src.startsWith('data:image')) {
                base64Data = src;
            } 
            // 场景 B：blob URL，先转回 base64 再上传。
            else if (src.startsWith('blob:')) {
                const response = await fetch(src);
                const blob = await response.blob();
                base64Data = await blobToDataUrl(blob);
            }
            // 场景 C：同源静态资源（例如春序主题的修饰图），也需要中转成公网地址。
            else if (shouldMirrorHttpImage(src)) {
                const response = await fetch(src);
                if (!response.ok) {
                    throw new Error(`Fetch static image failed: ${response.status}`);
                }
                const blob = await response.blob();
                base64Data = await blobToDataUrl(blob);
            }

            // 有可上传数据时才执行图床替换。
            if (base64Data) {
                const remoteUrl = await uploadToImgbb(base64Data);
                img.src = remoteUrl;
            }
        } catch (e: any) {
            console.error("Failed to process image for WeChat copy", e);
            failedCount++;
            errors.push(e.message || "Unknown upload error");
            // 失败时保留原始 src，保证文本结构仍可复制。
        }
    }));

    // 富文本用于公众号粘贴，纯文本作为兼容兜底。
    const htmlContent = clone.innerHTML;
    
    // 同时写入 text/html 与 text/plain，提升跨应用粘贴成功率。
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const textBlob = new Blob([clone.innerText || ''], { type: 'text/plain' });
    
    await navigator.clipboard.write([
        new ClipboardItem({
            'text/html': blob,
            'text/plain': textBlob
        })
    ]);

    return {
        success: failedCount === 0,
        totalImages: images.length,
        failedImages: failedCount,
        errors
    };
};
