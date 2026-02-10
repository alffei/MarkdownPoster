#!/usr/bin/env node

/**
 * 模块说明：注释门禁校验脚本，用于检测改动是否仅包含注释变化。
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';

const CODE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);

function runGit(args) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function parseArgs(argv) {
  const args = { base: 'HEAD', staged: false, allowNewFiles: false };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--base' && argv[i + 1]) {
      args.base = argv[i + 1];
      i += 1;
      continue;
    }
    if (token === '--staged') {
      args.staged = true;
    }
    if (token === '--allow-new-files') {
      args.allowNewFiles = true;
    }
  }
  return args;
}

function scriptKindForFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.ts') return ts.ScriptKind.TS;
  if (ext === '.tsx') return ts.ScriptKind.TSX;
  if (ext === '.jsx') return ts.ScriptKind.JSX;
  return ts.ScriptKind.JS;
}

function stripCommentsWithTs(sourceText, filePath) {
  // 在 JSX 里，`{/* ... */}` 不属于普通词法注释，需要先清理。
  const sourceWithoutJsxComments = sourceText.replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '');
  const result = ts.transpileModule(sourceWithoutJsxComments, {
    compilerOptions: {
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.Preserve,
      removeComments: true,
      newLine: ts.NewLineKind.LineFeed,
    },
    fileName: filePath,
    reportDiagnostics: false,
  });
  return result.outputText
    .split('\n')
    .map(line => line.trimEnd())
    .filter((line, idx, arr) => !(line === '' && arr[idx - 1] === ''))
    .join('\n')
    .trim();
}

function getChangedFiles({ base, staged }) {
  const args = staged
    ? ['diff', '--cached', '--name-only', '--diff-filter=ACMR']
    : ['diff', '--name-only', '--diff-filter=ACMR', base];
  const output = runGit(args);
  const tracked = output ? output.split('\n').map(line => line.trim()).filter(Boolean) : [];
  if (staged) return tracked;

  // 非 staged 模式下，把未跟踪文件也纳入检查范围，避免漏检新增代码文件。
  const untrackedOutput = runGit(['ls-files', '--others', '--exclude-standard']);
  const untracked = untrackedOutput
    ? untrackedOutput.split('\n').map(line => line.trim()).filter(Boolean)
    : [];
  return Array.from(new Set([...tracked, ...untracked]));
}

function getOldContent(baseRef, filePath) {
  try {
    return runGit(['show', `${baseRef}:${filePath}`]);
  } catch (error) {
    return null;
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const changedFiles = getChangedFiles(args);
  const codeFiles = changedFiles.filter(file => CODE_EXTENSIONS.has(path.extname(file).toLowerCase()));

  if (codeFiles.length === 0) {
    console.log('[check-comment-only] No changed code files detected.');
    return;
  }

  const failures = [];

  for (const file of codeFiles) {
    if (file.endsWith('.d.ts')) continue;
    if (!fs.existsSync(file)) continue;
    const oldText = getOldContent(args.base, file);
    if (oldText === null) {
      if (args.allowNewFiles) continue;
      failures.push({ file, reason: 'File is new or missing in base ref' });
      continue;
    }

    const newText = fs.readFileSync(file, 'utf8');

    const oldCompiled = stripCommentsWithTs(oldText, file);
    const newCompiled = stripCommentsWithTs(newText, file);

    // 去注释后的结果不同，说明存在真实逻辑变化，不属于“纯注释改动”。
    if (oldCompiled !== newCompiled) {
      failures.push({ file, reason: 'Non-comment code changes detected' });
    }
  }

  if (failures.length > 0) {
    console.error('[check-comment-only] FAILED');
    for (const failure of failures) {
      console.error(`- ${failure.file}: ${failure.reason}`);
    }
    process.exit(1);
  }

  console.log(`[check-comment-only] PASS (${codeFiles.length} code file(s) checked)`);
}

main();
