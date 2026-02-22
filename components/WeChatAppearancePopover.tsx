/**
 * 模块说明：公众号外观弹层组件，采用"模板 + 微调"结构。
 * 布局参考海报配置画面样式。
 */

import React, { useRef } from 'react';
import {
  WeChatConfig,
  WeChatFontStyleKind,
  WeChatTemplateKind,
  WeChatTypographyStyleKind,
} from '../types';
import { WeChatThemeRegistry } from '../utils/wechatThemeRegistry';
import {
  WECHAT_FONT_STYLE_OPTIONS,
  WECHAT_TEMPLATE_OPTIONS,
  WECHAT_TYPOGRAPHY_STYLE_OPTIONS,
  getWeChatTemplateDefaultConfig,
} from '../config/wechatTemplates';

type BooleanConfigKey = 'macCodeBlock' | 'lineNumbers' | 'linkReferences' | 'indent' | 'justify';

interface WeChatAppearancePopoverProps {
  config: WeChatConfig;
  setConfig: (config: WeChatConfig) => void;
  isDarkMode: boolean;
  onClose: () => void;
}

const detailToggleItems: { label: string; key: BooleanConfigKey }[] = [
  { label: 'Mac 代码块', key: 'macCodeBlock' },
  { label: '代码块行号', key: 'lineNumbers' },
  { label: '微信外链转底部引用', key: 'linkReferences' }
];

const WeChatTemplateThumbnail: React.FC<{
  template: WeChatTemplateKind;
  label: string;
  isActive: boolean;
  isDarkMode: boolean;
}> = ({ template, label, isActive, isDarkMode }) => {
  const visualMap: Record<WeChatTemplateKind, {
    frameClass: string;
    cardClass: string;
    titleClass: string;
    accentColor: string;
    topBarClass: string;
    topLabel?: string;
  }> = {
    basic: {
      frameClass: isDarkMode ? 'bg-[#272c34]' : 'bg-gray-100',
      cardClass: isDarkMode ? 'bg-[#1f242c] border border-[#3e4451]' : 'bg-white border border-gray-200',
      titleClass: isDarkMode ? 'text-gray-200' : 'text-gray-800',
      accentColor: '#07c160',
      topBarClass: isDarkMode ? 'border-b border-[#3e4451]' : 'border-b border-gray-100',
    },
    guobi: {
      frameClass: 'bg-[#f0ece6]',
      cardClass: 'bg-[#f7f4ef] border border-[#dfd6ca]',
      titleClass: 'text-[#4e463d]',
      accentColor: '#D97757',
      topBarClass: 'border-b border-[#dfd6ca]',
      topLabel: 'GUOBI',
    },
    spring: {
      frameClass: 'bg-[#f2f8ea]',
      cardClass: 'bg-[#fbfef7] border border-[#d8e8c5]',
      titleClass: 'text-[#2f5f0f]',
      accentColor: '#417505',
      topBarClass: 'border-b border-[#d8e8c5]',
      topLabel: 'SPRING',
    },
  };
  const visual = visualMap[template];

  return (
    <div
      className={`w-full aspect-[4/3] rounded-xl relative flex flex-col items-center justify-center overflow-hidden transition-all duration-200 border-2 ${isActive
        ? (isDarkMode ? 'border-[#98c379] ring-2 ring-[#98c379]/25' : 'border-blue-500 ring-2 ring-blue-500/20')
        : (isDarkMode ? 'border-[#3e4451] group-hover:border-[#5c6370]' : 'border-gray-200 group-hover:border-blue-300')
        } ${visual.frameClass}`}
    >
      <div className={`w-[80%] h-[75%] rounded-lg overflow-hidden flex flex-col ${visual.cardClass}`}>
        <div className={`h-4 px-1.5 flex items-center ${visual.topBarClass}`}>
          {template === 'basic' ? (
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
            </div>
          ) : (
            <div className="w-full text-center text-[7px] tracking-[0.15em] text-[#7a6b5f]">{visual.topLabel}</div>
          )}
        </div>

        <div className="flex-1 p-1.5 flex flex-col items-center justify-center gap-1">
          <div className={`text-[10px] font-bold tracking-tight ${visual.titleClass}`}>{label}</div>
          <div className="w-full rounded-sm h-3.5 flex items-center px-1" style={{ backgroundColor: `${visual.accentColor}1A` }}>
            <div className="h-1.5 w-full rounded-sm" style={{ backgroundColor: visual.accentColor }} />
          </div>
          <div className={`w-full h-0.5 rounded-sm ${isDarkMode && template === 'basic' ? 'bg-[#3e4451]' : 'bg-black/10'}`} />
          <div className={`w-3/4 h-0.5 rounded-sm ${isDarkMode && template === 'basic' ? 'bg-[#3e4451]' : 'bg-black/10'}`} />
        </div>
      </div>
    </div>
  );
};

export const WeChatAppearancePopover: React.FC<WeChatAppearancePopoverProps> = ({
  config,
  setConfig,
  isDarkMode,
  onClose
}) => {
  const typographyStyles = WECHAT_TYPOGRAPHY_STYLE_OPTIONS;
  const fontStyles = WECHAT_FONT_STYLE_OPTIONS;
  const colors = WeChatThemeRegistry.getColorPresets();
  const fontSizes = WeChatThemeRegistry.getFontSizes();
  const lineHeights = WeChatThemeRegistry.getLineHeights();
  const codeThemes = WeChatThemeRegistry.getCodeThemes();
  const captionTypes = WeChatThemeRegistry.getCaptionTypes();

  const updateConfig = <K extends keyof WeChatConfig>(key: K, value: WeChatConfig[K]) => {
    setConfig({ ...config, [key]: value });
  };

  const snapshotKey = (
    template: WeChatTemplateKind,
    typographyStyle: WeChatTypographyStyleKind
  ) => (template === 'basic' ? `basic:${typographyStyle}` : `template:${template}`);

  // Per-template+style snapshots (各模板/排版风格独立缓存)
  const templateSnapshots = useRef<Record<string, WeChatConfig>>({});
  const lastBasicTypographyStyleRef = useRef<WeChatTypographyStyleKind>(config.typographyStyle);

  if (config.template === 'basic' && lastBasicTypographyStyleRef.current !== config.typographyStyle) {
    lastBasicTypographyStyleRef.current = config.typographyStyle;
  }

  const applyTemplate = (template: WeChatTemplateKind) => {
    templateSnapshots.current[snapshotKey(config.template, config.typographyStyle)] = { ...config };
    if (config.template === 'basic') {
      lastBasicTypographyStyleRef.current = config.typographyStyle;
    }

    const targetTypographyStyle: WeChatTypographyStyleKind = template === 'basic'
      ? (config.template === 'basic' ? config.typographyStyle : lastBasicTypographyStyleRef.current)
      : 'standard';
    const key = snapshotKey(template, targetTypographyStyle);
    const saved = templateSnapshots.current[key];
    if (saved) {
      setConfig({
        ...saved,
        template,
        typographyStyle: targetTypographyStyle,
      });
      return;
    }

    setConfig(getWeChatTemplateDefaultConfig(template, targetTypographyStyle));
  };

  const applyTypographyStyle = (style: WeChatTypographyStyleKind) => {
    if (config.template !== 'basic') return;
    templateSnapshots.current[snapshotKey(config.template, config.typographyStyle)] = { ...config };
    lastBasicTypographyStyleRef.current = style;

    const key = snapshotKey('basic', style);
    const saved = templateSnapshots.current[key];
    if (saved) {
      setConfig({
        ...saved,
        template: 'basic',
        typographyStyle: style,
      });
    } else {
      setConfig(getWeChatTemplateDefaultConfig('basic', style));
    }
  };

  const toggleConfig = (key: BooleanConfigKey) => {
    updateConfig(key, !Boolean(config[key]) as WeChatConfig[BooleanConfigKey]);
  };

  // Shared style tokens
  const rowClass = 'flex items-center justify-between py-2';
  const rowLabelClass = 'text-xs font-medium opacity-75 shrink-0';
  const segmentLabelClass = `text-xs font-medium mb-3 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`;
  const dividerClass = `border-t my-3 ${isDarkMode ? 'border-[#3e4451]' : 'border-gray-100'}`;
  const rightControlWidthClass = 'ml-2 w-[198px]';

  const SegGroup = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
      <div className={segmentLabelClass}>{label}</div>
      {children}
    </div>
  );

  const SegRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className={rowClass}>
      <span className={rowLabelClass}>{label}</span>
      {children}
    </div>
  );

  const SegmentedControl = ({
    options,
    value,
    onChange,
    className = ''
  }: {
    options: { label: string; value: string }[];
    value: string;
    onChange: (v: string) => void;
    className?: string;
  }) => (
    <div className={`flex rounded-lg border p-0.5 ${isDarkMode ? 'bg-[#21252b] border-[#181a1f]' : 'bg-gray-100 border-gray-200'} ${className}`}>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`flex-1 py-0.5 px-2 text-[11px] font-medium rounded-md transition-all whitespace-nowrap ${value === opt.value
            ? (isDarkMode ? 'bg-[#3e4451] text-white shadow-sm' : 'bg-white text-gray-900 shadow-sm')
            : 'opacity-55 hover:opacity-80'
            }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );

  const Toggle = ({ label, keyName }: { label?: string; keyName: BooleanConfigKey }) => (
    <div className={rowClass}>
      {label && <span className={rowLabelClass}>{label}</span>}
      <button
        onClick={() => toggleConfig(keyName)}
        className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors duration-300 focus:outline-none ml-auto ${config[keyName]
          ? (isDarkMode ? 'bg-[#98c379]' : 'bg-green-500')
          : (isDarkMode ? 'bg-[#3e4451]' : 'bg-gray-300')
          }`}
      >
        <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ease-in-out ${config[keyName] ? 'translate-x-4' : 'translate-x-0'}`} />
      </button>
    </div>
  );


  return (
    <div
      style={{ width: 'min(680px, calc(100vw - 16px))' }}
      className={`absolute top-full right-0 mt-2 rounded-2xl shadow-2xl border flex flex-col z-50 animate-in fade-in zoom-in-95 origin-top-right duration-200 select-none overflow-hidden
      ${isDarkMode
          ? 'bg-[#21252b] border-[#181a1f] text-gray-200 shadow-black/50'
          : 'bg-white border-gray-200 text-gray-800 shadow-gray-300/40'
        }`}
    >
      {/* Header */}
      <div className={`flex justify-between items-center px-5 py-3.5 border-b ${isDarkMode ? 'border-[#3e4451]' : 'border-gray-100'}`}>
        <h3 className="text-sm font-bold opacity-90">公众号排版配置</h3>
        <button onClick={onClose} className="opacity-40 hover:opacity-80 transition-opacity">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="overflow-y-auto max-h-[82vh] custom-scrollbar">
        <div className="p-5 space-y-5">

          {/* ── 主题风格（模板）── */}
          <section>
            <div className={`text-[11px] font-semibold uppercase tracking-wider mb-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-400'}`}>
              主题风格（模板）
            </div>
            <div className="flex gap-3">
              {WECHAT_TEMPLATE_OPTIONS.map((item) => {
                const active = config.template === item.value;
                return (
                  <button
                    key={item.value}
                    onClick={() => applyTemplate(item.value)}
                    title={item.summary}
                    className={`group relative w-32 shrink-0 text-left transition-all duration-200 ${active ? 'scale-[1.02]' : 'hover:scale-[1.02]'}`}
                  >
                    <WeChatTemplateThumbnail template={item.value} label={item.label} isActive={active} isDarkMode={isDarkMode} />
                  </button>
                );
              })}
            </div>
          </section>

          {/* ── 微调 section header ── */}
          <div className={`flex items-center justify-between border-t pt-4 ${isDarkMode ? 'border-[#3e4451]' : 'border-gray-100'}`}>
            <span className={`text-sm font-bold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>微调</span>
            <svg className={`w-4 h-4 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </div>

          {/* ── 微调 two-column ── */}
          <div className="flex gap-0">

            {/* Left: 文字 */}
            <div className="flex-1 pr-5">
              <SegGroup label="文字">
                {config.template === 'basic' && (
                  <SegRow label="排版风格">
                    <SegmentedControl
                      options={typographyStyles.map((item) => ({ label: item.label, value: item.value }))}
                      value={config.typographyStyle}
                      onChange={(v) => applyTypographyStyle(v as WeChatTypographyStyleKind)}
                      className="ml-2"
                    />
                  </SegRow>
                )}

                <SegRow label="字体风格">
                  <SegmentedControl
                    options={fontStyles.map((item) => ({ label: item.label, value: item.value }))}
                    value={config.fontStyle}
                    onChange={(v) => updateConfig('fontStyle', v as WeChatFontStyleKind)}
                    className="ml-2"
                  />
                </SegRow>

                <SegRow label="正文字号">
                  <SegmentedControl
                    options={fontSizes.map((f) => ({ label: f.label, value: f.value }))}
                    value={config.fontSize}
                    onChange={(v) => updateConfig('fontSize', v)}
                    className="ml-2"
                  />
                </SegRow>

                <SegRow label="行间距">
                  <SegmentedControl
                    options={lineHeights.map((lh) => ({ label: lh.label, value: lh.value }))}
                    value={config.lineHeight}
                    onChange={(v) => updateConfig('lineHeight', v as WeChatConfig['lineHeight'])}
                    className="ml-2"
                  />
                </SegRow>

                <Toggle label="首行缩进" keyName="indent" />
                <Toggle label="两端对齐" keyName="justify" />
              </SegGroup>
            </div>

            {/* Vertical divider */}
            <div className={`w-px self-stretch ${isDarkMode ? 'bg-[#3e4451]' : 'bg-gray-100'}`} />

            {/* Right: 主题 + 代码与链接 */}
            <div className="flex-1 pl-5 space-y-4">
              <SegGroup label="主题色与图注">
                {/* Color row */}
                <SegRow label="主题色">
                  <div className="flex flex-wrap gap-2 justify-end">
                    {colors.map((preset) => (
                      <button
                        key={preset.color}
                        onClick={() => updateConfig('primaryColor', preset.color)}
                        title={preset.label}
                        className={`w-5 h-5 rounded-full shadow-sm transition-transform hover:scale-110 relative ${config.primaryColor.toLowerCase() === preset.color.toLowerCase()
                          ? 'ring-2 ring-offset-2 ring-blue-400 scale-110'
                          : 'border border-gray-100'
                          } ${isDarkMode ? 'ring-offset-[#21252b] border-[#3e4451]' : 'ring-offset-white'}`}
                        style={{ backgroundColor: preset.color }}
                      />
                    ))}
                    <div className="relative w-5 h-5 rounded-full overflow-hidden shadow-sm border cursor-pointer hover:scale-110 transition-transform flex items-center justify-center bg-gradient-to-br from-red-400 via-green-400 to-blue-400">
                      <input
                        type="color"
                        value={config.primaryColor}
                        onChange={(e) => updateConfig('primaryColor', e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        title="自定义颜色"
                      />
                    </div>
                  </div>
                </SegRow>

                <SegRow label="代码块主题">
                  <div className={`relative ${rightControlWidthClass}`}>
                    <select
                      value={config.codeTheme}
                      onChange={(e) => updateConfig('codeTheme', e.target.value)}
                      className={`w-full text-xs p-1.5 rounded-lg border appearance-none focus:outline-none focus:ring-1 ${isDarkMode
                        ? 'bg-[#21252b] border-[#181a1f] text-gray-200 focus:ring-blue-500'
                        : 'bg-white border-gray-200 text-gray-800 focus:ring-blue-400'
                        }`}
                    >
                      {codeThemes.map((theme) => (
                        <option key={theme.value} value={theme.value}>{theme.label}</option>
                      ))}
                    </select>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </SegRow>

                <SegRow label="图注格式">
                  <SegmentedControl
                    options={captionTypes.map((ct) => ({ label: ct.label, value: ct.value }))}
                    value={config.captionType}
                    onChange={(v) => updateConfig('captionType', v as WeChatConfig['captionType'])}
                    className={rightControlWidthClass}
                  />
                </SegRow>
              </SegGroup>

              <div className={dividerClass} />

              <SegGroup label="代码与链接">
                {detailToggleItems.map((item) => (
                  <Toggle key={item.key} label={item.label} keyName={item.key} />
                ))}
              </SegGroup>
            </div>
          </div>

          <div className="text-center">
            <button
              onClick={() => setConfig(getWeChatTemplateDefaultConfig(config.template, config.typographyStyle))}
              className={`text-xs underline underline-offset-2 transition-opacity opacity-50 hover:opacity-80 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}
            >
              恢复默认配置
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
