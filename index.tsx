/**
 * 模块说明：应用入口文件，负责挂载根组件并根据 URL 参数切换调色板模式。
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import 'katex/dist/katex.min.css';
import './katex-overrides.css';
import App from './App';
import { PaletteGallery } from './components/PaletteGallery';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

const isPaletteMode = typeof window !== 'undefined' && window.location.search.includes('palette=1');

root.render(
  <React.StrictMode>
    {isPaletteMode ? <PaletteGallery /> : <App />}
  </React.StrictMode>
);
