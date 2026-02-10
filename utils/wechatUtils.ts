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
                base64Data = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
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
