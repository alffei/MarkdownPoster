import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizePublicBase,
  resolveCanonicalRedirectPath,
  resolveRedirectUri,
  resolveReturnTo,
  resolveUniversalApiBase,
  resolveUniversalAppId,
} from '../services/universalConfig';

test('resolveUniversalAppId falls back to mdp', () => {
  assert.equal(resolveUniversalAppId({}), 'mdp');
  assert.equal(resolveUniversalAppId({ VITE_RRZXS_APP_ID: 'markdown_poster' }), 'markdown_poster');
});

test('resolveUniversalApiBase trims trailing slashes', () => {
  assert.equal(resolveUniversalApiBase({}), '/api/v1');
  assert.equal(resolveUniversalApiBase({ VITE_RRZXS_API_BASE: 'https://rrzxs.com/api/v1/' }), 'https://rrzxs.com/api/v1');
});

test('normalizePublicBase keeps directory style path', () => {
  assert.equal(normalizePublicBase('/mdp'), '/mdp/');
  assert.equal(normalizePublicBase('mdp/'), '/mdp/');
  assert.equal(normalizePublicBase('/'), '/');
});

test('resolveCanonicalRedirectPath prefers configured public base', () => {
  assert.equal(resolveCanonicalRedirectPath('/anything', '/mdp/'), '/mdp/');
});

test('resolveCanonicalRedirectPath normalizes directory pathnames', () => {
  assert.equal(resolveCanonicalRedirectPath('/mdp', ''), '/mdp/');
  assert.equal(resolveCanonicalRedirectPath('/mdp/', ''), '/mdp/');
  assert.equal(resolveCanonicalRedirectPath('/mdp/index.html', ''), '/mdp/index.html');
});

test('resolveRedirectUri uses explicit env override when provided', () => {
  assert.equal(
    resolveRedirectUri(
      { VITE_RRZXS_REDIRECT_URI: 'https://rrzxs.com/mdp/' },
      { origin: 'https://localhost:3000', pathname: '/' }
    ),
    'https://rrzxs.com/mdp/'
  );
});

test('resolveRedirectUri derives stable subpath callback from public base', () => {
  assert.equal(
    resolveRedirectUri(
      { VITE_PUBLIC_BASE: '/mdp/' },
      { origin: 'https://rrzxs.com', pathname: '/mdp' }
    ),
    'https://rrzxs.com/mdp/'
  );
});

test('resolveReturnTo preserves current location by default', () => {
  assert.equal(
    resolveReturnTo(
      {},
      { origin: 'https://rrzxs.com', pathname: '/mdp/', search: '?palette=1', hash: '#preview' },
      'https://rrzxs.com/mdp/'
    ),
    'https://rrzxs.com/mdp/?palette=1#preview'
  );
});
