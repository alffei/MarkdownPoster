/**
 * 模块说明：公众号导出工具集合，处理 HTML 转换与复制流程。
 */

import { uploadToImgbb } from '../services/imgbbService';

export interface WeChatCopyResult {
  success: boolean;
  totalImages: number;
  attemptedUploads: number;
  uploadedImages: number;
  failedImages: number;
  passthroughImages: number;
  errors: string[];
}

const waitForImageReady = (img: HTMLImageElement): Promise<void> => {
  if (img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const handleLoad = () => {
      cleanup();
      resolve();
    };
    const handleError = () => {
      cleanup();
      reject(new Error('Image failed to load'));
    };
    const timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error('Image load timed out'));
    }, 10000);

    const cleanup = () => {
      window.clearTimeout(timeoutId);
      img.removeEventListener('load', handleLoad);
      img.removeEventListener('error', handleError);
    };

    img.addEventListener('load', handleLoad, { once: true });
    img.addEventListener('error', handleError, { once: true });
  });
};

const imageElementToDataUrl = async (img: HTMLImageElement): Promise<string> => {
  await waitForImageReady(img);

  const width = img.naturalWidth;
  const height = img.naturalHeight;
  if (!width || !height) {
    throw new Error('Image size unavailable');
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas context unavailable');
  }

  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL('image/png');
};

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        resolve(result);
        return;
      }
      reject(new Error('Failed to read blob as data URL'));
    };
    reader.onerror = () => reject(new Error('Failed to read blob'));
    reader.readAsDataURL(blob);
  });

const imageUrlToDataUrl = async (src: string): Promise<string> => {
  if (src.startsWith('data:image')) return src;

  const response = await fetch(new URL(src, window.location.href).href);
  if (!response.ok) {
    throw new Error(`Failed to fetch image asset: ${response.status}`);
  }

  const blob = await response.blob();
  return blobToDataUrl(blob);
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

const readOriginalImageSrc = (img: HTMLImageElement | null | undefined): string => {
  if (!img) return '';
  return img.getAttribute('data-mp-original-src') || '';
};

const CSS_URL_PATTERN = /url\((['"]?)(.*?)\1\)/g;

type CssUrlReference = {
  raw: string;
  url: string;
};

const extractCssUrlReferences = (value: string): CssUrlReference[] => {
  const refs: CssUrlReference[] = [];
  if (!value || value === 'none') return refs;

  value.replace(CSS_URL_PATTERN, (raw, _quote, url) => {
    const trimmed = String(url || '').trim();
    if (trimmed) {
      refs.push({ raw, url: trimmed });
    }
    return raw;
  });

  return refs;
};

type BackgroundAssetNode = {
  source: HTMLElement;
  clone: HTMLElement;
  backgroundImage: string;
  refs: CssUrlReference[];
};

const collectBackgroundAssetNodes = (sourceRoot: HTMLElement, exportRoot: HTMLElement): BackgroundAssetNode[] => {
  const sourceNodes = [sourceRoot, ...Array.from(sourceRoot.querySelectorAll<HTMLElement>('*'))];
  const exportNodes = [exportRoot, ...Array.from(exportRoot.querySelectorAll<HTMLElement>('*'))];
  const nodeCount = Math.min(sourceNodes.length, exportNodes.length);
  const assets: BackgroundAssetNode[] = [];

  for (let i = 0; i < nodeCount; i += 1) {
    const sourceNode = sourceNodes[i];
    const exportNode = exportNodes[i];
    const backgroundImage = sourceNode.style.backgroundImage || exportNode.style.backgroundImage;
    const refs = extractCssUrlReferences(backgroundImage);
    if (refs.length === 0) continue;
    assets.push({
      source: sourceNode,
      clone: exportNode,
      backgroundImage,
      refs,
    });
  }

  return assets;
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
    const sourceImages = Array.from(contentNode.querySelectorAll('img'));
    const images = Array.from(clone.querySelectorAll('img'));
    const backgroundAssets = collectBackgroundAssetNodes(contentNode as HTMLElement, clone);
    const assetUploadCache = new Map<string, Promise<string>>();
    
    const errors: string[] = [];
    let attemptedUploads = 0;
    let uploadedImages = 0;
    let failedCount = 0;
    let passthroughImages = 0;

    const totalAssetCount = images.length + backgroundAssets.reduce((sum, asset) => sum + asset.refs.length, 0);

    if (totalAssetCount > 0) {
        console.log(`Processing ${totalAssetCount} visual assets for WeChat export...`);
    }

    // 并行处理图片上传：单张失败不打断整体导出。
    await Promise.all(images.map(async (img, index) => {
        const src = img.src;
        const sourceImg = sourceImages[index];
        const originalSrc = readOriginalImageSrc(sourceImg) || readOriginalImageSrc(img);
        try {
            let base64Data = '';
            const shouldUpload =
              originalSrc.startsWith('local://') ||
              src.startsWith('data:image') ||
              src.startsWith('blob:') ||
              shouldMirrorHttpImage(src);

            if (!shouldUpload) {
                passthroughImages++;
                return;
            }

            attemptedUploads++;

            // 场景 A：本地图片（data URI），直接上传。
            if (src.startsWith('data:image')) {
                base64Data = src;
            } 
            // 场景 B/C/D：local://、blob URL 或同源静态资源，直接读取页面上已经加载好的图片像素，
            // 避免 fetch(blob:...) 被 CSP 拦截。
            else if ((originalSrc.startsWith('local://') || src.startsWith('blob:') || shouldMirrorHttpImage(src)) && sourceImg) {
                base64Data = await imageElementToDataUrl(sourceImg);
            } else if (originalSrc.startsWith('local://') || src.startsWith('blob:') || shouldMirrorHttpImage(src)) {
                throw new Error('Source image element not found');
            }

            // 有可上传数据时才执行图床替换。
            if (base64Data) {
                const remoteUrl = await uploadToImgbb(base64Data);
                img.src = remoteUrl;
                uploadedImages++;
            }
        } catch (e: any) {
            console.error("Failed to process image for WeChat copy", e);
            failedCount++;
            errors.push(`第 ${index + 1} 张图片处理失败：${e.message || "Unknown upload error"}`);
            // 失败时保留原始 src，保证文本结构仍可复制。
        }
    }));

    // 处理样式背景图：例如公众号模板里的装饰底纹 background-image。
    await Promise.all(backgroundAssets.map(async (asset, assetIndex) => {
        try {
            let nextBackgroundImage = asset.clone.style.backgroundImage || asset.backgroundImage;

            for (const ref of asset.refs) {
                const shouldUpload =
                  ref.url.startsWith('data:image') ||
                  ref.url.startsWith('blob:') ||
                  shouldMirrorHttpImage(ref.url);

                if (!shouldUpload) {
                    passthroughImages++;
                    continue;
                }

                attemptedUploads++;

                const resolvedUrl = new URL(ref.url, window.location.href).href;
                let uploadPromise = assetUploadCache.get(resolvedUrl);
                if (!uploadPromise) {
                    uploadPromise = imageUrlToDataUrl(ref.url).then((dataUrl) => uploadToImgbb(dataUrl));
                    assetUploadCache.set(resolvedUrl, uploadPromise);
                }

                const remoteUrl = await uploadPromise;
                nextBackgroundImage = nextBackgroundImage.replace(ref.raw, `url("${remoteUrl}")`);
                uploadedImages++;
            }

            asset.clone.style.backgroundImage = nextBackgroundImage;
        } catch (e: any) {
            console.error('Failed to process background image for WeChat copy', e);
            failedCount++;
            errors.push(`第 ${images.length + assetIndex + 1} 个背景图处理失败：${e.message || 'Unknown upload error'}`);
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
        totalImages: totalAssetCount,
        attemptedUploads,
        uploadedImages,
        failedImages: failedCount,
        passthroughImages,
        errors
    };
};
