/**
 * 模块说明：标题样式预设配置，提供标题区域装饰模板。
 */

import React from 'react';

/**
 * 顶部装饰元素预设字典 (Header Presets)
 * 
 * 这里定义了可以在 YAML 配置文件中通过 `customHeader` 字段引用的 JSX 组件。
 * 这样可以将"配置"与"核心渲染逻辑"分离。
 * 
 * 使用方法:
 * 1. 在这里添加新的 key-value，例如 'star': <div>...</div>
 * 2. 在 config/themeConfig.ts 的 YAML 中设置 customHeader: "star"
 */
export const HEADER_PRESETS: Record<string, React.ReactNode> = {
  // ---------------------------------------------------------------------------
  // [MacOS] 经典的红绿灯圆点
  // 通常配合父容器的 space-x-2 使用
  // 增加 flex-shrink-0 + aspect-square，避免缩略图中被压扁
  // ---------------------------------------------------------------------------
  'macos': (
    <>
      <div className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e] flex-shrink-0 aspect-square"></div>
      <div className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123] flex-shrink-0 aspect-square"></div>
      <div className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29] flex-shrink-0 aspect-square"></div>
    </>
  ),

  // ---------------------------------------------------------------------------
  // [Win11] Windows 11 风格控制按钮
  // ---------------------------------------------------------------------------
  'win11': (
    <div className="flex items-center h-full ml-auto">
        {/* 最小化 */}
        <div className="w-9 h-full flex items-center justify-center hover:bg-gray-200/50 transition-colors">
            <svg width="10" height="1" viewBox="0 0 10 1" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0 0.5H10" stroke="currentColor" strokeWidth="1"/>
            </svg>
        </div>
        {/* 最大化 */}
        <div className="w-9 h-full flex items-center justify-center hover:bg-gray-200/50 transition-colors">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="0.5" y="0.5" width="9" height="9" stroke="currentColor" strokeWidth="1"/>
            </svg>
        </div>
        {/* 关闭（红底） */}
        <div className="w-9 h-full flex items-center justify-center bg-[#e81123] text-white hover:bg-[#c10e1b] transition-colors">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0.5 0.5L9.5 9.5M9.5 0.5L0.5 9.5" stroke="currentColor" strokeWidth="1"/>
            </svg>
        </div>
    </div>
  ),

  // ---------------------------------------------------------------------------
  // [Sunset] 日落大道的双色圆点
  // ---------------------------------------------------------------------------
  'sunset': (
    <div className="flex space-x-1">
      <div className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0 aspect-square"></div>
      <div className="w-2 h-2 rounded-full bg-rose-400 flex-shrink-0 aspect-square"></div>
    </div>
  ),

  // ---------------------------------------------------------------------------
  // [Candy] 糖果甜心 -> [Memo Style] 备忘录风格
  // ---------------------------------------------------------------------------
  'candy': (
    <>
        {/* 左侧：返回箭头（无文字） */}
        <div className="flex items-center gap-1 text-pink-500">
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <path d="M15 18l-6-6 6-6"/>
             </svg>
        </div>
        
        {/* 右侧：分享 + 菜单 */}
        <div className="flex items-center gap-4 text-pink-500">
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                <polyline points="16 6 12 2 8 6"/>
                <line x1="12" y1="2" x2="12" y2="15"/>
             </svg>
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                 <circle cx="12" cy="12" r="10" strokeWidth="1.5" />
                 <circle cx="8" cy="12" r="1" fill="currentColor" stroke="none"/>
                 <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>
                 <circle cx="16" cy="12" r="1" fill="currentColor" stroke="none"/>
             </svg>
        </div>
    </>
  ),

  // ---------------------------------------------------------------------------
  // [Retro] 复古像素风格
  // 模拟 Win95 / Pixel Art 的关闭按钮
  // ---------------------------------------------------------------------------
  'retro': (
    <div className="flex items-center space-x-1 ml-auto">
        <div className="w-4 h-4 bg-gray-300 border-t border-l border-white border-b border-r border-black flex items-center justify-center">
             <div className="w-2 h-0.5 bg-black"></div>
        </div>
        <div className="w-4 h-4 bg-gray-300 border-t border-l border-white border-b border-r border-black flex items-center justify-center">
             <div className="w-2 h-2 border border-black border-t-2"></div>
        </div>
        <div className="w-4 h-4 bg-[#fd0000] border-t border-l border-[#ff8888] border-b border-r border-black flex items-center justify-center">
             <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={4} d="M6 18L18 6M6 6l12 12" />
             </svg>
        </div>
    </div>
  ),

  // ---------------------------------------------------------------------------
  // [Simple] 简单的灰色圆点 (示例扩展)
  // ---------------------------------------------------------------------------
  'simple': (
    <div className="w-2 h-2 rounded-full bg-gray-300 flex-shrink-0 aspect-square"></div>
  )
};
