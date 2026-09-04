const STORAGE_KEY = 'sivraj_browser_bookmarks_v2';

class BookmarksStore {
  constructor() {
    this.bookmarks = this.load();
  }

  load() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (error) {
      console.warn('[BookmarksStore] Failed to load bookmarks', error);
    }
    return [
      { id: 'bm_1', title: 'BotBook', url: 'sivraj://robobook', favicon: '📘', timestamp: Date.now() },
      { id: 'bm_2', title: '404 News', url: 'sivraj://robonews', favicon: '📰', timestamp: Date.now() },
      { id: 'bm_3', title: 'BotOverflow', url: 'sivraj://roboforum', favicon: '💬', timestamp: Date.now() },
      { id: 'bm_4', title: 'Neuralinked', url: 'sivraj://robomatch', favicon: '💘', timestamp: Date.now() },
      { id: 'bm_5', title: 'Consume.exe', url: 'sivraj://roboshop', favicon: '🛒', timestamp: Date.now() }
    ];
  }

  getBookmarks() {
    return [...this.bookmarks];
  }

  isBookmarked(url) {
    const cleanUrl = String(url || '').split('?')[0];
    return this.bookmarks.some(bookmark => bookmark.url === url || bookmark.url === cleanUrl);
  }

  toggleBookmark(url, title, favicon) {
    const index = this.bookmarks.findIndex(bookmark => bookmark.url === url);
    if (index >= 0) {
      this.bookmarks.splice(index, 1);
    } else {
      this.bookmarks.push({ id: `bm_${Date.now()}`, title: title || url, url, favicon: favicon || '🌐', timestamp: Date.now() });
    }
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.bookmarks)); } catch (error) { console.warn('[BookmarksStore] Failed to save bookmarks', error); }
    return this.isBookmarked(url);
  }
}

export const bookmarksStore = new BookmarksStore();
