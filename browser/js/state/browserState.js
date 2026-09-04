/**
 * DEFINITELYNOTCHROME BROWSER - Browser Reactive State
 * Centralized state store for tabs, navigation history, and active sessions.
 */

import { historyStore } from './historyStore.js';

class EventEmitter {
  constructor() {
    this.listeners = {};
  }

  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(data));
    }
  }
}

class BrowserState extends EventEmitter {
  constructor() {
    super();
    this.tabs = [];
    this.activeTabId = null;
    this.tabCounter = 0;
    this.bookmarks = new Set(['sivraj://home', 'sivraj://robobook', 'sivraj://robonews', 'sivraj://roboforum', 'sivraj://robomatch', 'sivraj://roboshop']);
  }

  init() {
    this.createTab('sivraj://home', false, 'New Tab', '⚡');
  }

  createTab(url = 'sivraj://home', isIncognito = false, title = 'New Tab', favicon = '🌐') {
    this.tabCounter++;
    const tabId = `tab_${Date.now()}_${this.tabCounter}`;

    const newTab = {
      id: tabId,
      url: isIncognito && url === 'sivraj://home' ? 'sivraj://incognito' : url,
      title: isIncognito && url === 'sivraj://home' ? 'New Tab' : title,
      favicon: isIncognito ? '🕵️' : favicon,
      isIncognito: Boolean(isIncognito),
      historyStack: [isIncognito && url === 'sivraj://home' ? 'sivraj://incognito' : url],
      historyIndex: 0,
      isLoading: false
    };

    this.tabs.push(newTab);
    this.activeTabId = tabId;

    this.emit('tabsChanged', { tabs: this.tabs, activeTabId: this.activeTabId });
    this.emit('activeTabChanged', newTab);

    return newTab;
  }

  closeTab(tabId) {
    const index = this.tabs.findIndex(t => t.id === tabId);
    if (index === -1) return;

    const isCurrentActive = this.activeTabId === tabId;
    this.tabs.splice(index, 1);

    if (this.tabs.length === 0) {
      this.createTab('sivraj://home', false, 'New Tab', '⚡');
      return;
    }

    if (isCurrentActive) {
      const nextIndex = Math.max(0, index - 1);
      this.activeTabId = this.tabs[nextIndex].id;
    }

    this.emit('tabsChanged', { tabs: this.tabs, activeTabId: this.activeTabId });
    this.emit('activeTabChanged', this.getActiveTab());
  }

  setActiveTab(tabId) {
    if (this.activeTabId === tabId) return;
    const tab = this.tabs.find(t => t.id === tabId);
    if (!tab) return;

    this.activeTabId = tabId;
    this.emit('tabsChanged', { tabs: this.tabs, activeTabId: this.activeTabId });
    this.emit('activeTabChanged', tab);
  }

  getActiveTab() {
    return this.tabs.find(t => t.id === this.activeTabId) || null;
  }

  navigateActiveTab(url, title, favicon) {
    const tab = this.getActiveTab();
    if (!tab) return;

    if (tab.historyIndex < tab.historyStack.length - 1) {
      tab.historyStack = tab.historyStack.slice(0, tab.historyIndex + 1);
    }

    tab.historyStack.push(url);
    tab.historyIndex = tab.historyStack.length - 1;
    tab.url = url;
    if (title) tab.title = title;
    if (favicon) tab.favicon = favicon;

    historyStore.addEntry({
      title: tab.title,
      url: tab.url,
      favicon: tab.favicon,
      isIncognito: tab.isIncognito
    });

    this.emit('tabsChanged', { tabs: this.tabs, activeTabId: this.activeTabId });
    this.emit('tabNavigated', tab);
  }

  goBack() {
    const tab = this.getActiveTab();
    if (!tab || tab.historyIndex <= 0) return;

    tab.historyIndex--;
    tab.url = tab.historyStack[tab.historyIndex];

    this.emit('tabsChanged', { tabs: this.tabs, activeTabId: this.activeTabId });
    this.emit('tabNavigated', tab);
  }

  goForward() {
    const tab = this.getActiveTab();
    if (!tab || tab.historyIndex >= tab.historyStack.length - 1) return;

    tab.historyIndex++;
    tab.url = tab.historyStack[tab.historyIndex];

    this.emit('tabsChanged', { tabs: this.tabs, activeTabId: this.activeTabId });
    this.emit('tabNavigated', tab);
  }

  refresh() {
    const tab = this.getActiveTab();
    if (!tab) return;
    this.emit('tabNavigated', tab);
  }

  toggleBookmark(url) {
    if (this.bookmarks.has(url)) {
      this.bookmarks.delete(url);
    } else {
      this.bookmarks.add(url);
    }
    this.emit('bookmarksChanged', Array.from(this.bookmarks));
  }

  isBookmarked(url) {
    return this.bookmarks.has(url);
  }
}

export const browserState = new BrowserState();
