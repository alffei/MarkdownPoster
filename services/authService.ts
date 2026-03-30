/**
 * 模块说明：统一后端认证接入，负责 SSO 跳转、换票、刷新、登出与本地会话存储。
 */

const env = (import.meta as { env?: Record<string, string> }).env ?? {};

const STORAGE_KEY_ACCESS_TOKEN = 'mdp_auth_access_token';
const STORAGE_KEY_ACCESS_TOKEN_EXPIRES_AT = 'mdp_auth_access_token_expires_at';
const STORAGE_KEY_AUTH_USER = 'mdp_auth_user';
const STORAGE_KEY_STATE_TICKET = 'mdp_auth_state_ticket';
const AUTH_CHANGE_EVENT = 'mdp-auth-changed';

import {
  isLocalDevelopmentHost,
  resolveRedirectUri,
  resolveReturnTo,
  resolveUniversalApiBase,
  resolveUniversalAppId,
} from './universalConfig';
import { fetchWithTimeout } from './requestTimeout';

export interface AuthUser {
  id: string;
  name?: string | null;
  email?: string | null;
}

export interface AuthSession {
  accessToken: string;
  expiresAt: number | null;
  user: AuthUser | null;
}

export interface CreditBalanceSnapshot {
  balance: number;
  daily_limit: number;
  last_recovery_time?: number | null;
  last_reset_date?: string | null;
  next_recovery_time?: number | null;
  next_reset_time?: number | null;
}

type AuthorizeUrlResponse = {
  authorize_url: string;
  state_ticket: string;
  expires_in: number;
};

type TokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  user?: AuthUser;
};

type LogoutResponse = {
  ok: boolean;
  sso_logout_url: string;
};

type ErrorDetail = string | { detail?: unknown; message?: unknown; error_code?: unknown } | null;

export class AuthError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status = 401) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    this.status = status;
  }
}

const isBrowser = () => typeof window !== 'undefined';

const getApiBase = () => resolveUniversalApiBase(env);
export const getUniversalAppId = () => resolveUniversalAppId(env);

export const getRedirectUri = () => {
  if (!isBrowser()) return '';
  return resolveRedirectUri(env, window.location);
};

export const getReturnTo = () => {
  if (!isBrowser()) return '';
  return resolveReturnTo(env, window.location, getRedirectUri());
};

const emitAuthChanged = () => {
  if (!isBrowser()) return;
  window.dispatchEvent(new CustomEvent(AUTH_CHANGE_EVENT));
};

const safeSessionStorage = () => {
  if (!isBrowser()) return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};

const parseErrorMessage = (detail: ErrorDetail, fallback: string) => {
  if (!detail) return fallback;
  if (typeof detail === 'string') return detail;
  const errorCode = typeof detail.error_code === 'string' ? detail.error_code : '';
  const message = typeof detail.message === 'string'
    ? detail.message
    : typeof detail.detail === 'string'
      ? detail.detail
      : '';

  if (errorCode === 'INSUFFICIENT_CREDITS') return '积分不足，请稍后再试';
  if (errorCode === 'AI_REQUEST_REPLAYED') return '检测到重复请求，请重试';
  if (message) return message;
  return fallback;
};

const parseErrorCode = (detail: ErrorDetail, fallback: string) => {
  if (!detail) return fallback;
  if (typeof detail === 'string') return detail;
  if (typeof detail.error_code === 'string') return detail.error_code;
  if (typeof detail.detail === 'string') return detail.detail;
  return fallback;
};

const parseJson = async <T>(response: Response): Promise<T | null> => {
  const text = await response.text();
  if (!text) return null;
  return JSON.parse(text) as T;
};

const buildRequestUrl = (path: string) => {
  if (/^https?:\/\//i.test(path)) return path;
  return `${getApiBase()}${path.startsWith('/') ? path : `/${path}`}`;
};

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetchWithTimeout(buildRequestUrl(path), {
    credentials: 'include',
    ...init,
    headers: {
      ...(init?.headers || {}),
    },
  }, {
    timeoutMessage: '认证服务响应超时，请稍后重试',
  });

  const body = await parseJson<T | { detail?: unknown; message?: unknown; error_code?: unknown }>(response);
  if (!response.ok) {
    const detail = body as ErrorDetail;
    const code = parseErrorCode(detail, `HTTP_${response.status}`);
    const message = parseErrorMessage(detail, `请求失败（${response.status}）`);
    throw new AuthError(code, message, response.status);
  }
  return body as T;
}

const readStoredUser = (): AuthUser | null => {
  const storage = safeSessionStorage();
  if (!storage) return null;
  const raw = storage.getItem(STORAGE_KEY_AUTH_USER);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as AuthUser;
    if (!parsed || typeof parsed !== 'object' || typeof parsed.id !== 'string') return null;
    return parsed;
  } catch {
    return null;
  }
};

export const readStoredSession = (): AuthSession | null => {
  const storage = safeSessionStorage();
  if (!storage) return null;

  const accessToken = storage.getItem(STORAGE_KEY_ACCESS_TOKEN)?.trim() || '';
  if (!accessToken) return null;

  const expiresAtRaw = storage.getItem(STORAGE_KEY_ACCESS_TOKEN_EXPIRES_AT);
  const expiresAt = expiresAtRaw ? Number.parseInt(expiresAtRaw, 10) : Number.NaN;

  return {
    accessToken,
    expiresAt: Number.isFinite(expiresAt) ? expiresAt : null,
    user: readStoredUser(),
  };
};

export const isStoredSessionExpired = () => {
  const session = readStoredSession();
  if (!session?.expiresAt) return false;
  return session.expiresAt <= Date.now();
};

export const persistSession = (payload: TokenResponse) => {
  const storage = safeSessionStorage();
  if (!storage) return;

  storage.setItem(STORAGE_KEY_ACCESS_TOKEN, payload.access_token);
  storage.setItem(
    STORAGE_KEY_ACCESS_TOKEN_EXPIRES_AT,
    String(Date.now() + Math.max(0, payload.expires_in) * 1000)
  );

  if (payload.user) {
    storage.setItem(STORAGE_KEY_AUTH_USER, JSON.stringify(payload.user));
  }

  emitAuthChanged();
};

export const clearStoredSession = () => {
  const storage = safeSessionStorage();
  if (!storage) return;

  storage.removeItem(STORAGE_KEY_ACCESS_TOKEN);
  storage.removeItem(STORAGE_KEY_ACCESS_TOKEN_EXPIRES_AT);
  storage.removeItem(STORAGE_KEY_AUTH_USER);
  emitAuthChanged();
};

const storeStateTicket = (stateTicket: string) => {
  const storage = safeSessionStorage();
  if (!storage) return;
  storage.setItem(STORAGE_KEY_STATE_TICKET, stateTicket);
};

const consumeStateTicket = () => {
  const storage = safeSessionStorage();
  if (!storage) return '';
  const value = storage.getItem(STORAGE_KEY_STATE_TICKET) || '';
  storage.removeItem(STORAGE_KEY_STATE_TICKET);
  return value;
};

export const addAuthChangeListener = (listener: () => void) => {
  if (!isBrowser()) return () => {};
  window.addEventListener(AUTH_CHANGE_EVENT, listener);
  return () => window.removeEventListener(AUTH_CHANGE_EVENT, listener);
};

export const getStoredAccessToken = () => readStoredSession()?.accessToken || '';

export const getStoredUser = () => readStoredSession()?.user || null;

export const buildLoginUrl = async () => {
  const appId = getUniversalAppId();
  const redirectUri = getRedirectUri();
  const returnTo = getReturnTo();

  if (isBrowser() && isLocalDevelopmentHost(window.location) && !String(env.VITE_RRZXS_REDIRECT_URI || '').trim()) {
    throw new AuthError(
      'AUTH_REDIRECT_URI_REQUIRED',
      '当前是本地开发地址，请先配置 VITE_RRZXS_REDIRECT_URI 为已加入白名单的线上回调地址，或改为在 rrzxs.com 同域地址联调。',
      400
    );
  }

  const query = new URLSearchParams({
    app_id: appId,
    redirect_uri: redirectUri,
    return_to: returnTo || redirectUri,
  });

  const response = await requestJson<AuthorizeUrlResponse>(`/auth/sso/authorize-url?${query.toString()}`, {
    method: 'GET',
  });
  storeStateTicket(response.state_ticket);
  return response.authorize_url;
};

export const startSsoLogin = async () => {
  if (!isBrowser()) return;
  const authorizeUrl = await buildLoginUrl();
  window.location.assign(authorizeUrl);
};

export const exchangeSsoCode = async (code: string, state: string) => {
  const stateTicket = consumeStateTicket();
  if (!stateTicket) {
    throw new AuthError('INVALID_STATE_TICKET', '登录态已过期，请重新发起登录');
  }

  const payload = await requestJson<TokenResponse>('/auth/sso/exchange', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      app_id: getUniversalAppId(),
      state_ticket: stateTicket,
      code,
      state,
      redirect_uri: getRedirectUri(),
    }),
  });

  persistSession(payload);
  return payload;
};

export const refreshAccessToken = async () => {
  const payload = await requestJson<TokenResponse>('/auth/refresh', {
    method: 'POST',
    headers: {
      'X-App-Id': getUniversalAppId(),
    },
  });

  const currentUser = getStoredUser();
  persistSession({
    ...payload,
    user: currentUser ?? payload.user ?? undefined,
  });
  return readStoredSession();
};

export const logoutFromUniversalBackend = async () => {
  let payload: LogoutResponse | null = null;
  try {
    payload = await requestJson<LogoutResponse>('/auth/logout', {
      method: 'POST',
    });
  } finally {
    clearStoredSession();
  }
  return payload;
};

export const tryRestoreSession = async () => {
  try {
    return await refreshAccessToken();
  } catch (error) {
    clearStoredSession();
    return null;
  }
};

export const extractSsoCallbackParams = () => {
  if (!isBrowser()) return null;
  const url = new URL(window.location.href);
  const code = url.searchParams.get('code')?.trim() || '';
  const state = url.searchParams.get('state')?.trim() || '';
  if (!code || !state) return null;
  return { code, state, url };
};

export const clearSsoCallbackParams = (url?: URL) => {
  if (!isBrowser()) return;
  const nextUrl = url ? new URL(url.toString()) : new URL(window.location.href);
  nextUrl.searchParams.delete('code');
  nextUrl.searchParams.delete('state');
  nextUrl.searchParams.delete('scope');
  nextUrl.searchParams.delete('authuser');
  nextUrl.searchParams.delete('prompt');
  window.history.replaceState({}, document.title, `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
};

export const fetchCreditBalance = async () => {
  const doFetch = async (accessToken: string) => {
    const response = await fetchWithTimeout(buildRequestUrl('/credits/balance'), {
      method: 'GET',
      credentials: 'include',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-App-Id': getUniversalAppId(),
      },
    }, {
      timeoutMessage: '积分查询超时，请稍后重试',
    });

    const body = await parseJson<CreditBalanceSnapshot | { detail?: unknown; message?: unknown; error_code?: unknown }>(response);
    if (!response.ok) {
      const detail = body as ErrorDetail;
      throw new AuthError(
        parseErrorCode(detail, `HTTP_${response.status}`),
        parseErrorMessage(detail, '积分查询失败'),
        response.status
      );
    }
    return body as CreditBalanceSnapshot;
  };

  let session = readStoredSession();
  if (!session?.accessToken) {
    session = await refreshAccessToken().catch(() => null);
  }
  if (!session?.accessToken) {
    throw new AuthError('AUTH_LOGIN_REQUIRED', '请先登录后再查看积分');
  }

  try {
    return await doFetch(session.accessToken);
  } catch (error) {
    if (!isAuthError(error) || error.status !== 401) {
      throw error;
    }

    const refreshed = await refreshAccessToken().catch(() => null);
    if (!refreshed?.accessToken) {
      throw new AuthError('AUTH_LOGIN_REQUIRED', '请先登录后再查看积分');
    }
    return doFetch(refreshed.accessToken);
  }
};

export const isAuthError = (error: unknown): error is AuthError => error instanceof AuthError;
