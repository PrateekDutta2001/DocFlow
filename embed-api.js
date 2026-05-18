/**
 * DocFlow embed configuration (load before script.js) and host bridge.
 */
(function (global) {
  const VERSION = '1.0.0';
  const MESSAGE_SOURCE = 'docflow';
  const HOST_SOURCE = 'docflow-host';

  function parseEmbedConfig() {
    const params = new URLSearchParams(global.location.search);
    const embed =
      params.get('embed') === '1' ||
      params.get('embed') === 'true' ||
      global.parent !== global;

    const allowedOrigins = (params.get('origin') || '')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);

    return {
      embed,
      hideFooter: params.get('footer') === '0',
      hideMenubar: params.get('menubar') === '0',
      hideStatusbar: params.get('statusbar') === '0',
      hideRuler: params.get('ruler') === '0',
      autosave: params.get('autosave') !== '0',
      readonly: params.get('readonly') === '1',
      storageKey: params.get('storageKey') || 'docflow_content',
      allowedOrigins,
      notifyChange: params.get('notifyChange') !== '0',
    };
  }

  global.DocFlowConfig = parseEmbedConfig();

  let parentOrigin = null;
  let changeTimer = null;

  function isAllowedOrigin(origin) {
    const { allowedOrigins } = global.DocFlowConfig;
    if (!allowedOrigins.length) return true;
    return allowedOrigins.includes(origin);
  }

  function postToParent(message, targetOrigin) {
    if (global.parent === global) return;
    const origin = targetOrigin || parentOrigin || '*';
    global.parent.postMessage({ source: MESSAGE_SOURCE, ...message }, origin);
  }

  function getSnapshot() {
    const api = global.DocFlow;
    if (!api) return { html: '', text: '', stats: { words: 0, characters: 0, lines: 0 } };
    return api.getContent();
  }

  function notifyContentChange() {
    if (!global.DocFlowConfig.embed || !global.DocFlowConfig.notifyChange) return;
    clearTimeout(changeTimer);
    changeTimer = setTimeout(() => {
      postToParent({ type: 'CHANGE', payload: getSnapshot() });
    }, 300);
  }

  function applyEmbedChrome() {
    const config = global.DocFlowConfig;
    if (!config.embed) return;

    document.documentElement.classList.add('docflow-embed-root');
    document.body.classList.add('docflow-embed');
    if (config.hideFooter) document.body.classList.add('docflow-hide-footer');
    if (config.hideMenubar) document.body.classList.add('docflow-hide-menubar');
    if (config.hideStatusbar) document.body.classList.add('docflow-hide-statusbar');
    if (config.hideRuler) document.body.classList.add('docflow-hide-ruler');

    const editor = document.getElementById('editor');
    if (editor && config.readonly) {
      editor.setAttribute('contenteditable', 'false');
    }
  }

  function reply(event, message) {
    if (!isAllowedOrigin(event.origin)) return;
    event.source.postMessage({ source: MESSAGE_SOURCE, ...message }, event.origin);
  }

  function handleHostMessage(event) {
    const data = event.data;
    if (!data || data.source !== HOST_SOURCE) return;
    if (!isAllowedOrigin(event.origin)) return;

    parentOrigin = event.origin;
    const api = global.DocFlow;
    if (!api) return;

    const { type, requestId, payload = {} } = data;

    switch (type) {
      case 'GET_CONTENT':
        reply(event, { type: 'CONTENT', requestId, payload: getSnapshot() });
        break;

      case 'SET_CONTENT':
        api.setContent(payload.html || '', { silent: !!payload.silent });
        if (!payload.silent) notifyContentChange();
        reply(event, { type: 'ACK', requestId, payload: { ok: true } });
        break;

      case 'GET_HTML':
        reply(event, {
          type: 'CONTENT',
          requestId,
          payload: { html: api.getContent().html },
        });
        break;

      case 'GET_TEXT':
        reply(event, {
          type: 'CONTENT',
          requestId,
          payload: { text: api.getContent().text },
        });
        break;

      case 'FOCUS':
        api.focus();
        reply(event, { type: 'ACK', requestId, payload: { ok: true } });
        break;

      case 'EXEC_COMMAND':
        api.execCommand(payload.command, payload.value ?? null);
        reply(event, { type: 'ACK', requestId, payload: { ok: true } });
        break;

      case 'CONFIGURE':
        Object.assign(global.DocFlowConfig, payload);
        applyEmbedChrome();
        reply(event, { type: 'ACK', requestId, payload: { ok: true } });
        break;

      case 'CLEAR':
        api.setContent('<p></p>', { silent: true });
        notifyContentChange();
        reply(event, { type: 'ACK', requestId, payload: { ok: true } });
        break;

      default:
        reply(event, {
          type: 'ERROR',
          requestId,
          payload: { message: `Unknown message type: ${type}` },
        });
    }
  }

  function initEmbedBridge() {
    applyEmbedChrome();

    global.addEventListener('message', handleHostMessage);

    global.DocFlowBridge = {
      notifyContentChange,
      postToParent,
      version: VERSION,
    };

    if (global.DocFlowConfig.embed && global.parent !== global) {
      postToParent({
        type: 'READY',
        payload: { version: VERSION, config: { ...global.DocFlowConfig } },
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEmbedBridge);
  } else {
    initEmbedBridge();
  }
})(window);
