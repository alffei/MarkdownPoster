import test from 'node:test';
import assert from 'node:assert/strict';

import { fetchWithTimeout, RequestTimeoutError } from '../services/requestTimeout';

const originalFetch = globalThis.fetch;

test.afterEach(() => {
  globalThis.fetch = originalFetch;
});

test('fetchWithTimeout rejects stalled requests with RequestTimeoutError', async () => {
  globalThis.fetch = ((_: RequestInfo | URL, init?: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => {
        reject(new DOMException('The operation was aborted.', 'AbortError'));
      }, { once: true });
    })) as typeof fetch;

  await assert.rejects(
    fetchWithTimeout('https://example.com/api/auth/refresh', undefined, {
      timeoutMs: 20,
      timeoutMessage: '认证服务响应超时，请稍后重试',
    }),
    error =>
      error instanceof RequestTimeoutError &&
      error.message === '认证服务响应超时，请稍后重试'
  );
});

test('fetchWithTimeout preserves successful responses', async () => {
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    })) as typeof fetch;

  const response = await fetchWithTimeout('https://example.com/api/ping', undefined, {
    timeoutMs: 20,
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
});
