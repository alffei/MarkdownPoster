/**
 * 模块说明：图片工具函数集合，处理 URL、压缩与二进制转换等操作。
 */

// 处理跨域图片取数：必要时走代理，避免导出阶段被 CORS 污染
export const getCorsFriendlyUrl = (url?: string) => {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('local://')) return url;
  try {
    const urlObj = new URL(url);
    if (urlObj.origin === window.location.origin) return url;
    // 跨域图片通过代理转为可取资源，导出时可避免 CORS 污染。
    return `https://wsrv.nl/?url=${encodeURIComponent(url)}&output=png`;
  } catch {
    return url;
  }
};

// 数据 URI 转 Blob
export const dataURItoBlob = (dataURI: string) => {
  const byteString = atob(dataURI.split(',')[1]);
  const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mimeString });
};

// 根据 MIME 推断文件扩展名
export const getExtensionFromMime = (mime: string) => {
  switch(mime) {
    case 'image/jpeg': return 'jpg';
    case 'image/png': return 'png';
    case 'image/webp': return 'webp';
    case 'image/gif': return 'gif';
    case 'image/svg+xml': return 'svg';
    default: return 'png';
  }
};

// 图片池垃圾回收：仅保留 Markdown 仍在引用的图片
export const cleanImagePool = (pool: Record<string, string>, markdownContent: string, sourceLabel: string) => {
    // 1) 收集正文仍在引用的 local 图片 ID。
    const usedIds = new Set<string>();
    // 匹配形如 local://img_xxx 的本地图片引用
    const regex = /local:\/\/(img_[a-z0-9]+)/gi;
    let match;
    // 仅依据正文做保留判断，避免“池里残留”无限增长
    while ((match = regex.exec(markdownContent)) !== null) {
      usedIds.add(match[1]); // match[1] is the ID
    }

    // 2) 仅保留仍被引用的图片，清理孤儿资源。
    const cleanedPool: Record<string, string> = {};
    let removedCount = 0;
    const totalBefore = Object.keys(pool).length;

    Object.keys(pool).forEach(key => {
      if (usedIds.has(key)) {
        cleanedPool[key] = pool[key];
      } else {
        removedCount++;
      }
    });
    
    const remaining = Object.keys(cleanedPool).length;

    // 3) 打印清理统计，便于排查图片池泄漏。
    console.group(`🧹 Image GC [${sourceLabel}]`);
    console.log(`%cTotal Images: ${totalBefore}`, 'color: gray');
    console.log(`%cUsed Images:  ${remaining}`, 'color: green; font-weight: bold');
    if (removedCount > 0) {
        console.log(`%cCleaned Up:   ${removedCount} (Trash Removed)`, 'color: orange; font-weight: bold');
    } else {
        console.log(`%cCleaned Up:   0`, 'color: gray');
    }
    console.groupEnd();

    return { cleanedPool, removedCount };
};

// 图片压缩：统一为 WebP，控制宽度与体积
export const compressImage = (file: File, maxWidth = 1200, quality = 0.8): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        
        // 按最大宽度等比缩放，防止超大图导致导出体积过高。
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            reject(new Error("Canvas context error"));
            return;
        }
        
        // 先清空画布再绘制，避免透明 PNG 被白底污染。
        ctx.clearRect(0, 0, width, height);
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // 导出为 WebP，兼顾透明背景与体积压缩。
        const dataUrl = canvas.toDataURL('image/webp', quality);
        resolve(dataUrl);
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};
