
import { WritingThemeDef } from '../utils/themeRegistry';

// -----------------------------------------------------------------------------
// 阅读模式主题配置 (Writing Themes)
// -----------------------------------------------------------------------------

// 定义默认主题 ID，供全局引用
export const DEFAULT_WRITING_THEME_ID = "Dim";

export const WRITING_THEMES: WritingThemeDef[] = [
  // 1. Dim Light (Default)
  {
    id: "Dim",
    name: "Dim Light",
    isDark: false,
    className: "bg-[#f3f4f6]",
    prose: "prose-gray text-[#374151]",
    preview: "bg-[#f3f4f6] border border-gray-200 text-[#374151]"
  },

  // 2. Solarized (Light)
  {
    id: "Solarized",
    name: "Solarized",
    isDark: false,
    className: "bg-[#fdf6e3]",
    prose: "text-[#657b83] prose-headings:text-[#b58900] prose-a:text-[#268bd2] prose-strong:text-[#cb4b16] prose-code:text-[#859900]",
    preview: "bg-[#fdf6e3] border border-[#eee8d5] text-[#b58900]"
  },

  // 3. Github Dark (Dark)
  {
    id: "GithubDark",
    name: "Github Dark",
    isDark: true,
    className: "bg-[#0d1117]",
    prose: "prose-invert text-[#c9d1d9] prose-headings:text-[#f0f6fc] prose-a:text-[#58a6ff] prose-strong:text-[#c9d1d9]",
    preview: "bg-[#0d1117] border border-[#30363d] text-[#f0f6fc]"
  },

  // 4. One Dark (Dark)
  {
    id: "OneDark",
    name: "One Dark",
    isDark: true,
    className: "bg-[#282c34]",
    prose: "prose-invert text-[#abb2bf] prose-headings:text-[#e06c75] prose-a:text-[#61afef] prose-strong:text-[#d19a66]",
    preview: "bg-[#282c34] border border-[#3e4451] text-[#e06c75]"
  }
];
