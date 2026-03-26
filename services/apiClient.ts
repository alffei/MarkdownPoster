/**
 * 模块说明：统一后端请求封装，负责鉴权头、401 自动刷新与幂等键生成。
 */

import {
  AuthError,
  getStoredAccessToken,
  getUniversalAppId,
  isAuthError,
  refreshAccessToken,
} from './authService';

type ErrorDetail = string | { detail?: unknown; message?: unknown; error_code?: unknown } | null;

const env = (import.meta as { env?: Record<string, string> }).env ?? {};

const normalizeBaseUrl = (url: string) => url.replace(/\/+$/, '');

const getApiBase = () => normalizeBaseUrl(String(env.VITE_RRZXS_API_BASE || '/api/v1').trim() || '/api/v1');

const buildUrl = (path: string) => {
  if (/^https?:\/\//i.test(path)) return path;
  return `${getApiBase()}${path.startsWith('/') ? path : `/${path}`}`;
};

const parseJson = async <T>(response: Response): Promise<T | null> => {
  const text = await response.text();
  if (!text) return null;
  return JSON.parse(text) as T;
};

const resolveErrorCode = (detail: ErrorDetail, status: number) => {
  if (!detail) return `HTTP_${status}`;
  if (typeof detail === 'string') return detail;
  if (typeof detail.error_code === 'string') return detail.error_code;
  if (typeof detail.detail === 'string') return detail.detail;
  return `HTTP_${status}`;
};

const resolveErrorMessage = (detail: ErrorDetail, status: number) => {
  if (!detail) return `请求失败（${status}）`;
  if (typeof detail === 'string') return detail;
  if (typeof detail.message === 'string') return detail.message;
  if (typeof detail.detail === 'string') return detail.detail;
  return `请求失败（${status}）`;
};

const buildHeaders = (headers?: HeadersInit, token?: string, idempotencyKey?: string) => {
  const next = new Headers(headers || {});
  next.set('X-App-Id', getUniversalAppId());
  if (token) next.set('Authorization', `Bearer ${token}`);
  if (idempotencyKey) next.set('X-Idempotency-Key', idempotencyKey);
  return next;
};

const doRequest = async <T>(path: string, init?: RequestInit, accessToken?: string, idempotencyKey?: string) => {
  const response = await fetch(buildUrl(path), {
    credentials: 'include',
    ...init,
    headers: buildHeaders(init?.headers, accessToken, idempotencyKey),
  });

  const body = await parseJson<T | { detail?: unknown; message?: unknown; error_code?: unknown }>(response);
  if (!response.ok) {
    const detail = body as ErrorDetail;
    throw new AuthError(
      resolveErrorCode(detail, response.status),
      resolveErrorMessage(detail, response.status),
      response.status
    );
  }
  return body as T;
};

export const createIdempotencyKey = () =>
  `mdp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export async function authenticatedJsonRequest<T>(
  path: string,
  init?: RequestInit,
  options?: { idempotencyKey?: string }
): Promise<T> {
  let accessToken = getStoredAccessToken();
  if (!accessToken) {
    const session = await refreshAccessToken().catch(() => null);
    accessToken = session?.accessToken || '';
  }

  if (!accessToken) {
    throw new AuthError('AUTH_LOGIN_REQUIRED', 'AI 功能需要登录后使用', 401);
  }

  try {
    return await doRequest<T>(path, init, accessToken, options?.idempotencyKey);
  } catch (error) {
    if (!isAuthError(error) || error.status !== 401) {
      throw error;
    }

    const session = await refreshAccessToken().catch(() => null);
    const refreshedToken = session?.accessToken || '';
    if (!refreshedToken) {
      throw new AuthError('AUTH_LOGIN_REQUIRED', 'AI 功能需要登录后使用', 401);
    }

    return doRequest<T>(path, init, refreshedToken, options?.idempotencyKey);
  }
}
