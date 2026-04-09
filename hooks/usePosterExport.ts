/**
 * 模块说明：海报导出 Hook，处理截图、复制图片与相关异步状态。
 */

import React, { useState, RefObject } from 'react';
import { toPng, toBlob } from 'html-to-image';
import { cleanImagePool } from '../utils/imageUtils';
import { buildExportFilename } from '../utils/exportFilenames';

interface UsePosterExportProps {
  exportRef: RefObject<HTMLDivElement | null>;
  imagePool: Record<string, string>;
  setImagePool: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  markdown: string;
}

export const usePosterExport = ({ exportRef, imagePool, setImagePool, markdown }: UsePosterExportProps) => {
  const [isExporting, setIsExporting] = useState(false);

  const resolveCopyErrorMessage = (error: unknown) => {
    if (error instanceof Error && error.message.trim()) {
      return error.message.trim();
    }

    if (typeof error === 'object' && error && 'type' in error && error.type === 'error') {
      return '导出图片资源失败，请检查页面中的图片是否已加载完成。';
    }

    if (typeof navigator !== 'undefined' && !navigator.clipboard?.write) {
      return '当前浏览器不支持图片复制到剪贴板。';
    }

    return '复制图片失败，请刷新页面后重试。';
  };

  const preparePosterForExport = async () => {
    // 导出前先做图片池回收，减少无用内存并避免旧图被误打包。
    const { cleanedPool, removedCount } = cleanImagePool(imagePool, markdown, 'Pre-Export');
    if (removedCount > 0) {
      setImagePool(cleanedPool);
    }
    
    if (!exportRef.current) throw new Error("Export container not found");
    
    // 等待图片加载完成，避免生成结果出现空白占位图。
    await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 300)));
    const images = Array.from(exportRef.current.querySelectorAll('img')) as HTMLImageElement[];
    await Promise.all(images.map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
            img.onload = () => resolve(null);
            img.onerror = () => resolve(null);
        });
    }));
  };

  const handleDownloadPoster = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
        await preparePosterForExport();
        if (!exportRef.current) return;
        
        const dataUrl = await toPng(exportRef.current, { 
            pixelRatio: 2, 
            skipAutoScale: true, 
            cacheBust: false,
            fetchRequestInit: {
                cache: 'force-cache',
                credentials: 'omit', // 公网资源导出时尽量避免携带凭证，降低 CORS 风险。
            }
        });
        const link = document.createElement('a');
        link.download = buildExportFilename(markdown, '.png');
        link.href = dataUrl;
        link.click();
    } catch (e) {
        console.error("Download failed", e);
        alert("导出失败，请重试。");
    } finally {
        setIsExporting(false);
    }
  };

  const handleCopyPoster = async (): Promise<{success: boolean, message?: string}> => {
    if (isExporting) return { success: false, message: 'Processing' };
    setIsExporting(true);
    try {
        await preparePosterForExport();
        if (!exportRef.current) throw new Error("DOM missing");

        const blob = await toBlob(exportRef.current, { 
            pixelRatio: 2, 
            skipAutoScale: true, 
            cacheBust: false,
            fetchRequestInit: {
                cache: 'force-cache',
                credentials: 'omit', // 与下载保持一致，确保复制链路也稳定。
            }
        });
        if (!blob) throw new Error("Failed to generate image");

        await navigator.clipboard.write([
            new ClipboardItem({ [blob.type]: blob })
        ]);
        return { success: true };
    } catch (e: unknown) {
        console.error("Copy failed", e);
        return { success: false, message: resolveCopyErrorMessage(e) };
    } finally {
        setIsExporting(false);
    }
  };

  return {
    isExporting,
    handleDownloadPoster,
    handleCopyPoster
  };
};
