
import React from 'react';

/**
 * 边框装饰预设字典 (Decor Presets)
 * 
 * 用于在 Card 的四个角落添加复杂的装饰元素。
 * 通过 CSS 绝对定位覆盖在 Card 边缘。
 */
export const DECOR_PRESETS: Record<string, React.ReactNode> = {
  
  // ---------------------------------------------------------------------------
  // [Ink Corners] 水墨/中式转角方框
  // 效果：精致的方框(24px)，中心对准边框顶点，掩盖双线边框的交接处
  // ---------------------------------------------------------------------------
  'ink-corners': (
    <>
       {/* 
         Logic:
         Square size: w-6 (24px).
         Position: -top-3 (-12px), -left-3 (-12px).
         Result: The 24px square is centered exactly on the 0,0 corner of the card.
         Bg color matches card to mask the underlying border corner.
         Border-2 ensures the square itself has a solid definition contrasting the double border.
       */}
       <div className="absolute -top-2 -left-2 w-2 h-2 border-2 border-[#57534e] bg-[#fdfbf7] z-10" />
       <div className="absolute -top-2 -right-2 w-2 h-2 border-2 border-[#57534e] bg-[#fdfbf7] z-10" />
       <div className="absolute -bottom-2 -left-2 w-2 h-2 border-2 border-[#57534e] bg-[#fdfbf7] z-10" />
       <div className="absolute -bottom-2 -right-2 w-2 h-2 border-2 border-[#57534e] bg-[#fdfbf7] z-10" />
    </>
  ),

  // ---------------------------------------------------------------------------
  // [Modern Deco] 现代雅致/新复古简约风格
  // 效果：顶部两侧的双线极简圆弧，呈现西方简约杂志风格
  // ---------------------------------------------------------------------------
  'modern-deco': (
    <>
        <div className="absolute top-4 left-4 w-24 h-24 pointer-events-none text-[#a16207] opacity-80 z-10">
            <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" className="w-full h-full">
                <path d="M 0 60 L 0 35 Q 0 0 35 0 L 60 0" strokeWidth="0.8" strokeLinecap="round" />
                <path d="M 8 60 L 8 35 Q 8 8 35 8 L 60 8" strokeWidth="0.8" strokeLinecap="round" />
            </svg>
        </div>

        <div className="absolute top-4 right-4 w-24 h-24 pointer-events-none text-[#a16207] opacity-80 z-10 scale-x-[-1]">
             <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" className="w-full h-full">
                <path d="M 0 60 L 0 35 Q 0 0 35 0 L 60 0" strokeWidth="0.8" strokeLinecap="round" />
                <path d="M 8 60 L 8 35 Q 8 8 35 8 L 60 8" strokeWidth="0.8" strokeLinecap="round" />
            </svg>
        </div>
    </>
  ),

  // ---------------------------------------------------------------------------
  // [Report Brackets] 商业报告红框
  // 效果：四个角落的L型红/深棕色粗线条，位置稍向内收缩
  // ---------------------------------------------------------------------------
  'report-brackets': (
    <>
      {/* Top Left */}
      <div className="absolute -top-px -left-px w-8 h-8 border-l-[3px] border-t-[3px] border-[#8B1D1D] z-10 opacity-90" />
      {/* Top Right */}
      <div className="absolute -top-px -right-px w-8 h-8 border-r-[3px] border-t-[3px] border-[#8B1D1D] z-10 opacity-90" />
      {/* Bottom Left */}
      <div className="absolute -bottom-px -left-px w-8 h-8 border-l-[3px] border-b-[3px] border-[#8B1D1D] z-10 opacity-90" />
      {/* Bottom Right */}
      <div className="absolute -bottom-px -right-px w-8 h-8 border-r-[3px] border-b-[3px] border-[#8B1D1D] z-10 opacity-90" />
    </>
  )
};
