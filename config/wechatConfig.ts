/**
 * 模块说明：公众号主题配置源，维护微信模板相关配置。
 */

// -----------------------------------------------------------------------------
// 公众号 (WeChat) 配置文件 (YAML)
// -----------------------------------------------------------------------------

export const WECHAT_THEME_CONFIG_YAML = `
# ==============================================================================
# 1. 颜色预设 (Color Presets)
# ==============================================================================
colorPresets:
  - { color: '#07c160', label: '微信绿' }
  - { color: '#D97757', label: '果比橙' }
  - { color: '#997343', label: '雅致金' }
  - { color: '#3b82f6', label: '科技蓝' }
  - { color: '#6366f1', label: '睿智紫' }
  - { color: '#ec4899', label: '活力粉' }
  - { color: '#f59e0b', label: '暖阳橙' }
  - { color: '#ef4444', label: '中国红' }
  - { color: '#1f2937', label: '极简黑' }

# ==============================================================================
# 2. 代码高亮主题 (Code Themes)
# value 对应 prism-react-renderer 的 themes 对象名 (需在 Registry 中映射)
# ==============================================================================
codeThemes:
  - { label: 'Dark', value: 'vsDark', isDark: true }
  - { label: 'Light', value: 'vsLight', isDark: false }
  - { label: 'Dracula', value: 'dracula', isDark: true }
  - { label: 'Github', value: 'github', isDark: false }
  - { label: 'NightOwl', value: 'nightOwl', isDark: true }
  - { label: 'Oceanic', value: 'oceanicNext', isDark: true }

# ==============================================================================
# 3. 字号选项 (Font Sizes)
# ==============================================================================
fontSizes:
  - { label: '小', value: 'Small', pixel: '14px' }
  - { label: '中', value: 'Medium', pixel: '15px' }
  - { label: '大', value: 'Large', pixel: '16px' }

# ==============================================================================
# 4. 行高选项 (Line Heights)
# ==============================================================================
lineHeights:
  - { label: '紧凑', value: 'compact', scale: '1.5' }
  - { label: '舒适', value: 'comfortable', scale: '2.2' }

# ==============================================================================
# 5. 图注格式 (Caption Types)
# ==============================================================================
captionTypes:
  - { label: 'Title优先', value: 'title' }
  - { label: 'Alt优先', value: 'alt' }
  - { label: '不显示', value: 'none' }

# ==============================================================================
# 6. 排版布局 (Layouts)
# 样式支持变量: {{primary}}, {{primary_0.5}} (opacity)
# ==============================================================================
layouts:
  # ----------------------------------------------------------------------------
  # [Base] 标准
  # ----------------------------------------------------------------------------
  - id: "Base"
    name: "标准"
    styles:
      h1:
        fontWeight: "bold"
        marginTop: "1.5em"
        marginBottom: "1em"
        lineHeight: "1.4"
        borderBottom: "1px solid #e5e5e5"
        paddingBottom: "0.5em"
        color: "#111"
      h2:
        fontWeight: "bold"
        marginTop: "1.5em"
        marginBottom: "1em"
        lineHeight: "1.4"
        borderLeft: "4px solid {{primary}}"
        paddingLeft: "0.5em"
        color: "{{primary}}"
      h3:
        fontWeight: "bold"
        marginTop: "1.5em"
        marginBottom: "1em"
        lineHeight: "1.4"
        color: "#333"
      list:
        color: "{{primary}}"
      blockquote:
        paddingLeft: "1em"
        paddingRight: "1em"
        paddingTop: "1em"
        paddingBottom: "1em"
        margin: "1.5em 0"
        fontSize: "0.95em"
        borderRadius: "4px"
        borderLeft: "4px solid {{primary_0.4}}"
        backgroundColor: "#f9fafb"
        color: "#6b7280"
      link:
        color: "{{primary}}"
        textDecoration: "none"
      hr:
        border: "0"
        borderTop: "1px solid #e5e5e5"
        margin: "2em 0"

  # ----------------------------------------------------------------------------
  # [Classic] 经典
  # ----------------------------------------------------------------------------
  - id: "Classic"
    name: "经典"
    styles:
      h1:
        fontWeight: "bold"
        marginTop: "1.5em"
        marginBottom: "1em"
        lineHeight: "1.4"
        textAlign: "center"
        color: "#1f2937"
        letterSpacing: "0.05em"
        borderBottom: "1px solid #e5e5e5"
        paddingBottom: "1em"
      h2:
        fontWeight: "bold"
        marginTop: "1.5em"
        marginBottom: "1em"
        lineHeight: "1.4"
        textAlign: "center"
        color: "{{primary}}"
        borderTop: "1px solid {{primary}}"
        borderBottom: "1px solid {{primary}}"
        padding: "0.5em 0"
        display: "block"
        width: "100%"
      h3:
        fontWeight: "bold"
        marginTop: "1.5em"
        marginBottom: "1em"
        lineHeight: "1.4"
        color: "#374151"
      list:
        color: "{{primary}}"
      blockquote:
        paddingLeft: "1em"
        paddingRight: "1em"
        paddingTop: "1em"
        paddingBottom: "1em"
        margin: "1.5em 0"
        fontSize: "0.95em"
        borderRadius: "4px"
        borderLeft: "none"
        borderTop: "2px solid {{primary}}"
        borderBottom: "2px solid {{primary}}"
        fontStyle: "italic"
        color: "#4b5563"
        backgroundColor: "transparent"
        textAlign: "center"
      link:
        color: "{{primary}}"
        textDecoration: "underline"
        textUnderlineOffset: "4px"
      hr:
        border: "0"
        borderTop: "1px solid #111827"
        margin: "2em 0"

  # ----------------------------------------------------------------------------
  # [Vibrant] 活泼
  # ----------------------------------------------------------------------------
  - id: "Vibrant"
    name: "活泼"
    styles:
      h1:
        fontWeight: "bold"
        marginTop: "1.5em"
        marginBottom: "1em"
        lineHeight: "1.4"
        textAlign: "center"
        borderBottom: "2px solid {{primary}}"
        paddingBottom: "0.5em"
        color: "{{primary}}"
      h2:
        fontWeight: "bold"
        marginTop: "1.5em"
        marginBottom: "1em"
        lineHeight: "1.4"
        background: "{{primary}}"
        color: "white"
        padding: "0.2em 1em"
        borderRadius: "20px"
        display: "inline-block"
        boxShadow: "0 2px 5px {{primary_0.3}}"
      h3:
        fontWeight: "bold"
        marginTop: "1.5em"
        marginBottom: "1em"
        lineHeight: "1.4"
        color: "{{primary}}"
        borderLeft: "4px solid {{primary}}"
        paddingLeft: "0.5em"
      list:
        color: "{{primary}}"
      blockquote:
        paddingLeft: "1em"
        paddingRight: "1em"
        paddingTop: "1em"
        paddingBottom: "1em"
        margin: "1.5em 0"
        fontSize: "0.95em"
        borderRadius: "4px"
        backgroundColor: "{{primary_0.08}}"
        color: "#334155"
        borderLeft: "4px solid {{primary}}"
      link:
        color: "{{primary}}"
        fontWeight: "bold"
        textDecoration: "none"
        borderBottom: "1px dashed {{primary}}"
      hr:
        border: "0"
        borderTop: "1px solid {{primary_0.2}}"
        margin: "2em 0"

  # ----------------------------------------------------------------------------
  # [Inspiration] 灵感回路
  # ----------------------------------------------------------------------------
  - id: "Inspiration"
    name: "灵感回路"
    styles:
      h1:
        fontWeight: "bold"
        marginTop: "1.1em"
        marginBottom: "0.9em"
        lineHeight: "1.28"
        color: "#ffffff"
        background: "linear-gradient(135deg, {{primary_0.8}} 0%, {{primary}} 100%)"
        borderRadius: "22px"
        padding: "20px 22px"
      h2:
        fontWeight: "bold"
        marginTop: "22px"
        marginBottom: "16px"
        color: "#111827"
        backgroundColor: "{{primary_0.05}}"
        borderLeft: "5px solid {{primary}}"
        borderRadius: "12px"
        padding: "10px 12px"
        fontSize: "18px"
        letterSpacing: "0.6px"
      h3:
        fontWeight: "bold"
        marginTop: "18px"
        marginBottom: "12px"
        lineHeight: "1.65"
        color: "{{primary}}"
        fontSize: "16px"
      list:
        color: "#374151"
      blockquote:
        margin: "18px 0"
        padding: "18px"
        borderTopLeftRadius: "4px"
        borderBottomLeftRadius: "4px"
        borderTopRightRadius: "12px"
        borderBottomRightRadius: "12px"
        borderLeft: "4px solid {{primary_0.8}}"
        background: "{{primary_0.05}}"
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.05)"
        color: "#4b5563"
      link:
        color: "{{primary}}"
        fontWeight: "bold"
        textDecoration: "underline"
        textUnderlineOffset: "3px"
      hr:
        border: "0"
        height: "1px"
        background: "linear-gradient(to right, {{primary_0.7}}, {{primary_0.1}} 80%, rgba(255,255,255,0))"
        margin: "2em 0"

  # ----------------------------------------------------------------------------
  # [Guobi] 果比（模板结构样式，排版风格按钮仅影响字体）
  # ----------------------------------------------------------------------------
  - id: "Guobi"
    name: "果比"
    styles:
      h1:
        fontWeight: "bold"
        marginTop: "1.3em"
        marginBottom: "0.8em"
        lineHeight: "1.35"
        color: "#3B3B38"
      h2:
        fontWeight: "bold"
        marginTop: "18px"
        marginBottom: "24px"
        lineHeight: "22px"
        color: "#000000"
        textAlign: "center"
        letterSpacing: "2px"
        fontSize: "16px"
      h3:
        fontWeight: "bold"
        marginTop: "0"
        marginBottom: "8px"
        lineHeight: "2em"
        fontSize: "16px"
        color: "{{primary}}"
      list:
        color: "#646A73"
      blockquote:
        margin: "35px 0"
        padding: "20px"
        borderRadius: "25px"
        border: "1px solid rgba(255, 255, 255, 1)"
        backgroundColor: "rgba(250, 249, 245, 1)"
        color: "#646A73"
      link:
        color: "{{primary}}"
        fontWeight: "bold"
        textDecoration: "none"
      hr:
        border: "0"
        borderTop: "1px solid #ececec"
        margin: "2em 0"
`;
