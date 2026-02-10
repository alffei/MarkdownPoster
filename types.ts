/**
 * 模块说明：全局类型定义中心，集中声明主题、视图模式与配置结构。
 */

// Themes and configurations are now loaded dynamically from YAML.
// We use string types instead of Enums to allow for easy extension without code changes.

import React from 'react';

export type BorderTheme = string;
export type LayoutTheme = string;
export type WritingTheme = string;
export type FontSize = string;
export type PaddingSize = string;
export type SpacingLevel = 'standard' | 'compact' | 'loose';

export enum WatermarkAlign {
  Left = 'text-left',
  Center = 'text-center',
  Right = 'text-right'
}

export enum ViewMode {
  Poster = 'Poster',
  Writing = 'Writing',
  WeChat = 'WeChat'
}

export interface ThemeColors {
  primary: string;
  secondary: string;
  assist: string;
}

export interface BorderStyleConfig {
  frame: string;      // The background style of the safety outer frame
  card: string;       // The inner container styling (border, shadow, radius)
  header?: string;    // Optional header styling (for window-like themes)
  content: string;    // The inner content background and text color
  prose: string;      // Typography prose settings (e.g. prose-invert)
  watermarkColor: string; // Color of the watermark text on the frame
  colors?: ThemeColors; // The semantic color system (Primary, Secondary, Assist)
}

export interface PosterTemplate {
  id: string;
  label: string;
  borderThemeId: BorderTheme;
  layoutThemeId: LayoutTheme;
  scenario: 'General' | 'LongText' | 'Tech' | 'Social';
  features: string[]; // e.g. ['TitleBar', 'Light', 'Retro', 'HighSat', 'Minimal', 'CustomColor']
  defaults: {
    fontSize: FontSize;
    padding: PaddingSize;
    spacing: SpacingLevel;
    customThemeColor?: string; // Optional default custom color
    watermark: {
      show: boolean;
      text?: string;
      align: WatermarkAlign;
    }
  }
}

// Deprecated: Kept for migration types if needed, but not used in UI
export enum WeChatTheme {
  Default = 'Default',
  Lovely = 'Lovely',
  Tech = 'Tech',
  Simple = 'Simple'
}

export interface WeChatConfig {
  layout: LayoutTheme;    // WeChat layouts id (e.g. Base/Classic/Vibrant)
  primaryColor: string;   // Hex color for the theme
  codeTheme: string;      // e.g., 'dracula', 'github', 'vsDark', 'vsLight'
  macCodeBlock: boolean;
  lineNumbers: boolean;
  linkReferences: boolean; // Convert external links to footnotes
  indent: boolean;        // 2em indent
  justify: boolean;       // text-align: justify
  captionType: 'title' | 'alt' | 'none';
  fontSize: FontSize;     // Now a string (Small, Medium, Large)
  lineHeight: 'compact' | 'comfortable'; // New line height setting
}

export interface WeChatStyleDef {
    h1: React.CSSProperties;
    h2: React.CSSProperties;
    h3: React.CSSProperties;
    list: React.CSSProperties;
    blockquote: React.CSSProperties;
    link: React.CSSProperties;
    hr: React.CSSProperties;
}

export enum AiAction {
  POLISH = 'Polish & Fix Grammar',
  SUMMARIZE = 'Summarize',
  EXPAND = 'Expand Text',
  TRANSLATE_EN = 'Translate to English',
  TRANSLATE_CN = 'Translate to Chinese',
  SEMANTIC_FORMAT = 'Semantic Formatting',
  EVENT_POSTER = 'Event Poster'
}
