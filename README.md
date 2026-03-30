<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1O1xqRAzfESUjXnO9oHbWmGAwQ7v4H7CN

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## RRZXS 通用后端接入

`MarkdownPoster` 当前通过 RRZXS 通用后端完成：

- SSO 登录 / 刷新 / 登出
- AI 功能鉴权
- 积分查询与扣减

建议先复制环境变量模板：

```bash
cp .env.example .env.local
```

关键变量：

- `VITE_PUBLIC_BASE=/mdp/`
- `VITE_RRZXS_API_BASE=/api/v1`
- `VITE_RRZXS_APP_ID=mdp`
- `VITE_RRZXS_REDIRECT_URI=https://rrzxs.com/mdp/`
- `VITE_RRZXS_RETURN_TO=https://rrzxs.com/mdp/`

注意：

1. `redirect_uri` 必须和通用后端 `app_clients.allowed_redirect_uris` 精确匹配。
2. `https://rrzxs.com/mdp` 与 `https://rrzxs.com/mdp/` 是两个不同值。
3. 本地 `localhost` 直接联调 SSO 不稳定，因为 refresh cookie 依赖 `.rrzxs.com` 域。登录联调应优先放在 `rrzxs.com` 同域地址下完成。
