#!/usr/bin/env bash
set -euo pipefail

BASE_REF="${1:-HEAD}"
EXTRA_ARGS=()

if git ls-files --others --exclude-standard | rg -q '\.(ts|tsx|js|jsx|mjs|cjs)$'; then
  echo "[comment-guard] 检测到新增代码文件，临时启用 --allow-new-files"
  EXTRA_ARGS+=(--allow-new-files)
fi

echo "[comment-guard] Step 1/2: check comment-only diffs against ${BASE_REF}"
if [ "${#EXTRA_ARGS[@]}" -gt 0 ]; then
  node scripts/check-comment-only.mjs --base "${BASE_REF}" "${EXTRA_ARGS[@]}"
else
  node scripts/check-comment-only.mjs --base "${BASE_REF}"
fi

echo "[comment-guard] Step 2/2: build gate"
pnpm build

echo "[comment-guard] PASS"
