
import { PosterTemplate, WatermarkAlign } from '../types';

export const POSTER_TEMPLATES: PosterTemplate[] = [
  // --- 4.1 Window/System Styles ---
  {
    id: 'tpl_macos_default',
    label: '清爽·Mac',
    borderThemeId: 'MacOS',
    layoutThemeId: 'Base',
    scenario: 'General',
    features: ['TitleBar', 'Light', 'Minimal'],
    defaults: { 
        fontSize: 'Medium', 
        padding: 'Medium', 
        spacing: 'standard', 
        watermark: { show: true, align: WatermarkAlign.Center } 
    }
  },
  {
    id: 'tpl_win11_clean',
    label: '简洁·Win',
    borderThemeId: 'Win11',
    layoutThemeId: 'Base',
    scenario: 'Tech',
    features: ['TitleBar', 'Light', 'Minimal'],
    defaults: { 
        fontSize: 'Medium', 
        padding: 'Medium', 
        spacing: 'compact', 
        watermark: { show: true, align: WatermarkAlign.Center } 
    }
  },

  // --- 4.2 Lightweight/Paper Styles ---
  {
    id: 'tpl_minimal_std',
    label: '极简·白',
    borderThemeId: 'Minimal',
    layoutThemeId: 'Classic',
    scenario: 'LongText',
    features: ['Light', 'Minimal'],
    defaults: { 
        fontSize: 'Medium', 
        padding: 'Medium', 
        spacing: 'standard', 
        watermark: { show: true, align: WatermarkAlign.Right } 
    }
  },
  {
    id: 'tpl_report_biz',
    label: '书卷·墨角',
    borderThemeId: 'Report',
    layoutThemeId: 'Classic',
    scenario: 'LongText',
    features: ['Light', 'Minimal', 'Retro'],
    defaults: { 
        fontSize: 'Medium', 
        padding: 'Medium', 
        spacing: 'compact', 
        watermark: { show: true, align: WatermarkAlign.Right } 
    }
  },
  {
    id: 'tpl_ink_zen',
    label: '国风·水墨',
    borderThemeId: 'Ink',
    layoutThemeId: 'Classic',
    scenario: 'LongText',
    features: ['Light', 'Retro'],
    defaults: { 
        fontSize: 'Medium', 
        padding: 'Medium', 
        spacing: 'loose', 
        watermark: { show: true, align: WatermarkAlign.Right } 
    }
  },
  {
    id: 'tpl_retro_news',
    label: '复古·报刊',
    borderThemeId: 'Retro',
    layoutThemeId: 'Classic',
    scenario: 'LongText',
    features: ['Light', 'Retro'],
    defaults: { 
        fontSize: 'Medium', 
        padding: 'Medium', 
        spacing: 'standard', 
        watermark: { show: true, align: WatermarkAlign.Right } 
    }
  },

  // --- 4.3 Social Styles ---
  {
    id: 'tpl_sunset_warm',
    label: '温暖·日落',
    borderThemeId: 'Sunset',
    layoutThemeId: 'Ribbon',
    scenario: 'Social',
    features: ['TitleBar', 'Light', 'HighSat'],
    defaults: { 
        fontSize: 'Medium', 
        padding: 'Medium', 
        spacing: 'loose', 
        watermark: { show: true, align: WatermarkAlign.Center } 
    }
  },
  {
    id: 'tpl_candy_sweet',
    label: '甜感·糖果',
    borderThemeId: 'Candy',
    layoutThemeId: 'Marker',
    scenario: 'Social',
    features: ['TitleBar', 'Light', 'HighSat'],
    defaults: { 
        fontSize: 'Medium', 
        padding: 'Medium', 
        spacing: 'loose', 
        watermark: { show: true, align: WatermarkAlign.Center } 
    }
  },

  // --- 4.4 Dark/Atmosphere Styles ---
  {
    id: 'tpl_glass_frosted',
    label: '清透·玻璃',
    borderThemeId: 'Glass',
    layoutThemeId: 'Ribbon',
    scenario: 'General',
    features: ['Light', 'Minimal', 'CustomColor'],
    defaults: { 
        fontSize: 'Medium', 
        padding: 'Medium', 
        spacing: 'standard', 
        customThemeColor: '#6366f1',
        watermark: { show: true, align: WatermarkAlign.Right } 
    }
  },
  {
    id: 'tpl_neon_cyber',
    label: '赛博·霓虹',
    borderThemeId: 'Neon',
    layoutThemeId: 'Marker',
    scenario: 'Tech',
    features: ['Dark', 'HighSat', 'CustomColor'],
    defaults: { 
        fontSize: 'Medium', 
        padding: 'Medium', 
        spacing: 'loose', 
        customThemeColor: '#ec4899',
        watermark: { show: true, align: WatermarkAlign.Right } 
    }
  },
  {
    id: 'tpl_aurora_deep',
    label: '深邃·极光',
    borderThemeId: 'Aurora',
    layoutThemeId: 'Ribbon',
    scenario: 'Social',
    features: ['Dark', 'CustomColor'],
    defaults: { 
        fontSize: 'Medium', 
        padding: 'Medium', 
        spacing: 'standard', 
        customThemeColor: '#6366f1',
        watermark: { show: true, align: WatermarkAlign.Right } 
    }
  },
  {
    id: 'tpl_radiance_flow',
    label: '流光·溢彩',
    borderThemeId: 'Radiance',
    layoutThemeId: 'Ribbon',
    scenario: 'Social',
    features: ['Dark', 'CustomColor'],
    defaults: { 
        fontSize: 'Medium', 
        padding: 'Medium', 
        spacing: 'loose', 
        customThemeColor: '#14b8a6',
        watermark: { show: true, align: WatermarkAlign.Right } 
    }
  }
];
