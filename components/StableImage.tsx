/**
 * 模块说明：稳定图片组件，处理加载失败重试与回退展示。
 */

import React, { useState, useEffect } from 'react';
import { getCorsFriendlyUrl } from '../utils/imageUtils';

type ImageAlign = 'left' | 'center' | 'right';

type ImageDisplay = {
  widthPercent: number;
  align: ImageAlign;
};

interface StableImageProps {
  src?: string | any;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  imagePool: Record<string, string>;
  node?: any;
  imageKey?: string;
  imageDisplay?: ImageDisplay;
  isSelected?: boolean;
  [key: string]: any;
}

export const StableImage: React.FC<StableImageProps> = ({
  src,
  alt,
  className,
  style,
  imagePool,
  node,
  imageKey,
  imageDisplay,
  isSelected = false,
  ...props
}) => {
  const [blobSrc, setBlobSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!src || typeof src !== 'string') return;

    let isMounted = true;
    setIsLoading(true);

    // 1. Handle Virtual File System (local://)
    if (src.startsWith('local://')) {
      const imgId = src.replace('local://', '');
      const localData = imagePool?.[imgId];
      
      if (localData) {
        if (isMounted) {
            setBlobSrc(localData);
            setIsLoading(false);
        }
      } else {
        console.warn(`Image ID ${imgId} not found in pool.`);
        if (isMounted) setIsLoading(false);
      }
      return; 
    }

    // 2. Handle External Images via Proxy
    const proxyUrl = getCorsFriendlyUrl(src);

    fetch(proxyUrl)
      .then(response => response.blob())
      .then(blob => {
        if (isMounted) {
          const objectUrl = URL.createObjectURL(blob);
          setBlobSrc(objectUrl);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error("Failed to load image blob", err);
        if (isMounted) {
          setBlobSrc(proxyUrl);
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
      if (blobSrc && blobSrc.startsWith('blob:')) {
        URL.revokeObjectURL(blobSrc);
      }
    };
  }, [src, imagePool]); 

  const alignStyle: React.CSSProperties = imageDisplay
    ? imageDisplay.align === 'left'
      ? { marginLeft: '0', marginRight: 'auto' }
      : imageDisplay.align === 'right'
        ? { marginLeft: 'auto', marginRight: '0' }
        : { marginLeft: 'auto', marginRight: 'auto' }
    : { marginLeft: 'auto', marginRight: 'auto' };

  const computedClassName = imageDisplay
    ? `max-w-full h-auto rounded-lg shadow-sm block object-contain transition-all cursor-pointer ${
        isSelected ? 'ring-2 ring-[#60a5fa] ring-offset-2' : ''
      }`
    : `w-full h-auto rounded-lg shadow-sm mx-auto block object-cover transition-all ${
        isSelected ? 'ring-2 ring-[#60a5fa] ring-offset-2' : ''
      }`;

  const computedStyle: React.CSSProperties = imageDisplay
    ? {
        maxWidth: '100%',
        width: `${imageDisplay.widthPercent}%`,
        height: 'auto',
        objectFit: 'contain',
        pointerEvents: 'auto',
        display: 'block',
        ...alignStyle,
        ...style,
      }
    : {
        maxWidth: '100%',
        height: 'auto',
        pointerEvents: 'auto',
        display: 'block',
        margin: '0 auto',
        ...style,
      };

  if (isLoading) {
    return (
      <span className="w-full h-48 bg-gray-100 animate-pulse rounded-lg flex items-center justify-center text-gray-300">
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
      </span>
    );
  }

  return (
    <img 
      src={blobSrc || ""} 
      alt={alt} 
      {...props} 
      data-mp-image-key={imageKey}
      draggable={false}
      className={className || computedClassName}
      style={computedStyle}
    />
  );
};
