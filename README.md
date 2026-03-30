# MarkdownPoster

MarkdownPoster 是一个面向内容编辑与排版的前端应用，用于把 Markdown 内容快速加工为适合传播和发布的视觉稿件。当前项目支持三类主要输出形态：

- 海报图模式：适合生成长图、卡片图、朋友圈/社群传播图
- 阅读模式：适合沉浸式阅读和内容整理
- 公众号模式：适合生成接近微信公众号排版的预览与可复制 HTML

项目同时提供对外 SDK，支持第三方页面一键打开 MarkdownPoster 并导入 Markdown 内容。

## 项目简介

项目核心目标是把“写 Markdown”与“做排版”拆开：内容仍然用纯文本维护，样式、模板、导出、公众号适配、AI 辅助和外部导入由应用负责。这样可以降低内容生产成本，也便于在不同发布渠道之间复用同一份原始内容。

当前工程基于 `React 19 + Vite + TypeScript`，前端本地持久化依赖 `localStorage`，导出能力使用 `html-to-image`、`JSZip` 等工具实现，AI 与鉴权能力通过 RRZXS 通用后端接入。

## 功能说明

### 1. 编辑与内容处理

- Markdown 编辑、实时预览、草稿本地持久化
- Markdown 语法归一化与自动修复
- 数学公式、代码高亮、GFM 等扩展渲染
- 智能内容模板：语义排版、活动模板、竖排诗等内容加工
- 图片池管理，支持本地图片引用与导入导出

### 2. 海报排版与主题系统

- 海报预览、缩放、画布交互
- 边框主题、排版主题、字号、边距、行距、水印等参数调节
- 海报模板、标题预设、装饰元素预设
- 自定义主色与模板微调快照保存

### 3. 阅读模式

- 以阅读主题渲染 Markdown 内容
- 支持阅读主题、字体和排版参数切换
- 适合作为内容校对和长文预览视图

### 4. 公众号排版与导出

- 公众号样式预览
- 公众号模板与外观参数配置
- 一键复制公众号 HTML
- 图片上传与公众号导出流程处理

### 5. 导出与项目打包

- 导出 PNG 海报
- 复制图片到剪贴板
- 导出 Markdown 原文
- 导出项目 ZIP，自动打包 Markdown 与图片资源
- 导入 ZIP 项目包并恢复图片引用

### 6. AI 能力与后端接入
> 需要登录使用

- 插图生成
- 语义格式（markdown 格式自动化调整）
- 竖排诗（一个诡异的功能）  

### 7. 外部页面导入 SDK

- 对外暴露 `MarkdownPoster.open()` 接口
- 支持短文本通过 URL hash 导入
- 支持较长文本通过 `postMessage` 握手导入
- 支持第三方站点一键打开新页并导入内容

## 外部接入

这一部分用于说明第三方页面如何拉起 MarkdownPoster，并把 Markdown 内容导入编辑器。
> 参考：[mdp-sdk-deploy-guide.md](./mdp-sdk-deploy-guide.md)

### 1. 当前固定部署路径

当项目部署在 `https://rrzxs.com/mdp/` 时：

- 应用入口：`https://rrzxs.com/mdp/`
- 导入页：`https://rrzxs.com/mdp/import`
- SDK：`https://rrzxs.com/mdp/sdk/markdownposter-open.v1.js`

### 2. 第三方页面接入方式

推荐显式传入 `targetOrigin` 与 `importPath`：

```html
<script src="https://rrzxs.com/mdp/sdk/markdownposter-open.v1.js"></script>
<script>
  async function openMarkdownPoster(markdown) {
    const result = await MarkdownPoster.open({
      markdown,
      source: location.origin,
      targetOrigin: "https://rrzxs.com",
      importPath: "/mdp/import"
    });

    console.log(result);
  }
</script>
```

### 3. 参数说明

- `markdown`：要导入的 Markdown 正文
- `source`：调用来源，建议传 `location.origin`
- `targetOrigin`：目标站点 origin，只能写域名，不能带路径
- `importPath`：导入页路径，部署在子路径时应写 `/mdp/import`
- `timeoutMs`：`postMessage` 通道超时时间，可选

关键规则：

- `targetOrigin` 正确写法是 `https://rrzxs.com`
- `targetOrigin` 不能写成 `https://rrzxs.com/mdp`
- `importPath` 在当前部署下应为 `/mdp/import`

### 4. SDK 导入机制

- 短内容优先走 URL hash 通道，链路最短
- 内容较长时自动切换到 `postMessage` 通道
- 超过 SDK 阈值时会返回 `{ ok: false, code: "too_large" }`

对应行为：

- URL 通道：打开 `/mdp/import#mpmd=...`
- `postMessage` 通道：先打开 `/mdp/import?mp_channel=pm&mp_nonce=...`，再完成握手与正文传输

### 5. 部署要求

- `vite.config.js` 中生产 `base` 需指向 `/mdp/`
- 发布时将 `dist/` 全量部署到站点目录
- 服务端必须支持 `/mdp/*` 的 SPA 回退
- `/mdp/import` 必须返回同一个 `index.html`

Nginx 示例：

```nginx
location ^~ /mdp/ {
  alias /var/www/mdp/;
  try_files $uri $uri/ /mdp/index.html;
}
```

### 6. 接入自检

上线后至少检查：

- `https://rrzxs.com/mdp/import` 可访问
- `https://rrzxs.com/mdp/sdk/markdownposter-open.v1.js` 可访问
- 直接访问 URL 导入测试链接时，编辑区能看到导入内容




