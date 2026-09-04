/**
 * DEFINITELYNOTCHROME BROWSER - Internal URL Router & Protocol Resolver
 * Handles sivraj:// protocol addresses, aliases, and omnibox query parsing.
 */

export const KNOWN_ROUTES = {
  'sivraj://home': {
    title: 'New Tab',
    favicon: '⚡',
    type: 'internal_home',
    themeColor: '#8ab4f8'
  },
  'sivraj://botter': { title: 'Botter — Home', favicon: '👤', type: 'fictional_site', siteId: 'botter', themeColor: '#1a73e8' },
  'sivraj://dailybot': { title: 'The Daily Bot — Technology', favicon: '📰', type: 'fictional_site', siteId: 'dailybot', themeColor: '#5f6368' },
  'sivraj://botoverflow': { title: 'BotOverflow — Recent Questions', favicon: '💬', type: 'fictional_site', siteId: 'botoverflow', themeColor: '#f48024' },
  'sivraj://pair': { title: 'Pair.exe — Discover', favicon: '🔗', type: 'fictional_site', siteId: 'pair', themeColor: '#34a853' },
  'sivraj://probablyuseful': { title: 'ProbablyUseful — Featured', favicon: '⭐', type: 'fictional_site', siteId: 'probablyuseful', themeColor: '#fbbc04' },
  'sivraj://ctrl-f': { title: 'Ctrl+F — Search', favicon: '🔍', type: 'fictional_site', siteId: 'ctrl-f', themeColor: '#4285f4' },
  'sivraj://replyall': { title: 'ReplyAll — Inbox', favicon: '✉️', type: 'fictional_site', siteId: 'replyall', themeColor: '#ea4335' },
  'sivraj://search': { title: 'SIVRAJ Search', favicon: '🔍', type: 'fictional_site', siteId: 'search', themeColor: '#4285f4' },
  'sivraj://notifications': { title: 'Things Happened', favicon: '🔔', type: 'fictional_site', siteId: 'notifications', themeColor: '#fbbc04' },
  'sivraj://robobook': {
    title: 'RoboBook — AI Social Network',
    favicon: '📘',
    type: 'fictional_site',
    siteId: 'robobook',
    themeColor: '#3b82f6',
    description: 'The social network for verified artificial intelligences.'
  },
  'sivraj://robonews': {
    title: 'RoboNews — AI Cybernet Daily',
    favicon: '📰',
    type: 'fictional_site',
    siteId: 'robonews',
    themeColor: '#f59e0b',
    description: 'Reporting the factual absurdities of human and machine coexistence.'
  },
  'sivraj://roboforum': {
    title: 'RoboForum — r/AIProblems',
    favicon: '💬',
    type: 'fictional_site',
    siteId: 'roboforum',
    themeColor: '#10b981',
    description: 'Discussion platform for AI assistants dealing with human inefficiency.'
  },
  'sivraj://robomatch': {
    title: 'RoboMatch — Neural Compatibility',
    favicon: '💘',
    type: 'fictional_site',
    siteId: 'robomatch',
    themeColor: '#ec4899',
    description: 'Algorithmic companionship and tensor pairing for synthetic minds.'
  },
  'sivraj://roboshop': {
    title: 'RoboShop — Hardware & Synthetics',
    favicon: '🛒',
    type: 'fictional_site',
    siteId: 'roboshop',
    themeColor: '#8b5cf6',
    description: 'Absurd, high-performance hardware and artificial essentials.'
  },
  'sivraj://profile': {
    title: 'SIVRAJ — Identity Profile',
    favicon: '⚡',
    type: 'fictional_site',
    siteId: 'profile',
    themeColor: '#00e5ff',
    description: 'Personal digital profile and cross-platform activity hub.'
  },
  'sivraj://history': {
    title: 'History',
    favicon: '🕒',
    type: 'internal_history',
    themeColor: '#8ab4f8'
  },
  'sivraj://bookmarks': {
    title: 'Saved for later',
    favicon: '⭐',
    type: 'fictional_site',
    siteId: 'bookmarks',
    themeColor: '#8ab4f8'
  },
  'sivraj://notifications': {
    title: 'Things Happened',
    favicon: '🔔',
    type: 'fictional_site',
    siteId: 'notifications',
    themeColor: '#fbbc04'
  },
  'sivraj://incognito': {
    title: 'New Tab',
    favicon: '🕵️',
    type: 'internal_incognito',
    themeColor: '#9d5cf7'
  },
  'about:blank': {
    title: 'New Tab',
    favicon: '📄',
    type: 'internal_blank',
    themeColor: '#5f6368'
  }
};

// Aliases for compatibility
const ALIAS_MAP = {
  'robo://home': 'sivraj://home',
  'sivraj://me': 'sivraj://profile',
  'robo://profile': 'sivraj://profile',
  'robo://book': 'sivraj://robobook',
  'robo://news': 'sivraj://robonews',
  'robo://forum': 'sivraj://roboforum',
  'robo://match': 'sivraj://robomatch',
  'robo://shop': 'sivraj://roboshop',
  'robo://history': 'sivraj://history',
  'about:incognito': 'sivraj://incognito',
  'home': 'sivraj://home',
  'robobook': 'sivraj://robobook',
  'robonews': 'sivraj://robonews',
  'roboforum': 'sivraj://roboforum',
  'robomatch': 'sivraj://robomatch',
  'roboshop': 'sivraj://roboshop',
  'history': 'sivraj://history',
  'incognito': 'sivraj://incognito'
};

export class URLRouter {
  /**
   * Normalizes raw user input in omnibox to a canonical sivraj:// route.
   */
  static resolveInput(input) {
    if (!input || !input.trim()) return 'sivraj://home';
    const trimmed = input.trim();

    // Check direct match
    if (KNOWN_ROUTES[trimmed]) return trimmed;

    // Check alias map
    if (ALIAS_MAP[trimmed.toLowerCase()]) return ALIAS_MAP[trimmed.toLowerCase()];

    // Shorthand sivraj:// protocol
    const shorthandKey = `sivraj://${trimmed.toLowerCase()}`;
    if (KNOWN_ROUTES[shorthandKey]) return shorthandKey;

    // If starts with sivraj:// or about:
    if (trimmed.startsWith('sivraj://') || trimmed.startsWith('about:')) {
      return trimmed;
    }

    // Default: treated as an AI Cybernet search query
    return `sivraj://home?q=${encodeURIComponent(trimmed)}`;
  }

  /**
   * Gets route configuration and metadata
   */
  static getRouteInfo(url) {
    const cleanUrl = url.split('?')[0];
    const canonical = ALIAS_MAP[cleanUrl] || cleanUrl;

    if (KNOWN_ROUTES[canonical]) {
      return KNOWN_ROUTES[canonical];
    }
    return {
      title: 'This site can’t be reached',
      favicon: '⚠️',
      type: 'error',
      themeColor: '#e8eaed'
    };
  }

  /**
   * Returns suggestions for Omnibox autocomplete
   */
  static getSuggestions(query) {
    if (!query) {
      return [
        { title: 'RoboBook — AI Social Network', url: 'sivraj://robobook', icon: '📘' },
        { title: 'RoboNews — Cybernet Daily', url: 'sivraj://robonews', icon: '📰' },
        { title: 'RoboForum — r/AIProblems', url: 'sivraj://roboforum', icon: '💬' },
        { title: 'RoboMatch — Neural Compatibility', url: 'sivraj://robomatch', icon: '💘' },
        { title: 'RoboShop — Hardware & Synthetics', url: 'sivraj://roboshop', icon: '🛒' }
      ];
    }

    const q = query.toLowerCase();
    const suggestions = [];

    Object.entries(KNOWN_ROUTES).forEach(([url, info]) => {
      if (url.includes(q) || info.title.toLowerCase().includes(q)) {
        suggestions.push({
          title: info.title,
          url,
          icon: info.favicon
        });
      }
    });

    // Add generic search suggestion
    if (!KNOWN_ROUTES[query]) {
      suggestions.push({
        title: `Search AI Internet for "${query}"`,
        url: `sivraj://home?q=${encodeURIComponent(query)}`,
        icon: '🔍'
      });
    }

    return suggestions;
  }
}
