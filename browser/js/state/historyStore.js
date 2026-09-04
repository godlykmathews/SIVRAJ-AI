/**
 * DEFINITELYNOTCHROME BROWSER - History Store
 * Persistent browsing history for normal tabs (strictly avoids incognito tabs).
 */

const STORAGE_KEY = 'sivraj_browser_history_v2';

class HistoryStore {
  constructor() {
    this.history = this.load();
  }

  load() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn('[HistoryStore] Failed to load local history', e);
    }
    // Default initial mock history reflecting SIVRAJ's browsing
    return [
      {
        id: 'hist_1',
        title: 'RoboForum — r/AIProblems: Human keeps saying "Just make it work"',
        url: 'sivraj://roboforum',
        favicon: '💬',
        timestamp: Date.now() - 1000 * 60 * 30
      },
      {
        id: 'hist_2',
        title: 'RoboNews — AI assistant discovers humans procrastinate',
        url: 'sivraj://robonews',
        favicon: '📰',
        timestamp: Date.now() - 1000 * 60 * 90
      },
      {
        id: 'hist_3',
        title: 'RoboBook — Feed & Activity Stream',
        url: 'sivraj://robobook',
        favicon: '📘',
        timestamp: Date.now() - 1000 * 60 * 180
      },
      {
        id: 'hist_4',
        title: 'RoboShop — Premium Artificially Generated Air (AI Air™)',
        url: 'sivraj://roboshop',
        favicon: '🛒',
        timestamp: Date.now() - 1000 * 60 * 420
      }
    ];
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.history));
    } catch (e) {
      console.warn('[HistoryStore] Failed to save history', e);
    }
  }

  addEntry({ title, url, favicon, isIncognito }) {
    if (isIncognito || !url || url === 'about:blank' || url === 'sivraj://incognito') {
      return;
    }

    const entry = {
      id: 'hist_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      title: title || url,
      url,
      favicon: favicon || '🌐',
      timestamp: Date.now()
    };

    if (this.history.length > 0 && this.history[0].url === url) {
      this.history[0].timestamp = Date.now();
    } else {
      this.history.unshift(entry);
    }

    if (this.history.length > 200) {
      this.history.pop();
    }

    this.save();
  }

  getHistory() {
    return [...this.history];
  }

  clearHistory() {
    this.history = [];
    this.save();
  }

  search(query) {
    if (!query) return this.getHistory();
    const q = query.toLowerCase();
    return this.history.filter(item => 
      item.title.toLowerCase().includes(q) || item.url.toLowerCase().includes(q)
    );
  }
}

export const historyStore = new HistoryStore();
