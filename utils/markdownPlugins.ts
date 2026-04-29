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

/**
 * Remark 插件：果比卡片分段
 * 把「二级标题 + 后续内容（直到下一个二级标题）」包装成 blockquote，
 * 供公众号预览层渲染为果比卡片。
 */
export function remarkGuobiCards() {
  const extractText = (node: any): string => {
    if (!node) return '';
    if (typeof node.value === 'string') return node.value;
    if (Array.isArray(node.children)) {
      return node.children.map((child: any) => extractText(child)).join('');
    }
    return '';
  };

  const normalizeSectionTitle = (text: string): string => {
    const cleaned = text
      .replace(/^\s*[-—]+\s*/, '')
      .replace(/\s*[-—]+\s*$/, '')
      .trim();

    return cleaned ? `- ${cleaned} -` : '- 分组 -';
  };

  const isMarkerParagraph = (node: any): boolean => {
    if (!node || node.type !== 'paragraph') return false;
    const text = extractText(node).trim();
    return /^[-—]\s*.+\s*[-—]$/.test(text);
  };

  const isSectionStart = (node: any): boolean => {
    if (node?.type === 'heading' && node.depth === 2) {
      return extractText(node).trim().length > 0;
    }
    return isMarkerParagraph(node);
  };

  const createSectionHeading = (node: any) => {
    const title = normalizeSectionTitle(extractText(node));
    return {
      type: 'heading',
      depth: 2,
      children: [{ type: 'text', value: title }]
    };
  };

  return (tree: any) => {
    if (!tree || !Array.isArray(tree.children)) return;

    const source = tree.children;
    const nextChildren: any[] = [];
    let i = 0;

    while (i < source.length) {
      const current = source[i];

      if (isSectionStart(current)) {
        const sectionHeading = createSectionHeading(current);

        const cardChildren: any[] = [sectionHeading];
        i += 1;

        while (i < source.length) {
          const candidate = source[i];
          if (isSectionStart(candidate)) break;
          cardChildren.push(candidate);
          i += 1;
        }

        nextChildren.push({
          type: 'blockquote',
          data: {
            hProperties: {
              'data-guobi-card': 'true'
            }
          },
          children: cardChildren
        });
        continue;
      }

      nextChildren.push(current);
      i += 1;
    }

    tree.children = nextChildren;
  };
}

/**
 * Remark 插件：灵感回路章节头
 * 把 h2 标题转换为带编号元数据的容器，交给渲染层绘制编号方块 + 章节标题。
 */
export function remarkInspirationSections() {
  const extractText = (node: any): string => {
    if (!node) return '';
    if (typeof node.value === 'string') return node.value;
    if (Array.isArray(node.children)) {
      return node.children.map((child: any) => extractText(child)).join('');
    }
    return '';
  };

  const normalizeTitle = (text: string): string => (
    text
      .replace(/^\s*([0-9]+|[一二三四五六七八九十百零]+)\s*[、.．:：)\-]\s*/, '')
      .trim()
  );

  const toChineseIndex = (index: number): string => {
    const digits = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
    if (index <= 10) return index === 10 ? '十' : digits[index];
    if (index < 20) return `十${digits[index - 10]}`;
    if (index < 100) {
      const tens = Math.floor(index / 10);
      const ones = index % 10;
      return `${digits[tens]}十${ones ? digits[ones] : ''}`;
    }
    return String(index);
  };

  return (tree: any) => {
    if (!tree || !Array.isArray(tree.children)) return;

    let sectionIndex = 0;
    tree.children = tree.children.map((node: any) => {
      if (node?.type === 'heading' && node.depth === 2 && extractText(node).trim().length > 0) {
        sectionIndex += 1;
        const rawTitle = extractText(node);
        const sectionTitle = normalizeTitle(rawTitle) || rawTitle.trim() || `章节 ${sectionIndex}`;
        return {
          type: 'blockquote',
          data: {
            hProperties: {
              'data-inspiration-section': 'true',
              'data-inspiration-index': toChineseIndex(sectionIndex),
            },
          },
          children: [
            {
              type: 'heading',
              depth: 2,
              children: [{ type: 'text', value: sectionTitle }],
            },
          ],
        };
      }
      return node;
    });
  };
}

/**
 * Remark 插件：春序章节头
 * 把「二级标题 + 后续内容（直到下一个二级标题）」包装为 section 容器，
 * 供渲染层输出春序主题的分节内容卡片。
 */
export function remarkSpringSections() {
  const extractText = (node: any): string => {
    if (!node) return '';
    if (typeof node.value === 'string') return node.value;
    if (Array.isArray(node.children)) {
      return node.children.map((child: any) => extractText(child)).join('');
    }
    return '';
  };

  const normalizeTitle = (text: string): string => (
    text
      .replace(/^\s*(?:PART\.?\s*\d+|第[一二三四五六七八九十百零\d]+部分)\s*[、.．:：)\-]\s*/i, '')
      .replace(/^\s*([0-9]+|[一二三四五六七八九十百零]+)\s*[、.．:：)\-]\s*/, '')
      .trim()
  );

  const isSectionStart = (node: any): boolean => (
    node?.type === 'heading' && node.depth === 2 && extractText(node).trim().length > 0
  );
  const toPartIndex = (index: number): string => `PART.${String(index).padStart(2, '0')}`;

  return (tree: any) => {
    if (!tree || !Array.isArray(tree.children)) return;

    const source = tree.children;
    const nextChildren: any[] = [];
    let i = 0;
    let sectionIndex = 0;

    while (i < source.length) {
      const current = source[i];

      if (isSectionStart(current)) {
        sectionIndex += 1;
        const rawTitle = extractText(current);
        const sectionTitle = normalizeTitle(rawTitle) || rawTitle.trim() || `章节 ${sectionIndex}`;

        const sectionChildren: any[] = [];

        i += 1;
        while (i < source.length) {
          const candidate = source[i];
          if (isSectionStart(candidate)) break;
          sectionChildren.push(candidate);
          i += 1;
        }

        nextChildren.push({
          type: 'blockquote',
          data: {
            hProperties: {
              'data-spring-section': 'true',
              'data-spring-index': toPartIndex(sectionIndex),
              'data-spring-title': sectionTitle,
            },
          },
          children: sectionChildren,
        });
        continue;
      }

      nextChildren.push(current);
      i += 1;
    }

    tree.children = nextChildren;
  };
}

/**
 * Remark 插件：夏天章节容器
 * 把「二级标题 + 后续内容（直到下一个二级标题）」包装为暖色专题容器，
 * 渲染层据此绘制夏天主题的横幅标题与卡片结构。
 */
export function remarkSummerSections() {
  const extractText = (node: any): string => {
    if (!node) return '';
    if (typeof node.value === 'string') return node.value;
    if (Array.isArray(node.children)) {
      return node.children.map((child: any) => extractText(child)).join('');
    }
    return '';
  };

  const normalizeTitle = (text: string): string => (
    text
      .replace(/^\s*(?:SUMMER\.?\s*\d+|第[一二三四五六七八九十百零\d]+节)\s*[、.．:：)\-]\s*/i, '')
      .replace(/^\s*([0-9]+|[一二三四五六七八九十百零]+)\s*[、.．:：)\-]\s*/, '')
      .trim()
  );

  const isSectionStart = (node: any): boolean => (
    node?.type === 'heading' && node.depth === 2 && extractText(node).trim().length > 0
  );
  const toSectionIndex = (index: number): string => `SUMMER ${String(index).padStart(2, '0')}`;

  return (tree: any) => {
    if (!tree || !Array.isArray(tree.children)) return;

    const source = tree.children;
    const nextChildren: any[] = [];
    let i = 0;
    let sectionIndex = 0;

    while (i < source.length) {
      const current = source[i];

      if (isSectionStart(current)) {
        sectionIndex += 1;
        const rawTitle = extractText(current);
        const sectionTitle = normalizeTitle(rawTitle) || rawTitle.trim() || `章节 ${sectionIndex}`;
        const sectionChildren: any[] = [];

        i += 1;
        while (i < source.length) {
          const candidate = source[i];
          if (isSectionStart(candidate)) break;
          sectionChildren.push(candidate);
          i += 1;
        }

        nextChildren.push({
          type: 'blockquote',
          data: {
            hProperties: {
              'data-summer-section': 'true',
              'data-summer-index': toSectionIndex(sectionIndex),
              'data-summer-title': sectionTitle,
            },
          },
          children: sectionChildren,
        });
        continue;
      }

      nextChildren.push(current);
      i += 1;
    }

    tree.children = nextChildren;
  };
}

/**
 * Remark 插件：招聘蓝调章节容器
 * 把「二级标题 + 后续内容（直到下一个二级标题）」包装为主题容器，
 * 渲染层据此绘制蓝色渐变标题条与黑色边框结构。
 */
export function remarkRecruitSections() {
  const extractText = (node: any): string => {
    if (!node) return '';
    if (typeof node.value === 'string') return node.value;
    if (Array.isArray(node.children)) {
      return node.children.map((child: any) => extractText(child)).join('');
    }
    return '';
  };

  const normalizeTitle = (text: string): string => (
    text
      .replace(/^\s*(?:PART\.?\s*\d+|RECRUITMENT)\s*[、.．:：)\-]\s*/i, '')
      .replace(/^\s*([0-9]+|[一二三四五六七八九十百零]+)\s*[、.．:：)\-]\s*/, '')
      .trim()
  );

  const isSectionStart = (node: any): boolean => (
    node?.type === 'heading' && node.depth === 2 && extractText(node).trim().length > 0
  );
  const toSectionIndex = (index: number): string => String(index).padStart(2, '0');

  return (tree: any) => {
    if (!tree || !Array.isArray(tree.children)) return;

    const source = tree.children;
    const nextChildren: any[] = [];
    let i = 0;
    let sectionIndex = 0;

    while (i < source.length) {
      const current = source[i];

      if (isSectionStart(current)) {
        sectionIndex += 1;
        const rawTitle = extractText(current);
        const sectionTitle = normalizeTitle(rawTitle) || rawTitle.trim() || `章节 ${sectionIndex}`;
        const sectionChildren: any[] = [];

        i += 1;
        while (i < source.length) {
          const candidate = source[i];
          if (isSectionStart(candidate)) break;
          sectionChildren.push(candidate);
          i += 1;
        }

        nextChildren.push({
          type: 'blockquote',
          data: {
            hProperties: {
              'data-recruit-section': 'true',
              'data-recruit-index': toSectionIndex(sectionIndex),
              'data-recruit-title': sectionTitle,
            },
          },
          children: sectionChildren,
        });
        continue;
      }

      nextChildren.push(current);
      i += 1;
    }

    tree.children = nextChildren;
  };
}
