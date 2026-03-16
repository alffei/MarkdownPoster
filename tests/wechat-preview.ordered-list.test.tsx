import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { WeChatPreview } from '../components/WeChatPreview';
import type { WeChatConfig } from '../types';

const config: WeChatConfig = {
  layout: 'Base',
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
};

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

test('preserves ordered list numbering after an intervening image block', () => {
  const html = renderToStaticMarkup(
    <WeChatPreview
      markdown={markdown}
      config={config}
      imagePool={{}}
      isDarkMode={false}
      visible
    />
  );

  const orderedLists = html.match(/<ol\b[^>]*>/g) ?? [];

  assert.equal(orderedLists.length, 2);
  assert.match(orderedLists[1], /\bstart="2"/);
});
