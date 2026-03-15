/**
 * 模块说明：公众号导出 Hook，负责微信 HTML 复制链路。
 */

import { useState, RefObject } from 'react';
import { processAndCopyWeChatHtml, WeChatCopyResult } from '../utils/wechatUtils';

interface UseWeChatExportProps {
  weChatRef: RefObject<HTMLDivElement | null>;
}

export const useWeChatExport = ({ weChatRef }: UseWeChatExportProps) => {
  const [isCopyingWeChat, setIsCopyingWeChat] = useState(false);

  const handleCopyHtml = async (): Promise<WeChatCopyResult | null> => {
    // 复制流程串行化，避免并发点击导致剪贴板竞争。
    if (isCopyingWeChat || !weChatRef.current) return null;
    setIsCopyingWeChat(true);

    try {
        const result = await processAndCopyWeChatHtml(weChatRef.current);
        return result;
    } catch (e) {
        console.error("Copy HTML failed", e);
        // 错误对象统一标准化，保证上层 UI 能稳定展示失败原因。
        return {
            success: false,
            totalImages: 0,
            attemptedUploads: 0,
            uploadedImages: 0,
            failedImages: 0,
            passthroughImages: 0,
            errors: [(e as any).message || 'Unknown error']
        };
    } finally {
        setIsCopyingWeChat(false);
    }
  };

  return {
    isCopyingWeChat,
    handleCopyHtml
  };
};
