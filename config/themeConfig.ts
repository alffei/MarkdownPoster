
import { DEFAULT_WRITING_THEME_ID } from './writingThemes';

// -----------------------------------------------------------------------------
// 配置文件 (Config)
// 这是一个纯 YAML 格式的字符串。
// 这里的修改会直接影响海报模式的外观选项和默认值。
// -----------------------------------------------------------------------------

export const THEME_CONFIG_YAML = `
# ==============================================================================
# 全局默认设置 (Defaults)
# 当用户第一次打开应用或重置时使用的值
# ==============================================================================
defaults:
  theme: "Elegant"   # 默认边框主题 ID
  layout: "Base"     # 默认排版主题 ID
  writingTheme: "${DEFAULT_WRITING_THEME_ID}" # 默认写作/阅读主题 ID
  fontSize: "Medium" # 默认字号 ID
  padding: "Medium"  # 默认边距 ID
  
  # 署名(水印)默认配置
  watermark:
    show: true
    text: "人人智学社 rrzxs.com"  
    align: "text-center"

# ==============================================================================
# 1. 边框主题 (Border Themes)
# ==============================================================================
borderThemes:
  # ============================================================================
  # [组0] 特色推荐 (Featured)
  # ============================================================================

  # ----------------------------------------------------------------------------
  # [Elegant] 优雅画框
  # ----------------------------------------------------------------------------
  - id: "Elegant"
    name: "优雅画框"
    preview: "bg-stone-50 border-4 border-stone-200"
    frame: "bg-[#f5f5f4] p-4"
    card: "bg-white border-[12px] border-white ring-1 ring-stone-200 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.15)]"
    content: "bg-white text-gray-800"
    prose: "prose-stone"
    watermarkColor: "text-stone-300"
    colors:
      primary: "#44403c"
      secondary: "#78716c"
      assist: "#e7e5e4"

  # ============================================================================
  # [组1] 窗口标题风格 (Window Styles)
  # ============================================================================
  
  # ----------------------------------------------------------------------------
  # [MacOS] 拟物风格
  # ----------------------------------------------------------------------------
  - id: "MacOS"
    name: "MacOS"
    preview: "bg-gray-100 border border-gray-300"
    frame: "bg-[#f3f4f6]"
    card: "bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
    header: "bg-gray-100 border-b border-gray-200 h-8 flex items-center px-4 space-x-2"
    customHeader: "macos"
    content: "bg-white text-gray-800"
    prose: "prose-slate"
    watermarkColor: "text-gray-400"
    colors:
      primary: "#111827"
      secondary: "#3b82f6"
      assist: "#e5e7eb"

  # ----------------------------------------------------------------------------
  # [Win11] Windows 11
  # ----------------------------------------------------------------------------
  - id: "Win11"
    name: "Windows 11"
    preview: "bg-[#f3f3f3] border border-gray-300"
    frame: "bg-[#f3f3f3]"
    card: "bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden"
    header: "h-9 flex items-center px-0 bg-[#f3f3f3] border-b border-gray-200 text-gray-600 select-none"
    customHeader: "win11"
    content: "bg-white text-gray-900"
    prose: "prose-slate"
    watermarkColor: "text-gray-400"
    colors:
      primary: "#111827"
      secondary: "#3b82f6"
      assist: "#e5e7eb"

  # ----------------------------------------------------------------------------
  # [RetroGame] 像素游戏
  # ----------------------------------------------------------------------------
  - id: "RetroGame"
    name: "像素游戏"
    preview: "bg-gray-300 border-2 border-gray-500"
    frame: "bg-[#008080]"
    card: "bg-[#c0c0c0] border-t-2 border-l-2 border-white border-b-2 border-r-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.5)] p-1"
    header: "bg-[#000080] h-8 flex items-center px-2 space-x-2 mb-1"
    customHeader: "retro"
    content: "bg-white border-2 border-gray-500 border-b-white border-r-white p-4 text-black"
    prose: "prose-slate prose-headings:uppercase"
    watermarkColor: "text-white/60 font-mono"
    colors:
      primary: "#000080"
      secondary: "#008080"
      assist: "#ffbd2e"

  # ----------------------------------------------------------------------------
  # [Sunset] 日落大道
  # ----------------------------------------------------------------------------
  - id: "Sunset"
    name: "日落大道"
    preview: "bg-gradient-to-br from-orange-100 to-rose-100"
    frame: "bg-[#fff7ed]"
    card: "bg-gradient-to-br from-orange-50 to-rose-50 border-4 border-orange-200 shadow-[0_20px_50px_-12px_rgba(251,146,60,0.5)] rounded-2xl overflow-hidden ring-4 ring-orange-100/50"
    content: "bg-transparent text-gray-800"
    header: "bg-orange-100/50 border-b border-orange-200/50 h-10 flex items-center px-4 space-x-2"
    customHeader: "sunset"
    prose: "prose-orange prose-headings:text-[var(--mp-primary-text)]"
    watermarkColor: "text-orange-300"
    colors:
      primary: "#9a3412"
      secondary: "#be123c"
      assist: "#ffedd5"

  # ----------------------------------------------------------------------------
  # [Candy] 糖果甜心
  # ----------------------------------------------------------------------------
  - id: "Candy"
    name: "糖果甜心"
    preview: "bg-pink-50 border-2 border-pink-400"
    frame: "bg-[#fdf2f8]"
    card: "bg-white border-4 border-pink-400 shadow-[8px_8px_0px_0px_rgba(244,114,182,1)] rounded-3xl overflow-hidden"
    content: "bg-yellow-50/50 text-gray-800"
    header: "bg-pink-100 border-b border-pink-200 h-12 flex items-center px-5 justify-between select-none"
    customHeader: "candy"
    prose: "prose-pink prose-headings:text-[var(--mp-primary-text)]"
    watermarkColor: "text-pink-300"
    colors:
      primary: "#be185d"
      secondary: "#6d28d9"
      assist: "#fef3c7"


  # ============================================================================
  # [组2] 边框/创意风格 (Framed/Light Styles)
  # ============================================================================

  # ----------------------------------------------------------------------------
  # [Minimal] 极简白
  # ----------------------------------------------------------------------------
  - id: "Minimal"
    name: "极简白"
    preview: "bg-white border border-gray-200"
    frame: "bg-[#f9fafb]" 
    card: "bg-white border border-gray-200 shadow-sm"
    content: "bg-white text-gray-900"
    prose: "prose-stone"
    watermarkColor: "text-gray-300"
    colors:
      primary: "#111827"
      secondary: "#3b82f6"
      assist: "#e5e7eb"

  # ----------------------------------------------------------------------------
  # [Sketch] 手绘线稿
  # ----------------------------------------------------------------------------
  - id: "Sketch"
    name: "手绘线稿"
    preview: "bg-[#f5f5f4] border-2 border-gray-800"
    frame: "bg-[#f5f5f4]"
    card: "bg-white sketch-border p-2"
    content: "bg-transparent text-gray-900"
    prose: "prose-slate"
    watermarkColor: "text-stone-400"
    colors:
      primary: "#111827"
      secondary: "#3b82f6"
      assist: "#f59e0b"

  # ----------------------------------------------------------------------------
  # [Report] 商业报告
  # ----------------------------------------------------------------------------
  - id: "Report"
    name: "商业报告"
    preview: "bg-[#fbf9f5] relative overflow-hidden after:absolute after:top-1 after:left-1 after:w-3 after:h-3 after:border-l-2 after:border-t-2 after:border-[#8B1D1D] after:content-[''] before:absolute before:bottom-1 before:right-1 before:w-3 before:h-3 before:border-r-2 before:border-b-2 before:border-[#8B1D1D] before:content-['']"
    frame: "bg-[#e5e5e5]"
    card: "bg-[#fbf9f5] shadow-2xl relative"
    header: "" 
    customDecor: "report-brackets"
    content: "bg-transparent text-[#2d2a26]"
    prose: "prose-stone prose-headings:font-serif prose-headings:text-[var(--mp-primary-text)] prose-headings:font-bold"
    watermarkColor: "text-[#8B1D1D]/50"
    colors:
      primary: "#8B1D1D"
      secondary: "#b91c1c"
      assist: "#fee2e2"

  # ----------------------------------------------------------------------------
  # [Ink] 水墨丹青
  # ----------------------------------------------------------------------------
  - id: "Ink"
    name: "水墨丹青"
    preview: "bg-[#f4f1e8] border-double border-4 border-stone-600"
    frame: "bg-[#eaddcf]" 
    card: "bg-[#fdfbf7] border-4 border-double border-[#57534e] shadow-xl relative"
    customDecor: "ink-corners"
    content: "bg-[#fdfbf7] text-[#292524]"
    prose: "prose-stone prose-headings:text-[var(--mp-primary-text)]"
    watermarkColor: "text-[#57534e]"
    colors:
      primary: "#1c1917"
      secondary: "#44403c"
      assist: "#eaddcf"

  # ----------------------------------------------------------------------------
  # [Retro] 复古报刊
  # ----------------------------------------------------------------------------
  - id: "Retro"
    name: "复古报刊"
    preview: "bg-[#fdf6e3] border-double border-4 border-[#b58900]"
    frame: "bg-[#e5dfce]"
    card: "bg-[#fdf6e3] border-4 border-double border-[#b58900] rounded-sm shadow-xl"
    content: "bg-[#fdf6e3] text-[#657b83]"
    prose: "prose-headings:text-[var(--mp-primary-text)]"
    watermarkColor: "text-[#b58900] opacity-40"
    colors:
      primary: "#b58900"
      secondary: "#268bd2"
      assist: "#eee8d5"

  # ----------------------------------------------------------------------------
  # [Glass] 磨砂玻璃 (allowCustomColor)
  # ----------------------------------------------------------------------------
  - id: "Glass"
    name: "磨砂玻璃"
    allowCustomColor: true
    preview: "bg-gradient-to-br from-indigo-100 to-purple-100 border border-white"
    frame: "bg-gradient-to-br from-indigo-100 to-purple-100"
    card: "bg-white/40 backdrop-blur-xl shadow-2xl rounded-2xl"
    content: "bg-transparent text-gray-900"
    prose: "prose-gray prose-headings:text-[var(--mp-primary-text)]"
    watermarkColor: "text-indigo-300"
    colors:
      primary: "#6366f1"
      secondary: "#8b5cf6"
      assist: "#cffafe"


  # ============================================================================
  # [组3] 深色/暗黑风格 (Dark Styles)
  # ============================================================================

  # ----------------------------------------------------------------------------
  # [Neon] 赛博霓虹 (allowCustomColor)
  # ----------------------------------------------------------------------------
  - id: "Neon"
    name: "赛博霓虹"
    isDark: true
    allowCustomColor: true
    preview: "bg-gray-900 border border-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.5)]"
    frame: "bg-[#171717]"
    card: "bg-gray-900 border-2 border-pink-500 shadow-[0_0_30px_rgba(236,72,153,0.4)] rounded-xl overflow-hidden"
    content: "bg-gray-900 text-pink-50"
    # Added explicit text-white for common elements to prevent black text issues
    prose: "prose-invert prose-headings:text-[var(--mp-primary-text)] prose-p:text-white/90 prose-li:text-white/90 prose-ul:text-white/90 prose-ol:text-white/90 prose-code:text-yellow-300 prose-blockquote:text-white/90 prose-blockquote:border-[var(--mp-secondary)] [&_td]:text-white/90 [&_th]:text-pink-400"
    watermarkColor: "text-pink-900"
    colors:
      primary: "#e2e8f0"
      secondary: "#fb7185"
      assist: "#a5f3fc"

  # ----------------------------------------------------------------------------
  # [Aurora] 极光幻境 (allowCustomColor)
  # ----------------------------------------------------------------------------
  - id: "Aurora"
    name: "极光幻境"
    isDark: true
    allowCustomColor: true
    preview: "bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600"
    frame: "bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600"
    card: "bg-black/20 backdrop-blur-md border border-white/10 shadow-2xl rounded-xl"
    # Inner content stays white for readability (frame remains colorful)
    content: "bg-white text-slate-900"
    prose: "prose-slate prose-headings:text-[var(--mp-primary-text)] prose-p:text-slate-700 prose-li:text-slate-700 prose-ul:text-slate-700 prose-ol:text-slate-700 [&_td]:text-slate-700 [&_th]:text-slate-900 [&_tr]:border-slate-200"
    watermarkColor: "text-white/40"
    colors:
      primary: "#4f46e5"
      secondary: "#8b5cf6"
      assist: "#e0e7ff"

  # ----------------------------------------------------------------------------
  # [Radiance] 流光溢彩 (allowCustomColor)
  # ----------------------------------------------------------------------------
  - id: "Radiance"
    name: "流光溢彩"
    isDark: true
    allowCustomColor: true
    preview: "bg-gradient-to-tr from-teal-400 via-blue-500 to-purple-500"
    frame: "bg-gradient-to-tr from-teal-400 via-blue-500 to-purple-500"
    card: "bg-white/10 backdrop-blur-lg border border-white/20 shadow-2xl rounded-xl"
    content: "bg-transparent text-white"
    # Force white text
    prose: "prose-invert prose-headings:text-[var(--mp-primary-text)] prose-p:text-white/90 prose-li:text-white/90 prose-ul:text-white/90 prose-ol:text-white/90 [&_td]:text-white/90 [&_th]:text-teal-200 [&_tr]:border-white/20"
    watermarkColor: "text-white/50"
    colors:
      primary: "#93c5fd"
      secondary: "#a78bfa"
      assist: "#99f6e4"

# ==============================================================================
# 2. 排版主题 (Layout Themes)
# ==============================================================================
layoutThemes:
  # ----------------------------------------------------------------------------
  # [Base] 标准
  # ----------------------------------------------------------------------------
  - id: "Base"
    name: "标准"
    className: "font-sans prose-headings:font-bold prose-headings:text-[var(--mp-primary-text)] prose-headings:border-none prose-a:text-[var(--mp-secondary-text)] prose-blockquote:bg-[var(--mp-assist)]/22 prose-blockquote:border-l-[3px] prose-blockquote:border-[var(--mp-primary)] prose-blockquote:opacity-90 prose-blockquote:not-italic prose-blockquote:px-4 prose-blockquote:py-1 prose-blockquote:rounded-r-sm prose-strong:font-bold"

  # ----------------------------------------------------------------------------
  # [Classic] 经典
  # ----------------------------------------------------------------------------
  - id: "Classic"
    name: "经典"
    className: "font-serif prose-headings:font-bold prose-headings:text-[var(--mp-primary-text)] prose-headings:border-none prose-a:text-[var(--mp-secondary-text)] prose-strong:text-[var(--mp-primary)] prose-blockquote:bg-[var(--mp-assist)]/20 prose-blockquote:border-l-[3px] prose-blockquote:border-[var(--mp-primary)] prose-blockquote:not-italic prose-blockquote:px-4 prose-blockquote:py-1"

  # ----------------------------------------------------------------------------
  # [Marker] 标注
  # ----------------------------------------------------------------------------
  - id: "Marker"
    name: "标注"
    className: "mp-marker font-sans tracking-wide prose-headings:font-extrabold prose-headings:text-[var(--mp-primary-text)] prose-a:text-[var(--mp-secondary-text)] prose-blockquote:bg-[var(--mp-assist)]/18 prose-blockquote:border-l-[3px] prose-blockquote:border-[var(--mp-secondary)] prose-h2:border-none prose-strong:text-[var(--mp-secondary)]"

  # ----------------------------------------------------------------------------
  # [Ribbon] 强调
  # ----------------------------------------------------------------------------
  - id: "Ribbon"
    name: "强调"
    className: "mp-ribbon font-sans tracking-wide prose-headings:font-extrabold prose-headings:text-[var(--mp-primary-text)] prose-a:text-[var(--mp-secondary-text)] prose-blockquote:bg-[var(--mp-assist)]/16 prose-blockquote:border-l-[3px] prose-blockquote:border-[var(--mp-primary)] prose-h2:border-none prose-strong:text-[var(--mp-secondary)]"

# ==============================================================================
# 3. 字号设置 (Font Sizes)
# ==============================================================================
fontSizes:
  - id: "Small"
    label: "S"
    className: "prose-sm"
  - id: "Medium"
    label: "M"
    className: "prose-base"
  - id: "Large"
    label: "L"
    className: "prose-lg"
  - id: "XLarge"
    label: "XL"
    className: "prose-xl"

# ==============================================================================
# 4. 边距设置 (Paddings)
# ==============================================================================
paddings:
  - id: "Narrow"
    label: "窄"
    className: "p-4 sm:p-6"
  - id: "Medium"
    label: "中"
    className: "p-8 sm:p-12"
  - id: "Wide"
    label: "宽"
    className: "p-12 sm:p-20"
`;
