/**
 * 模块说明：主题注册中心，负责解析配置并提供查询与筛选接口。
 */

import yaml from 'js-yaml';
import { THEME_CONFIG_YAML } from '../config/themeConfig';
import { WRITING_THEMES, DEFAULT_WRITING_THEME_ID } from '../config/writingThemes';
import { POSTER_TEMPLATES } from '../config/posterTemplates';
import { BorderStyleConfig, WatermarkAlign, PosterTemplate } from '../types';

export interface ThemeDef extends BorderStyleConfig {
    id: string;
    name: string;
    // 缩略图预览使用的 Tailwind 类
    preview: string;
    // 暗色主题标记，用于自动调整对比度
    isDark?: boolean;
    // 顶部装饰预设键，如 macos/sunset
    customHeader?: string;
    // 角落装饰预设键
    customDecor?: string;
    // 是否允许用户改主色
    allowCustomColor?: boolean;
}

export interface WritingThemeDef {
    id: string;
    name: string;
    isDark: boolean;
    // 容器背景类
    className: string;
    // 正文排版类
    prose: string;
    // 主题缩略图样式
    preview: string;
}

export interface LayoutDef {
    id: string;
    name: string;
    className: string;
}

export interface FontSizeDef {
    id: string;
    label: string;
    className: string;
    icon: string;
}

export interface PaddingDef {
    id: string;
    label: string;
    className: string;
}

interface WatermarkConfig {
    show: boolean;
    text: string;
    align: WatermarkAlign;
}

interface Defaults {
    theme: string;
    layout: string;
    writingTheme: string;
    fontSize: string;
    padding: string;
    watermark: WatermarkConfig;
}

interface ParsedConfig {
    defaults: Defaults;
    borderThemes: ThemeDef[]; // Renamed from 'themes' in previous version
    layoutThemes: LayoutDef[];
    // 阅读主题不再从 YAML 加载
    fontSizes: FontSizeDef[];
    paddings: PaddingDef[];
    
    // 兼容旧 YAML 键名
    themes?: ThemeDef[]; 
}

class ThemeRegistryClass {
    private config: ParsedConfig;
    private themeMap: Record<string, ThemeDef>;
    private writingThemeMap: Record<string, WritingThemeDef>;
    private layoutMap: Record<string, LayoutDef>;
    private fontSizeMap: Record<string, FontSizeDef>;
    private paddingMap: Record<string, PaddingDef>;
    private templates: PosterTemplate[];

    constructor() {
        try {
            this.config = yaml.load(THEME_CONFIG_YAML) as ParsedConfig;
            
            // 兼容旧配置键名：早期版本使用 themes，新版本使用 borderThemes。
            const borderThemes = this.config.borderThemes || this.config.themes || [];

            this.themeMap = {};
            borderThemes.forEach(t => {
                this.themeMap[t.id] = t;
            });

            this.writingThemeMap = {};
            // 阅读主题独立维护在 TS 配置中，避免与海报主题耦合。
            WRITING_THEMES.forEach(t => {
                this.writingThemeMap[t.id] = t;
            });

            this.layoutMap = {};
            (this.config.layoutThemes || []).forEach(l => {
                this.layoutMap[l.id] = l;
            });

            this.fontSizeMap = {};
            (this.config.fontSizes || []).forEach(f => {
                this.fontSizeMap[f.id] = f;
            });

            this.paddingMap = {};
            (this.config.paddings || []).forEach(p => {
                this.paddingMap[p.id] = p;
            });

            // 海报模板作为独立配置源直接挂载。
            this.templates = POSTER_TEMPLATES;

        } catch (e) {
            console.error("Failed to parse Theme YAML:", e);
            // 解析失败时降级到最小可用默认值，保证应用仍能启动。
            this.config = {
                defaults: { 
                    theme: 'Minimal', 
                    layout: 'Base', 
                    writingTheme: DEFAULT_WRITING_THEME_ID,
                    fontSize: 'Medium', 
                    padding: 'Medium',
                    watermark: {
                        show: true,
                        text: '人人智学社 rrzxs.com',
                        align: WatermarkAlign.Right
                    }
                },
                borderThemes: [],
                layoutThemes: [],
                fontSizes: [],
                paddings: []
            };
            this.themeMap = {};
            this.writingThemeMap = {};
            this.layoutMap = {};
            this.fontSizeMap = {};
            this.paddingMap = {};
            this.templates = [];
        }
    }

    // 列表读取接口

    getBorderThemes(): ThemeDef[] {
        return this.config.borderThemes || this.config.themes || [];
    }

    getWritingThemes(): WritingThemeDef[] {
        return WRITING_THEMES;
    }

    getLayoutThemes(): LayoutDef[] {
        return this.config.layoutThemes || [];
    }

    getFontSizes(): FontSizeDef[] {
        return this.config.fontSizes || [];
    }

    getPaddings(): PaddingDef[] {
        return this.config.paddings || [];
    }

    getTemplates(): PosterTemplate[] {
        return this.templates;
    }

    // 单项读取接口

    getBorderTheme(id: string): ThemeDef | undefined {
        return this.themeMap[id];
    }
    
    getWritingTheme(id: string): WritingThemeDef | undefined {
        return this.writingThemeMap[id];
    }

    getLayoutTheme(id: string): LayoutDef | undefined {
        return this.layoutMap[id];
    }

    getFontSize(id: string): FontSizeDef | undefined {
        return this.fontSizeMap[id];
    }

    getPadding(id: string): PaddingDef | undefined {
        return this.paddingMap[id];
    }

    // --- Defaults ---

    getDefaults(): Defaults {
        const d = this.config.defaults;
        // 对嵌套字段做兜底，防止配置缺失触发运行时错误。
        return {
            theme: d?.theme || 'Minimal',
            layout: d?.layout || 'Base',
            writingTheme: d?.writingTheme || DEFAULT_WRITING_THEME_ID,
            fontSize: d?.fontSize || 'Medium',
            padding: d?.padding || 'Medium',
            watermark: {
                show: d?.watermark?.show ?? true,
                text: d?.watermark?.text ?? "人人智学社 rrzxs.com",
                align: (d?.watermark?.align as WatermarkAlign) || WatermarkAlign.Right
            }
        };
    }
}

export const ThemeRegistry = new ThemeRegistryClass();
