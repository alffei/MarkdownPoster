/**
 * 模块说明：RRZXS 通用后端前端配置解析，统一处理 API Base、app_id、redirect_uri 与 return_to。
 */

const DEFAULT_API_BASE = '/api/v1';
const DEFAULT_APP_ID = 'mdp';

type EnvLike = Record<string, string | undefined>;

type LocationLike = {
  origin: string;
  pathname: string;
  search?: string;
  hash?: string;
  hostname?: string;
};

const trim = (value: string | undefined) => String(value || '').trim();

export const normalizeBaseUrl = (url: string) => url.replace(/\/+$/, '');

export const normalizePublicBase = (value: string) => {
  const raw = value.trim();
  if (!raw || raw === '/') return '/';
  const withLeadingSlash = raw.startsWith('/') ? raw : `/${raw}`;
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`;
};

export const hasFileExtension = (pathname: string) => /\/[^/]+\.[a-z0-9]+$/i.test(pathname);

export const resolveUniversalApiBase = (env: EnvLike) =>
  normalizeBaseUrl(trim(env.VITE_RRZXS_API_BASE) || DEFAULT_API_BASE);

export const resolveUniversalAppId = (env: EnvLike) =>
  trim(env.VITE_RRZXS_APP_ID) || DEFAULT_APP_ID;

export const resolveCanonicalRedirectPath = (pathname: string, publicBase?: string) => {
  const normalizedPublicBase = normalizePublicBase(trim(publicBase || ''));
  if (normalizedPublicBase !== '/') {
    return normalizedPublicBase;
  }

  if (!pathname || pathname === '/') return '/';
  if (hasFileExtension(pathname)) return pathname;
  return pathname.endsWith('/') ? pathname : `${pathname}/`;
};

export const resolveRedirectUri = (env: EnvLike, location: LocationLike | null) => {
  const configured = trim(env.VITE_RRZXS_REDIRECT_URI);
  if (configured) return configured;
  if (!location) return '';

  const path = resolveCanonicalRedirectPath(location.pathname, env.VITE_PUBLIC_BASE);
  return `${location.origin}${path}`;
};

export const resolveReturnTo = (env: EnvLike, location: LocationLike | null, redirectUri: string) => {
  const configured = trim(env.VITE_RRZXS_RETURN_TO);
  if (configured) return configured;
  if (!location) return redirectUri;
  return `${location.origin}${location.pathname}${location.search || ''}${location.hash || ''}`;
};

export const isLocalDevelopmentHost = (location: LocationLike | null) => {
  const host = String(location?.hostname || '').trim().toLowerCase();
  return host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0';
};

