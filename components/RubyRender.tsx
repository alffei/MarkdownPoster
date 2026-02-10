/**
 * 模块说明：注音渲染组件，负责 ruby 标记的可读展示。
 */

import React from 'react';

interface RubyRenderProps {
    baseText: React.ReactNode;
    reading: string;
    // 透传额外属性，兼容 ReactMarkdown 渲染参数
    [key: string]: any;
}

export const RubyRender: React.FC<RubyRenderProps> = ({ baseText, reading, ...props }) => {
    // 1) 注音分隔符：中点、全角点、句号、连字符
    // 对应字符编码：\u00B7(·), \uFF0E(．), \u3002(。)
    const separatorRegex = /[\u00B7\uFF0E\u3002\-]/;
    
    const parts = reading.split(separatorRegex);
    const textContent = typeof baseText === 'string' ? baseText : String(baseText || '');
    
    // 若“正文字数 == 注音分段数”，按一字一音渲染
    const canMapOneToOne = textContent.length === parts.length && parts.length > 1;

    if (canMapOneToOne) {
        return (
            <ruby {...props} style={{ margin: '0 2px' }}>
                {textContent.split('').map((char, index) => (
                    <React.Fragment key={index}>
                        {char}
                        <rt>{parts[index]}</rt>
                    </React.Fragment>
                ))}
            </ruby>
        );
    }

    // 默认回退：整段注音覆盖整段正文
    return (
        <ruby {...props} style={{ margin: '0 2px' }}>
            {baseText}
            <rt>{reading}</rt>
        </ruby>
    );
};
