/**
 * 模块说明：公众号主题注册中心，负责加载并解析微信主题定义。
 */

import yaml from 'js-yaml';
import { WECHAT_THEME_CONFIG_YAML } from '../config/wechatConfig';
import { themes, PrismTheme } from 'prism-react-renderer';
import { hexToRgba } from './themeUtils';
import { WeChatStyleDef } from '../types';

interface WeChatLayoutDef {
  id: string;
  name: string;
  // 来自 YAML 的原始样式对象，仍包含占位符
  styles: Record<string, any>;
}

interface WeChatCodeThemeDef {
  label: string;
  value: string;
  isDark: boolean;
}

interface WeChatParsedConfig {
  colorPresets: { color: string; label: string }[];
  codeThemes: WeChatCodeThemeDef[];
  fontSizes: { label: string; value: string; pixel: string }[];
  lineHeights: { label: string; value: string; scale: string }[];
  captionTypes: { label: string; value: string }[];
  layouts: WeChatLayoutDef[];
}

class WeChatThemeRegistryClass {
  private config: WeChatParsedConfig;

  constructor() {
    try {
      this.config = yaml.load(WECHAT_THEME_CONFIG_YAML) as WeChatParsedConfig;
    } catch (e) {
      console.error("Failed to parse WeChat Theme YAML:", e);
      // 配置解析失败时回退到最小可用配置，保证编辑器仍可运行
      this.config = {
        colorPresets: [{ color: '#07c160', label: 'Default' }],
        codeThemes: [{ label: 'Dark', value: 'vsDark', isDark: true }],
        fontSizes: [{ label: 'Medium', value: 'Medium', pixel: '15px' }],
        lineHeights: [{ label: 'Comfortable', value: 'comfortable', scale: '1.75' }],
        captionTypes: [{ label: 'Title', value: 'title' }],
        layouts: []
      };
    }
  }

  // 读取配置项
  getColorPresets() { return this.config.colorPresets || []; }
  getCodeThemes() { return this.config.codeThemes || []; }
  getFontSizes() { return this.config.fontSizes || []; }
  getLineHeights() { return this.config.lineHeights || []; }
  getCaptionTypes() { return this.config.captionTypes || []; }
  getLayouts() { return this.config.layouts || []; }

  // 映射辅助：把枚举值转换为真实渲染值

  getFontSizePixel(value: string): string {
    const found = this.config.fontSizes?.find(f => f.value === value);
    return found ? found.pixel : '15px';
  }

  getLineHeightScale(value: string): string {
    const found = this.config.lineHeights?.find(l => l.value === value);
    return found ? found.scale : '1.75';
  }

  getCodeThemeDef(value: string) {
    const def = this.config.codeThemes?.find(t => t.value === value);
    // 把字符串主题 ID 映射到 prism 的主题对象
    const themeMap: Record<string, PrismTheme> = {
      vsDark: themes.vsDark,
      vsLight: themes.vsLight,
      dracula: themes.dracula,
      github: themes.github,
      nightOwl: themes.nightOwl,
      oceanicNext: themes.oceanicNext,
    };
    
    return {
      ...def,
      theme: themeMap[value] || themes.vsDark,
      isDark: def?.isDark ?? true
    };
  }

  // 样式生成：解析布局并替换主色占位符

  getLayoutStyles(layoutId: string, primaryColor: string): WeChatStyleDef {
    const layout = this.config.layouts?.find(l => l.id === layoutId);
    
    // 布局不存在时返回兜底样式，避免渲染时报 undefined
    const fallback: WeChatStyleDef = {
       h1: {}, h2: {}, h3: {}, list: {}, blockquote: {}, link: {}, hr: {}
    };

    if (!layout || !layout.styles) return fallback;

    // 深度替换样式树里的主色占位符
    const styles = this.interpolateStyles(layout.styles, primaryColor);
    
    return { ...fallback, ...styles };
  }

  private interpolateStyles(obj: any, primaryColor: string): any {
    if (typeof obj === 'string') {
        // {{primary}} => #RRGGBB
        // {{primary_0.5}} => rgba(...)
        return obj.replace(/{{primary(?:_([\d.]+))?}}/g, (_, alpha) => {
            if (alpha) {
                return hexToRgba(primaryColor, parseFloat(alpha));
            }
            return primaryColor;
        });
    }
    
    if (Array.isArray(obj)) {
        return obj.map(v => this.interpolateStyles(v, primaryColor));
    }

    if (typeof obj === 'object' && obj !== null) {
        const result: any = {};
        for (const key in obj) {
            result[key] = this.interpolateStyles(obj[key], primaryColor);
        }
        return result;
    }

    return obj;
  }
}

export const WeChatThemeRegistry = new WeChatThemeRegistryClass();
