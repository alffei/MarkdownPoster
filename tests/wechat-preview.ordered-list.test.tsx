import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { WeChatPreview } from '../components/WeChatPreview';
import { getWeChatTemplateDefaultConfig } from '../config/wechatTemplates';

const markdown = [
  '1. **第一条**：这一条后面插入图片，序号应继续递增。',
  '',
  '![复现图片](https://example.com/repro.png)',
  '',
  ':::center',
  '图片说明文字',
  ':::',
  '',
  '2. **第二条**：这里应该保持 2.',
  '',
  '3. **第三条**：这里应该保持 3.',
].join('\n');

const renderPreview = (
  template: 'basic' | 'recruit' | 'summer' | 'guobi' | 'spring',
  typographyStyle: 'standard' | 'editorial' = 'standard',
  sourceMarkdown = markdown
) => {
  const config = {
    ...getWeChatTemplateDefaultConfig(template, typographyStyle),
    primaryColor: '#07c160',
    codeTheme: 'vsDark',
    macCodeBlock: true,
    lineNumbers: true,
    linkReferences: true,
    indent: false,
    justify: true,
    captionType: 'title',
    fontSize: 'Medium',
    lineHeight: 'comfortable',
    template,
    typographyStyle: template === 'basic' ? typographyStyle : 'standard',
    fontStyle: 'standard',
  } as const;

  return renderToStaticMarkup(
    <WeChatPreview
      markdown={sourceMarkdown}
      config={config as any}
      imagePool={{}}
      isDarkMode={false}
      visible
    />
  );
};

test('preserves ordered list numbering after an intervening image block in standard wechat mode', () => {
  const html = renderPreview('basic', 'standard');
  const orderedLists = html.match(/<ol\b[^>]*>/g) ?? [];

  assert.equal(orderedLists.length, 2);
  assert.match(orderedLists[1], /\bstart="2"/);
});

test('preserves ordered list numbering after an intervening image block in editorial wechat mode', () => {
  const html = renderPreview('basic', 'editorial');
  const orderedLists = html.match(/<ol\b[^>]*>/g) ?? [];

  assert.equal(orderedLists.length, 2);
  assert.match(orderedLists[1], /\bstart="2"/);
});

test('preserves ordered list numbering after an intervening image block in recruit wechat mode', () => {
  const html = renderPreview('recruit');
  const orderedLists = html.match(/<ol\b[^>]*>/g) ?? [];

  assert.equal(orderedLists.length, 2);
  assert.match(orderedLists[1], /\bstart="2"/);
});

test('renders standalone markdown images outside paragraph tags in wechat mode', () => {
  const html = renderPreview('basic', 'standard');

  assert.doesNotMatch(html, /<p\b[^>]*>\s*<section\b/i);
  assert.doesNotMatch(html, /<\/section>\s*<\/p>/i);
});

test('renders adjacent standalone markdown images outside paragraph tags in wechat mode', () => {
  const adjacentImagesMarkdown = [
    '![第一张](https://example.com/one.png)',
    '![第二张](https://example.com/two.png)',
  ].join('\n');

  const html = renderPreview('basic', 'standard', adjacentImagesMarkdown);

  assert.doesNotMatch(html, /<p\b[^>]*>\s*<section\b/i);
  assert.doesNotMatch(html, /<\/section>\s*<\/p>/i);
});

test('drops empty headings in basic wechat mode', () => {
  const html = renderPreview('basic', 'standard', ['正文内容。', '', '##'].join('\n'));

  assert.doesNotMatch(html, /<h2\b[^>]*>\s*<\/h2>/);
});

test('does not turn empty headings into winter section cards', () => {
  const html = renderPreview('recruit', 'standard', ['正文内容。', '', '##'].join('\n'));

  assert.doesNotMatch(html, /章节/);
});

test('renders summer sections without decorative placeholder nodes', () => {
  const summerMarkdown = [
    '## 夏日观察',
    '',
    '这一节用于触发夏天主题容器。',
  ].join('\n');

  const html = renderPreview('summer', 'standard', summerMarkdown);
  assert.match(html, /夏日观察/);
  assert.doesNotMatch(html, /data-mp-wechat-decorative="true"/);
});

test('keeps spring decorations in wechat-compatible markup', () => {
  const springMarkdown = [
    '## 春日观察',
    '',
    '这一节用于触发春天主题容器。',
  ].join('\n');

  const html = renderPreview('spring', 'standard', springMarkdown);

  assert.match(html, /wx-spring-deco-title-brush-bg-v1\.png/);
  assert.match(html, /wx-spring-deco-leaf-corner-top-left-v1\.png/);
  assert.match(html, /wx-spring-deco-leaf-corner-right-v1\.png/);
  assert.match(html, /wx-spring-deco-divider-wave-thin-v1\.png/);
  assert.match(html, /data-mp-wechat-decoration="flow"/);
  assert.doesNotMatch(html, /data-mp-wechat-decorative="true"/);
  assert.doesNotMatch(html, /<img\b[^>]*wx-spring-deco-leaf-corner/);
});

test('renders winter terminal stripe as background decoration', () => {
  const winterMarkdown = [
    '## 冬日观察',
    '',
    '![末尾图片](https://example.com/tail.png)',
  ].join('\n');

  const html = renderPreview('recruit', 'standard', winterMarkdown);

  assert.match(html, /background-image:linear-gradient\(to right/);
  assert.match(html, /background-position:left bottom/);
  assert.doesNotMatch(html, /margin-top:14px;width:100%;height:12px/);
});

test('renders guobi cards with blockquote containers for better wechat compatibility', () => {
  const guobiMarkdown = [
    '## 果比卡片',
    '',
    '这一节用于触发秋主题容器。',
  ].join('\n');

  const html = renderPreview('guobi', 'standard', guobiMarkdown);
  assert.match(html, /<blockquote\b[^>]*>/);
});
