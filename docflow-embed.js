/**
 * DocFlow Embed SDK — load this script in the host application to embed the editor.
 *
 * <script src="https://prateekdutta2001.github.io/DocFlow/docflow-embed.js"></script>
 */
(function (global) {
  const DEFAULT_BASE_URL = 'https://prateekdutta2001.github.io/DocFlow/';
  const HOST_SOURCE = 'docflow-host';
  const EDITOR_SOURCE = 'docflow';
  const VERSION = '1.0.0';

  function uid() {
    return `df-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  function buildEmbedUrl(baseUrl, options) {
    const url = new URL(baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);
    const params = url.searchParams;

    params.set('embed', '1');
    if (options.hideFooter) params.set('footer', '0');
    if (options.hideMenubar) params.set('menubar', '0');
    if (options.hideStatusbar) params.set('statusbar', '0');
    if (options.hideRuler) params.set('ruler', '0');
    if (options.autosave === false) params.set('autosave', '0');
    if (options.readonly) params.set('readonly', '1');
    if (options.storageKey) params.set('storageKey', options.storageKey);
    if (options.notifyChange === false) params.set('notifyChange', '0');
    if (options.allowedOrigin) params.set('origin', options.allowedOrigin);

    return url.toString();
  }

  class DocFlowEditor {
    constructor(options = {}) {
      this.options = {
        baseUrl: DEFAULT_BASE_URL,
        height: '600px',
        width: '100%',
        className: '',
        hideFooter: false,
        hideMenubar: false,
        hideStatusbar: false,
        hideRuler: false,
        autosave: true,
        readonly: false,
        notifyChange: true,
        storageKey: '',
        allowedOrigin: global.location.origin,
        initialContent: '',
        onReady: null,
        onChange: null,
        onError: null,
        ...options,
      };

      this.iframe = null;
      this.ready = false;
      this.pending = new Map();
      this.messageHandler = this.handleMessage.bind(this);
    }

    mount(container) {
      const target =
        typeof container === 'string'
          ? document.querySelector(container)
          : container;

      if (!target) {
        throw new Error('DocFlow: mount container not found');
      }

      this.iframe = document.createElement('iframe');
      this.iframe.title = 'DocFlow Editor';
      this.iframe.setAttribute(
        'allow',
        'clipboard-read; clipboard-write'
      );
      this.iframe.style.width = this.options.width;
      this.iframe.style.height = this.options.height;
      this.iframe.style.border = '0';
      this.iframe.style.display = 'block';
      this.iframe.className = this.options.className;
      this.iframe.src = buildEmbedUrl(this.options.baseUrl, this.options);

      global.addEventListener('message', this.messageHandler);
      target.appendChild(this.iframe);

      return this;
    }

    handleMessage(event) {
      if (this.iframe && event.source !== this.iframe.contentWindow) return;

      const data = event.data;
      if (!data || data.source !== EDITOR_SOURCE) return;

      const { type, requestId, payload } = data;

      if (requestId && this.pending.has(requestId)) {
        const { resolve, reject } = this.pending.get(requestId);
        this.pending.delete(requestId);
        if (type === 'ERROR') reject(new Error(payload?.message || 'DocFlow error'));
        else resolve(payload);
        return;
      }

      switch (type) {
        case 'READY':
          this.ready = true;
          if (this.options.initialContent) {
            this.setContent(this.options.initialContent, { silent: true }).catch(() => {});
          }
          if (typeof this.options.onReady === 'function') {
            this.options.onReady(this);
          }
          break;

        case 'CHANGE':
          if (typeof this.options.onChange === 'function') {
            this.options.onChange(payload, this);
          }
          break;

        default:
          break;
      }
    }

    post(type, payload = {}) {
      return new Promise((resolve, reject) => {
        if (!this.iframe?.contentWindow) {
          reject(new Error('DocFlow: editor not mounted'));
          return;
        }

        const requestId = uid();
        this.pending.set(requestId, { resolve, reject });

        this.iframe.contentWindow.postMessage(
          { source: HOST_SOURCE, type, requestId, payload },
          '*'
        );

        setTimeout(() => {
          if (this.pending.has(requestId)) {
            this.pending.delete(requestId);
            reject(new Error(`DocFlow: request timed out (${type})`));
          }
        }, 10000);
      });
    }

    whenReady() {
      if (this.ready) return Promise.resolve(this);
      return new Promise((resolve) => {
        const check = setInterval(() => {
          if (this.ready) {
            clearInterval(check);
            resolve(this);
          }
        }, 50);
      });
    }

    getContent() {
      return this.whenReady().then(() => this.post('GET_CONTENT'));
    }

    getHtml() {
      return this.whenReady().then(() => this.post('GET_HTML'));
    }

    getText() {
      return this.whenReady().then(() => this.post('GET_TEXT'));
    }

    setContent(html, options = {}) {
      return this.whenReady().then(() =>
        this.post('SET_CONTENT', { html, silent: options.silent })
      );
    }

    clear() {
      return this.whenReady().then(() => this.post('CLEAR'));
    }

    focus() {
      return this.whenReady().then(() => this.post('FOCUS'));
    }

    execCommand(command, value = null) {
      return this.whenReady().then(() =>
        this.post('EXEC_COMMAND', { command, value })
      );
    }

    configure(options) {
      return this.whenReady().then(() => this.post('CONFIGURE', options));
    }

    destroy() {
      global.removeEventListener('message', this.messageHandler);
      this.pending.clear();
      if (this.iframe?.parentNode) {
        this.iframe.parentNode.removeChild(this.iframe);
      }
      this.iframe = null;
      this.ready = false;
    }
  }

  global.DocFlowEmbed = {
    VERSION,
    DEFAULT_BASE_URL,
    create(options) {
      return new DocFlowEditor(options);
    },
    embed(container, options) {
      return new DocFlowEditor(options).mount(container);
    },
  };
})(typeof window !== 'undefined' ? window : this);
