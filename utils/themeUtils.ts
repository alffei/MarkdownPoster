/**
 * 模块说明：主题工具函数集合，处理样式映射、颜色计算与类名生成。
 */

import React from 'react';
import { FontSize, LayoutTheme, PaddingSize, ThemeColors } from '../types';
import { ThemeRegistry, ThemeDef } from './themeRegistry';

// 判断主题是否为暗色基调（用于阅读模式对比度）
export const isThemeDark = (themeId: string) => {
    const theme = ThemeRegistry.getBorderTheme(themeId);
    return theme?.isDark || false;
};

// 十六进制颜色转 HSL：便于做渐变与亮度运算
function hexToHSL(hex: string) {
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
      r = parseInt("0x" + hex[1] + hex[1]);
      g = parseInt("0x" + hex[2] + hex[2]);
      b = parseInt("0x" + hex[3] + hex[3]);
    } else if (hex.length === 7) {
      r = parseInt("0x" + hex[1] + hex[2]);
      g = parseInt("0x" + hex[3] + hex[4]);
      b = parseInt("0x" + hex[5] + hex[6]);
    }
    r /= 255; g /= 255; b /= 255;
    const cmin = Math.min(r,g,b), cmax = Math.max(r,g,b), delta = cmax - cmin;
    let h = 0, s = 0, l = 0;
  
    if (delta === 0) h = 0;
    else if (cmax === r) h = ((g - b) / delta) % 6;
    else if (cmax === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
  
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  
    l = (cmax + cmin) / 2;
    s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
    s = +(s * 100).toFixed(1);
    l = +(l * 100).toFixed(1);
  
    return { h, s, l };
}

// 十六进制颜色转 RGBA
export const hexToRgba = (hex: string, alpha: number) => {
    let c: any;
    if(/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)){
        c= hex.substring(1).split('');
        if(c.length== 3){
            c= [c[0], c[0], c[1], c[1], c[2], c[2]];
        }
        c= '0x'+c.join('');
        return 'rgba('+[(c>>16)&255, (c>>8)&255, c&255].join(',')+','+alpha+')';
    }
    return hex; // 兜底返回原值
}

// 主题样式计算：支持用户主色覆盖与多层渐变派生
export const getThemeStyles = (
    themeName: string,
    customColor?: string
): ThemeDef & {
    frameStyle?: React.CSSProperties,
    cardStyle?: React.CSSProperties,
    colors?: ThemeColors,
    watermarkStyle?: React.CSSProperties
} => {
    const theme = ThemeRegistry.getBorderTheme(themeName);
    const baseTheme = theme || ThemeRegistry.getBorderTheme(ThemeRegistry.getDefaults().theme)!;
    
    // 主题未提供颜色时使用兜底色，保证样式计算链不断裂。
    let finalColors: ThemeColors = baseTheme.colors || {
        primary: '#3b82f6',
        secondary: '#111827',
        assist: '#9ca3af'
    };

    const shouldApplyCustomColor = Boolean(customColor) && Boolean(baseTheme.allowCustomColor);

    if (shouldApplyCustomColor && customColor) {
        const { h, s, l } = hexToHSL(customColor);
        
        // 自定义色逻辑：primary 直接使用用户色，secondary/assist 通过色相偏移生成。
        // 这样既保留主题层次，又不会把所有元素染成同一颜色。
        
        const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
        const baseS = clamp(s, 28, 62);
        const secondaryS = clamp(baseS, 26, 56);
        const assistS = clamp(baseS * 0.55, 14, 34);

        // 次级色控制在中等明度，辅助色提亮为更柔和层次。
        const secondaryL = clamp(l, 38, 56);
        const assistL = clamp(l + 28, 76, 92);

        finalColors = {
            primary: customColor,
            secondary: `hsl(${(h + 32) % 360}, ${secondaryS}%, ${secondaryL}%)`,
            assist: `hsl(${(h - 32 + 360) % 360}, ${assistS}%, ${assistL}%)`
        };

        // 极光主题：深色多层渐变，强调氛围和纵深。
        if (themeName === 'Aurora') {
            const sat = 90; 
            const layer1 = `radial-gradient(circle at 0% 0%, hsl(${(h + 40) % 360}, ${sat}%, 45%) 0%, transparent 50%)`;
            const layer2 = `radial-gradient(circle at 100% 100%, hsl(${h}, ${sat}%, 30%) 0%, transparent 60%)`;
            const layer3 = `linear-gradient(135deg, hsl(${h}, ${sat}%, 10%), hsl(${(h - 30 + 360) % 360}, ${sat}%, 5%))`;

            return {
                ...baseTheme,
                colors: finalColors,
                frameStyle: { 
                    backgroundImage: `${layer1}, ${layer2}, ${layer3}`,
                    backgroundSize: '100% 100%'
                }
            };
        }
        
        // 流光主题：高亮虹彩渐变，强调流动光感。
        if (themeName === 'Radiance') {
            const sat = 85; 
            const mainL = 60; 
            
            const layer1 = `radial-gradient(circle at 100% 0%, hsl(${(h - 45 + 360) % 360}, ${sat}%, ${mainL + 10}%) 0%, transparent 50%)`;
            const layer2 = `radial-gradient(circle at 0% 100%, hsl(${(h + 45) % 360}, ${sat}%, ${mainL + 10}%) 0%, transparent 50%)`;
            const layer3 = `linear-gradient(120deg, hsl(${h}, ${sat}%, ${mainL - 5}%) 0%, hsl(${h}, ${sat}%, ${mainL - 15}%) 100%)`;

            return {
                ...baseTheme,
                colors: finalColors,
                frameStyle: { 
                    backgroundImage: `${layer1}, ${layer2}, ${layer3}`,
                    backgroundSize: '100% 100%'
                }
            };
        }

        // 玻璃主题：保留玻璃底层结构，仅替换主色与边框色。
        if (themeName === 'Glass') {
            const lightL = 96;
            const darkL = 92;
            const layer1 = `linear-gradient(135deg, hsl(${h}, ${s}%, ${lightL}%) 0%, hsl(${h}, ${s}%, ${darkL}%) 100%)`;
            
            return {
                ...baseTheme,
                colors: finalColors,
                frameStyle: {
                    background: layer1
                },
                cardStyle: {
                    borderColor: `hsla(${h}, ${s}%, 50%, 0.3)`
                }
            }
        }

        // 霓虹主题：在原有风格上叠加用户主色。
        if (themeName === 'Neon') {
            const neonS = 90;
            const neonL = 60; 
            const neonColor = `hsl(${h}, ${neonS}%, ${neonL}%)`;
            const glowColor = `hsla(${h}, ${neonS}%, ${neonL}%, 0.5)`;

            return {
                ...baseTheme,
                colors: finalColors,
                cardStyle: {
                    borderColor: neonColor,
                    boxShadow: `0 0 30px ${glowColor}`
                },
                watermarkColor: 'opacity-80',
                watermarkStyle: {
                    color: neonColor,
                    textShadow: `0 0 10px ${glowColor}`
                }
            }
        }
    }

    return { ...baseTheme, colors: finalColors };
};

// 海报模式字号映射（Tailwind 类）
export const getFontSizeClass = (sizeId: FontSize) => {
    const def = ThemeRegistry.getFontSize(sizeId);
    return def ? def.className : 'prose-base';
};

// 海报模式文字风格映射
export const getLayoutClass = (layoutId: LayoutTheme) => {
    const def = ThemeRegistry.getLayoutTheme(layoutId);
    return def ? def.className : 'font-sans';
};

// 海报模式边距映射
export const getFramePaddingClass = (paddingId: PaddingSize) => {
    const def = ThemeRegistry.getPadding(paddingId);
    return def ? def.className : 'p-6 sm:p-10';
};

// --- WeChat Mode Helpers ---
export const getWeChatFontSize = (size: FontSize): string => {
    switch (size) {
        case 'Small': return '14px';
        case 'Large': return '16px';
        case 'Medium': default: return '15px';
    }
};

export const getWeChatLineHeight = (lineHeightType: string): string => {
    switch (lineHeightType) {
        case 'compact': return '1.5';     // Tighter (Standard Web)
        case 'comfortable': return '2.2'; // Much looser (Aesthetic/Blog style)
        default: return '1.75';
    }
};
