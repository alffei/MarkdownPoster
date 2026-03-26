/**
 * 模块说明：Vite 构建配置，统一开发服务器参数、环境变量注入与路径别名。
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const geminiApiKey = env.GEMINI_API_KEY ?? '';
  const publicBase = env.VITE_PUBLIC_BASE?.trim() || '/';
  const proxyTarget = env.VITE_RRZXS_DEV_PROXY_TARGET?.trim();

  return {
    base: publicBase,
    // Avoid permission issues writing inside node_modules (default cacheDir is node_modules/.vite)
    cacheDir: '.vite',
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: proxyTarget
        ? {
            '/api/v1': {
              target: proxyTarget,
              changeOrigin: true,
              secure: true,
            },
          }
        : undefined,
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(geminiApiKey),
      'process.env.GEMINI_API_KEY': JSON.stringify(geminiApiKey),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  };
});
