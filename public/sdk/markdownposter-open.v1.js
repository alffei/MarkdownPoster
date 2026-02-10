/**
 * 模块说明：对外 SDK 文件，提供第三方页面一键打开并导入 Markdown 的能力。
 */

(function (global) {
  'use strict';

  var VERSION = '1.0.0';
  var DEFAULTS = {
    importPath: '/import',
    maxUrlEncoded: 4000,
    maxPmBytes: 200 * 1024,
    maxChars: 120000,
    timeoutMs: 10000
  };

  function utf8Bytes(input) {
    return new TextEncoder().encode(input);
  }

  function byteLength(input) {
    return utf8Bytes(input).length;
  }

  function toBase64Url(input) {
    // 地址栏通道要求可安全放入 hash，采用 base64url 编码。
    var bytes = utf8Bytes(input);
    var binary = '';
    var chunkSize = 0x8000;
    for (var i = 0; i < bytes.length; i += chunkSize) {
      var chunk = bytes.subarray(i, i + chunkSize);
      for (var j = 0; j < chunk.length; j += 1) {
        binary += String.fromCharCode(chunk[j]);
      }
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  function randomNonce() {
    if (global.crypto && typeof global.crypto.randomUUID === 'function') {
      return global.crypto.randomUUID();
    }
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  function resolveScriptOrigin() {
    if (document.currentScript && document.currentScript.src) {
      try {
        return new URL(document.currentScript.src).origin;
      } catch (error) {
        // 忽略并继续使用回退方案
      }
    }

    // 当前脚本定位不可用时，回退到最后一个匹配 SDK 名称的 script 标签。
    var scripts = document.getElementsByTagName('script');
    for (var i = scripts.length - 1; i >= 0; i -= 1) {
      var src = scripts[i].src;
      if (src && src.indexOf('markdownposter-open') >= 0) {
        try {
          return new URL(src).origin;
        } catch (error) {
          // 忽略并继续回退
        }
      }
    }
    return global.location.origin;
  }

  function buildImportUrl(opts, source) {
    var base = opts.targetOrigin || resolveScriptOrigin();
    var path = opts.importPath || DEFAULTS.importPath;
    var url = new URL(path, base);
    if (source) {
      url.searchParams.set('mp_source', source);
    }
    return url;
  }

  function openWithUrl(url) {
    var child = global.open(url.toString(), '_blank');
    if (!child) {
      return { ok: false, code: 'popup_blocked', message: 'popup blocked' };
    }
    return { ok: true, channel: 'url', openedUrl: url.toString() };
  }

  function openWithPostMessage(url, markdown, source, opts) {
    var nonce = randomNonce();
    url.searchParams.set('mp_channel', 'pm');
    url.searchParams.set('mp_nonce', nonce);

    var child = global.open(url.toString(), '_blank');
    if (!child) {
      return Promise.resolve({ ok: false, code: 'popup_blocked', message: 'popup blocked' });
    }

    var timeoutMs = typeof opts.timeoutMs === 'number' ? opts.timeoutMs : DEFAULTS.timeoutMs;
    var targetOrigin = url.origin;

    return new Promise(function (resolve) {
      var done = false;
      var timeoutId = null;

      function cleanup() {
        if (done) return;
        done = true;
        global.removeEventListener('message', onMessage);
        if (timeoutId) {
          global.clearTimeout(timeoutId);
        }
      }

      function resolveOnce(result) {
        cleanup();
        resolve(result);
      }

      function onMessage(event) {
        if (event.source !== child) return;
        if (event.origin !== targetOrigin) return;

        var data = event.data || {};
        if (data.type === 'markdownposter.import.ready') {
          // 收到 ready 后再发送正文，避免新窗口尚未完成监听。
          if (data.nonce && data.nonce !== nonce) return;
          child.postMessage(
            {
              type: 'markdownposter.import.payload',
              nonce: nonce,
              markdown: markdown,
              source: source,
              version: 1
            },
            targetOrigin
          );
          return;
        }

        if (data.type === 'markdownposter.import.ack') {
          // 应答消息作为最终态，统一收敛调用结果。
          if (data.nonce && data.nonce !== nonce) return;
          if (data.status === 'ok') {
            resolveOnce({ ok: true, channel: 'postMessage', openedUrl: url.toString() });
            return;
          }
          resolveOnce({
            ok: false,
            code: data.code || 'import_failed',
            message: data.message || 'import failed'
          });
        }
      }

      global.addEventListener('message', onMessage);
      timeoutId = global.setTimeout(function () {
        resolveOnce({ ok: false, code: 'timeout', message: 'import timeout' });
      }, timeoutMs);
    });
  }

  function openMarkdownPoster(options) {
    var opts = options || {};
    var markdown = typeof opts.markdown === 'string' ? opts.markdown : '';
    var source = typeof opts.source === 'string' && opts.source ? opts.source : global.location.origin;
    var maxChars = typeof opts.maxChars === 'number' ? opts.maxChars : DEFAULTS.maxChars;
    var maxUrlEncoded = typeof opts.maxUrlEncoded === 'number' ? opts.maxUrlEncoded : DEFAULTS.maxUrlEncoded;
    var maxPmBytes = typeof opts.maxPmBytes === 'number' ? opts.maxPmBytes : DEFAULTS.maxPmBytes;

    if (!markdown) {
      return Promise.resolve({ ok: false, code: 'empty_markdown', message: 'markdown is empty' });
    }
    if (markdown.length > maxChars) {
      return Promise.resolve({ ok: false, code: 'too_large', message: 'markdown too large' });
    }

    var url = buildImportUrl(opts, source);
    var encoded = toBase64Url(markdown);
    if (encoded.length <= maxUrlEncoded) {
      // 短文本优先 URL 通道，调用链最短、兼容性最好。
      url.hash = 'mpmd=' + encoded + '&mpv=1';
      return Promise.resolve(openWithUrl(url));
    }

    var payloadBytes = byteLength(markdown);
    if (payloadBytes > maxPmBytes) {
      return Promise.resolve({
        ok: false,
        code: 'too_large',
        message: 'markdown payload exceeds postMessage threshold'
      });
    }

    // 超过 URL 阈值后切到 postMessage 握手通道。
    return openWithPostMessage(url, markdown, source, opts);
  }

  var api = global.MarkdownPoster || {};
  api.version = VERSION;
  api.open = openMarkdownPoster;
  global.MarkdownPoster = api;
})(window);
