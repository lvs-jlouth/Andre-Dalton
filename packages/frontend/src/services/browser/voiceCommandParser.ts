/**
 * Voice Command Parser for Browser Control.
 *
 * Parses natural language voice commands and maps them to browser actions.
 * Supports flexible phrasing for accessibility.
 */
import { getBrowserController, type BrowserAction, type SearchEngine } from './browserController.js';

export interface ParsedCommand {
  action: BrowserAction | 'set_search_engine' | 'unknown';
  args: Record<string, string>;
  confidence: number;
  originalText: string;
}

// ─── Command Patterns ───────────────────────────────────────────────────────

interface CommandPattern {
  action: BrowserAction | 'set_search_engine';
  patterns: RegExp[];
  extractArgs?: (match: RegExpMatchArray, text: string) => Record<string, string>;
}

const COMMAND_PATTERNS: CommandPattern[] = [
  // Search
  {
    action: 'search',
    patterns: [
      /^(?:search|search for|look up|google|find|search the web for)\s+(.+)/i,
      /^(?:what is|who is|where is|how to|how do i)\s+(.+)/i,
    ],
    extractArgs: (match) => ({ query: match[1].trim() }),
  },

  // Navigate
  {
    action: 'navigate',
    patterns: [
      /^(?:go to|open|navigate to|visit|take me to)\s+(.+)/i,
      /^(?:open (?:up )?(?:the )?(?:website |site )?)?(\S+\.\S+)/i,
    ],
    extractArgs: (match) => ({ url: match[1].trim() }),
  },

  // Open new tab
  {
    action: 'open_tab',
    patterns: [
      /^(?:open|new) (?:a )?(?:new )?tab(?:\s+(?:with|to|for)\s+(.+))?/i,
    ],
    extractArgs: (match) => ({ url: match[1]?.trim() ?? '' }),
  },

  // Close tab
  {
    action: 'close_tab',
    patterns: [
      /^close (?:this |the |current )?tab/i,
    ],
  },

  // Go back
  {
    action: 'go_back',
    patterns: [
      /^(?:go )?back/i,
      /^previous (?:page)?/i,
    ],
  },

  // Go forward
  {
    action: 'go_forward',
    patterns: [
      /^(?:go )?forward/i,
      /^next (?:page)?/i,
    ],
  },

  // Refresh
  {
    action: 'refresh',
    patterns: [
      /^(?:refresh|reload)(?: (?:the |this )?page)?/i,
    ],
  },

  // Scroll
  {
    action: 'scroll_down',
    patterns: [
      /^scroll (?:down|more)/i,
      /^(?:show )?more/i,
      /^page down/i,
    ],
  },
  {
    action: 'scroll_up',
    patterns: [
      /^scroll up/i,
      /^page up/i,
    ],
  },
  {
    action: 'scroll_to_top',
    patterns: [
      /^(?:scroll (?:to )?)?(?:the )?top/i,
      /^go (?:to )?(?:the )?top/i,
    ],
  },
  {
    action: 'scroll_to_bottom',
    patterns: [
      /^(?:scroll (?:to )?)?(?:the )?bottom/i,
      /^go (?:to )?(?:the )?bottom/i,
    ],
  },

  // Read page
  {
    action: 'read_page',
    patterns: [
      /^(?:read|read out|read aloud)(?: (?:the |this )?page)?/i,
      /^what does (?:this |the )?page say/i,
      /^tell me what(?:'s| is) on (?:this |the )?page/i,
    ],
  },

  // Read selection
  {
    action: 'read_selection',
    patterns: [
      /^read (?:the )?selection/i,
      /^read (?:what(?:'s| is) )?(?:selected|highlighted)/i,
    ],
  },

  // Find on page
  {
    action: 'find_on_page',
    patterns: [
      /^find (?:on (?:this |the )?page\s+)?(.+)/i,
      /^(?:search|look) (?:on )?(?:this |the )?page (?:for\s+)?(.+)/i,
    ],
    extractArgs: (match) => ({ text: match[1].trim() }),
  },

  // Bookmark
  {
    action: 'bookmark',
    patterns: [
      /^bookmark(?: (?:this|the) (?:page|site))?/i,
      /^save (?:this |the )?page/i,
    ],
  },

  // Switch tab
  {
    action: 'switch_tab',
    patterns: [
      /^(?:switch|go) to tab (\d+)/i,
      /^tab (\d+)/i,
    ],
    extractArgs: (match) => ({ tabIndex: match[1] }),
  },

  // List tabs
  {
    action: 'list_tabs',
    patterns: [
      /^(?:list|show|what)(?:'s| are)? (?:my |the )?(?:open )?tabs/i,
    ],
  },

  // Set search engine
  {
    action: 'set_search_engine',
    patterns: [
      /^(?:use|switch to|set search (?:engine )?(?:to )?)(google|bing|duckduckgo|duck duck go)/i,
    ],
    extractArgs: (match) => ({ engine: match[1].toLowerCase().replace(/\s/g, '') }),
  },
];

// ─── Parser ─────────────────────────────────────────────────────────────────

/**
 * Parse a voice transcript into a browser command.
 * Returns null if the input doesn't match any browser command pattern.
 */
export function parseVoiceBrowserCommand(text: string): ParsedCommand | null {
  const normalized = text.trim();
  if (!normalized) return null;

  for (const cmd of COMMAND_PATTERNS) {
    for (const pattern of cmd.patterns) {
      const match = normalized.match(pattern);
      if (match) {
        return {
          action: cmd.action,
          args: cmd.extractArgs?.(match, normalized) ?? {},
          confidence: 0.9,
          originalText: normalized,
        };
      }
    }
  }

  return null;
}

/**
 * Execute a parsed browser command.
 * Returns a text response describing what was done (for TTS feedback).
 */
export function executeBrowserCommand(command: ParsedCommand): string {
  const browser = getBrowserController();

  switch (command.action) {
    case 'search':
      browser.search(command.args.query ?? '');
      return `Searching for "${command.args.query}"`;

    case 'navigate':
      browser.navigate(command.args.url ?? '');
      return `Opening ${command.args.url}`;

    case 'open_tab':
      if (command.args.url) {
        browser.openTab(command.args.url);
        return `Opening new tab with ${command.args.url}`;
      }
      browser.openTab('about:blank');
      return 'Opened a new tab';

    case 'close_tab':
      return 'Closing the current tab';

    case 'go_back':
      browser.goBack();
      return 'Going back';

    case 'go_forward':
      browser.goForward();
      return 'Going forward';

    case 'refresh':
      browser.refresh();
      return 'Refreshing the page';

    case 'scroll_up':
      browser.scroll('up');
      return 'Scrolling up';

    case 'scroll_down':
      browser.scroll('down');
      return 'Scrolling down';

    case 'scroll_to_top':
      browser.scroll('top');
      return 'Scrolling to the top';

    case 'scroll_to_bottom':
      browser.scroll('bottom');
      return 'Scrolling to the bottom';

    case 'read_page': {
      const content = browser.readPageContent();
      return content || 'I couldn\'t read any content from this page.';
    }

    case 'read_selection': {
      const selection = browser.readSelection();
      return selection || 'Nothing is currently selected.';
    }

    case 'find_on_page':
      browser.findOnPage(command.args.text ?? '');
      return `Looking for "${command.args.text}" on the page`;

    case 'bookmark':
      return 'Page bookmarked';

    case 'switch_tab':
      return `Switching to tab ${command.args.tabIndex}`;

    case 'list_tabs':
      return 'Here are your open tabs';

    case 'set_search_engine': {
      const engine = command.args.engine as SearchEngine;
      browser.setSearchEngine(engine);
      return `Search engine set to ${engine}`;
    }

    default:
      return 'I didn\'t understand that browser command.';
  }
}

/**
 * Check if a text input looks like a browser command.
 * Used to intercept voice input before sending to the LLM.
 */
export function isBrowserCommand(text: string): boolean {
  return parseVoiceBrowserCommand(text) !== null;
}
