/**
 * Browser Control Service — voice-driven browser interaction.
 *
 * Provides capabilities to:
 * - Open new tabs/windows in Chrome, Edge, Safari
 * - Navigate to URLs
 * - Search the web via voice commands
 * - Control page elements (scroll, click, go back/forward)
 * - Read page content aloud
 * - Extract information from pages
 *
 * Works by dispatching commands to the browser extension API (Chrome/Edge)
 * or via the native Web APIs available in the PWA context.
 */

export type BrowserEngine = 'chrome' | 'edge' | 'safari' | 'auto';
export type SearchEngine = 'google' | 'bing' | 'duckduckgo';

export interface BrowserCommand {
  action: BrowserAction;
  payload?: Record<string, unknown>;
}

export type BrowserAction =
  | 'open_tab'
  | 'close_tab'
  | 'navigate'
  | 'search'
  | 'go_back'
  | 'go_forward'
  | 'refresh'
  | 'scroll_up'
  | 'scroll_down'
  | 'scroll_to_top'
  | 'scroll_to_bottom'
  | 'click'
  | 'read_page'
  | 'read_selection'
  | 'find_on_page'
  | 'bookmark'
  | 'screenshot'
  | 'switch_tab'
  | 'list_tabs';

export interface BrowserTab {
  id: number;
  title: string;
  url: string;
  active: boolean;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

// ─── Search Engine URLs ─────────────────────────────────────────────────────

const SEARCH_URLS: Record<SearchEngine, (query: string) => string> = {
  google: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}`,
  bing: (q) => `https://www.bing.com/search?q=${encodeURIComponent(q)}`,
  duckduckgo: (q) => `https://duckduckgo.com/?q=${encodeURIComponent(q)}`,
};

// ─── Browser Detection ──────────────────────────────────────────────────────

export function detectBrowser(): BrowserEngine {
  if (typeof navigator === 'undefined') return 'chrome';
  const ua = navigator.userAgent;
  if (ua.includes('Edg/')) return 'edge';
  if (ua.includes('Safari/') && !ua.includes('Chrome/')) return 'safari';
  return 'chrome';
}

export function getBrowserName(engine: BrowserEngine): string {
  const names: Record<BrowserEngine, string> = {
    chrome: 'Google Chrome',
    edge: 'Microsoft Edge',
    safari: 'Apple Safari',
    auto: getBrowserName(detectBrowser()),
  };
  return names[engine];
}

// ─── Browser Control Class ──────────────────────────────────────────────────

export class BrowserController {
  private searchEngine: SearchEngine = 'google';
  private currentBrowser: BrowserEngine;
  private extensionConnected = false;
  private commandHistory: BrowserCommand[] = [];

  constructor(preferredBrowser: BrowserEngine = 'auto') {
    this.currentBrowser = preferredBrowser === 'auto' ? detectBrowser() : preferredBrowser;
    this.tryConnectExtension();
  }

  /**
   * Attempt to connect to the J.A.R.G.I.I.N. browser extension.
   * The extension provides deeper control (tab management, content reading, etc.).
   */
  private tryConnectExtension(): void {
    // Check for extension message channel
    if (typeof window !== 'undefined') {
      window.addEventListener('message', (event) => {
        if (event.data?.source === 'jargiin-extension') {
          this.extensionConnected = true;
        }
      });
      // Ping extension
      window.postMessage({ source: 'jargiin-app', action: 'ping' }, '*');
    }
  }

  isExtensionConnected(): boolean {
    return this.extensionConnected;
  }

  getActiveBrowser(): BrowserEngine {
    return this.currentBrowser;
  }

  setSearchEngine(engine: SearchEngine): void {
    this.searchEngine = engine;
  }

  getSearchEngine(): SearchEngine {
    return this.searchEngine;
  }

  // ─── Navigation Commands ──────────────────────────────────────────────────

  /**
   * Open a new browser tab with the given URL.
   */
  openTab(url: string): void {
    this.log({ action: 'open_tab', payload: { url } });
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  /**
   * Navigate the current window to a URL.
   */
  navigate(url: string): void {
    this.log({ action: 'navigate', payload: { url } });
    // Ensure URL has protocol
    const fullUrl = url.match(/^https?:\/\//) ? url : `https://${url}`;
    window.open(fullUrl, '_blank', 'noopener,noreferrer');
  }

  /**
   * Search the web with the configured search engine.
   */
  search(query: string): void {
    this.log({ action: 'search', payload: { query, engine: this.searchEngine } });
    const url = SEARCH_URLS[this.searchEngine](query);
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  /**
   * Go back in browser history.
   */
  goBack(): void {
    this.log({ action: 'go_back' });
    if (this.extensionConnected) {
      this.sendToExtension('go_back');
    } else {
      window.history.back();
    }
  }

  /**
   * Go forward in browser history.
   */
  goForward(): void {
    this.log({ action: 'go_forward' });
    if (this.extensionConnected) {
      this.sendToExtension('go_forward');
    } else {
      window.history.forward();
    }
  }

  /**
   * Refresh the current page.
   */
  refresh(): void {
    this.log({ action: 'refresh' });
    if (this.extensionConnected) {
      this.sendToExtension('refresh');
    } else {
      window.location.reload();
    }
  }

  // ─── Page Interaction Commands ────────────────────────────────────────────

  /**
   * Scroll the page.
   */
  scroll(direction: 'up' | 'down' | 'top' | 'bottom'): void {
    const action = `scroll_${direction === 'top' ? 'to_top' : direction === 'bottom' ? 'to_bottom' : direction}` as BrowserAction;
    this.log({ action });

    if (this.extensionConnected) {
      this.sendToExtension(action);
      return;
    }

    switch (direction) {
      case 'up': window.scrollBy({ top: -400, behavior: 'smooth' }); break;
      case 'down': window.scrollBy({ top: 400, behavior: 'smooth' }); break;
      case 'top': window.scrollTo({ top: 0, behavior: 'smooth' }); break;
      case 'bottom': window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); break;
    }
  }

  /**
   * Find text on the current page.
   */
  findOnPage(text: string): void {
    this.log({ action: 'find_on_page', payload: { text } });
    if (this.extensionConnected) {
      this.sendToExtension('find_on_page', { text });
    } else if ('find' in window) {
      (window as unknown as { find: (s: string) => boolean }).find(text);
    }
  }

  /**
   * Read the current page's visible text content.
   * Returns the text for TTS processing.
   */
  readPageContent(): string {
    this.log({ action: 'read_page' });
    if (typeof document === 'undefined') return '';

    // Get main content text, prioritizing semantic elements
    const mainEl = document.querySelector('main') ?? document.querySelector('article') ?? document.body;
    const text = mainEl.innerText ?? mainEl.textContent ?? '';
    // Truncate for reasonable TTS output
    return text.slice(0, 2000).trim();
  }

  /**
   * Read the currently selected text.
   */
  readSelection(): string {
    this.log({ action: 'read_selection' });
    return window.getSelection()?.toString() ?? '';
  }

  // ─── Extension Communication ──────────────────────────────────────────────

  private sendToExtension(action: string, payload?: Record<string, unknown>): void {
    window.postMessage({
      source: 'jargiin-app',
      action,
      payload,
    }, '*');
  }

  private log(command: BrowserCommand): void {
    this.commandHistory.push(command);
    if (this.commandHistory.length > 100) {
      this.commandHistory.shift();
    }
  }

  getHistory(): BrowserCommand[] {
    return [...this.commandHistory];
  }
}

// ─── Singleton instance ─────────────────────────────────────────────────────

let _instance: BrowserController | null = null;

export function getBrowserController(): BrowserController {
  if (!_instance) {
    _instance = new BrowserController('auto');
  }
  return _instance;
}
