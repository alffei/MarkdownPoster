/**
 * 模块说明：为 fetch 请求提供超时控制，避免前端在网络抖动时无限等待。
 */

const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_TIMEOUT_MESSAGE = '请求超时，请稍后重试';

export class RequestTimeoutError extends Error {
  code: string;

  constructor(message = DEFAULT_TIMEOUT_MESSAGE) {
    super(message);
    this.name = 'RequestTimeoutError';
    this.code = 'REQUEST_TIMEOUT';
  }
}

const isAbortError = (error: unknown) =>
  (error instanceof DOMException && error.name === 'AbortError') ||
  (error instanceof Error && error.name === 'AbortError');

export const fetchWithTimeout = async (
  input: RequestInfo | URL,
  init?: RequestInit,
  options?: {
    timeoutMs?: number;
    timeoutMessage?: string;
  }
) => {
  const timeoutMs = Math.max(1, options?.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const timeoutMessage = options?.timeoutMessage?.trim() || DEFAULT_TIMEOUT_MESSAGE;
  const upstreamSignal = init?.signal;
  const controller = new AbortController();
  let timedOut = false;

  const handleUpstreamAbort = () => controller.abort();
  if (upstreamSignal) {
    if (upstreamSignal.aborted) {
      controller.abort();
    } else {
      upstreamSignal.addEventListener('abort', handleUpstreamAbort, { once: true });
    }
  }

  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (timedOut && isAbortError(error)) {
      throw new RequestTimeoutError(timeoutMessage);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
    upstreamSignal?.removeEventListener('abort', handleUpstreamAbort);
  }
};
