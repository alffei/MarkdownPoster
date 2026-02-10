/**
 * 模块说明：Markdown 插件集合，扩展自定义语法与渲染行为。
 */

import { visit } from 'unist-util-visit';

/**
 * Remark 插件：注音语法（Ruby）
 * 识别写法：[正文]{注音} 或 [正文]^(注音)
 *
 * 处理策略：
 * 不直接在 AST 里注入复杂 HTML，而是转成带 ruby: 协议的 link 节点，
 * 让 React 渲染阶段统一拦截并渲染为 <ruby>，降低解析复杂度。
 *
 * 转换示例：
 * [你好]{nihao} -> [你好](ruby:nihao)
 */
export function remarkRuby() {
  return (tree: any) => {
    visit(tree, 'text', (node, index, parent) => {
      // 正则说明：
      // [正文]{注音} 或 [正文]^(注音)
      // 正文取分组1，注音取分组2或分组3
      const rubyRegex = /\[(.*?)\](?:\{(.*?)\}|\^\((.*?)\))/g;
      
      const value = node.value;
      const matches = [...value.matchAll(rubyRegex)];

      if (!matches.length) return;

      const children = [];
      let lastIndex = 0;

      for (const match of matches) {
        const fullMatch = match[0];
        const baseText = match[1];
        // 注音可能来自 {} 或 ^() 两种写法
        const reading = match[2] || match[3];
        const matchIndex = match.index!;

        // 1) 先写入匹配前的普通文本
        if (matchIndex > lastIndex) {
          children.push({
            type: 'text',
            value: value.slice(lastIndex, matchIndex)
          });
        }

        // 2) 把注音片段转成 link 节点，后续由渲染层拦截 ruby: 协议
        // 这样可以避免开启 rehype-raw，并减少自定义 AST 处理复杂度
        children.push({
          type: 'link',
          title: null,
          // 把注音放入 URL，作为跨阶段传递载体
          url: `ruby:${reading}`,
          children: [
            // 正文保存在 link 文本里
            { type: 'text', value: baseText }
          ]
        });

        lastIndex = matchIndex + fullMatch.length;
      }

      // 3) 追加尾部剩余文本
      if (lastIndex < value.length) {
        children.push({
          type: 'text',
          value: value.slice(lastIndex)
        });
      }

      // 用新的节点数组替换原文本节点
      parent.children.splice(index, 1, ...children);
      
      // 返回新索引，避免 visit 立即重扫新节点导致死循环
      return index + children.length;
    });
  };
}

/**
 * Remark 插件：居中指令
 * 支持 :::center ... ::: 语法
 */
export function remarkCenter() {
  return (tree: any) => {
    visit(tree, (node) => {
      if (
        node.type === 'containerDirective' ||
        node.type === 'leafDirective' ||
        node.type === 'textDirective'
      ) {
        if (node.name !== 'center') return;

        const data = node.data || (node.data = {});
        const tagName = node.type === 'textDirective' ? 'span' : 'div';

        data.hName = tagName;
        data.hProperties = {
            style: { 
                textAlign: 'center', 
                display: node.type === 'textDirective' ? 'inline-block' : 'block',
                // 容器占满宽度，保证 text-align:center 生效
                width: '100%',
                // 让列表符号与文字一起居中
                listStylePosition: 'inside'
            },
            className: 'center-aligned-block'
        };

        // 容器指令下，强制子段落 textAlign=center。
        // 否则下游样式（例如 WeChatPreview 的左对齐/两端对齐）会覆盖继承结果。
        if (node.type === 'containerDirective' && node.children) {
            node.children.forEach((child: any) => {
                if (child.type === 'paragraph') {
                    const childData = child.data || (child.data = {});
                    const childProps = childData.hProperties || (childData.hProperties = {});
                    
                    // 合并段落原有样式，避免覆盖其他渲染器产物
                    childProps.style = {
                        ...(childProps.style || {}),
                        textAlign: 'center'
                    };
                }
            });
        }
      }
    });
  };
}
