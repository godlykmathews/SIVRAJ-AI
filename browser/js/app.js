/**
 * DEFINITELYNOTCHROME BROWSER - Main Application Bootstrap
 * Orchestrates Chromium Shell, Tab Manager, URL Router, Omnibox, and Viewport.
 */

import { browserState } from './state/browserState.js';
import { URLRouter } from './navigation/urlRouter.js';
import { TabManager } from './navigation/tabManager.js';
import { renderHomeView } from './views/homeView.js';
import { renderHistoryView } from './views/historyView.js';
import { renderIncognitoView } from './views/incognitoView.js';
import { renderRobobookView } from './views/robobookView.js';
import { renderRobonewsView } from './views/robonewsView.js';
import { renderRobomatchView } from './views/robomatchView.js';
import { renderRoboshopView } from './views/roboshopView.js';
import { renderProfileView } from './views/profileView.js';
import { renderSitePlaceholder, renderErrorView } from './views/sitePlaceholders.js';
import { notificationService } from './services/notificationService.js';
import { normalizeIcons, normalizeBranding } from './ui/iconSystem.js';
import { bookmarksStore } from './state/bookmarksStore.js';
import { renderBotOverflowView, renderSearchView, renderReplyAllView, renderNotificationsView, renderBookmarksView } from './views/utilityViews.js';
import './ipc/sivrajBridge.js'; // Exposes window.__SIVRAJ_IPC__

class SivrajBrowserApp {
  constructor() {
    this.dom = {};
    this.tabManager = null;
    this.currentZoom = 100;
    this.activeNotifFilter = 'all';
  }

  init() {
    this.cacheDOM();
    this.applyTheme(localStorage.getItem('sivraj-theme') || 'dark');
    this.observeViewportContent();
    this.initTabManager();
    this.initNotificationCenter();
    this.bindEvents();
    this.bindShortcuts();

    browserState.init();
    this.updateUIForActiveTab(browserState.getActiveTab());
    normalizeIcons(this.dom.app);
    normalizeBranding(this.dom.app);
  }

  cacheDOM() {
    this.dom = {
      app: document.getElementById('browser-app'),
      tabList: document.getElementById('tab-list'),
      newTabBtn: document.getElementById('new-tab-btn'),
      backBtn: document.getElementById('nav-back-btn'),
      forwardBtn: document.getElementById('nav-forward-btn'),
      refreshBtn: document.getElementById('nav-refresh-btn'),
      omniboxInput: document.getElementById('omnibox-input'),
      omniboxStarBtn: document.getElementById('omnibox-star-btn'),
      omniboxDropdown: document.getElementById('omnibox-dropdown'),
      progressBar: document.getElementById('chrome-progress-bar'),
      viewportContent: document.getElementById('site-viewport-container'),
      bookmarksBar: document.getElementById('chrome-bookmarks-bar'),
      menuBtn: document.getElementById('chrome-menu-btn'),
      menuPopup: document.getElementById('chrome-menu-popup'),
      themeMenu: document.getElementById('menu-theme'),
      themeLabel: document.getElementById('menu-theme-label'),
      notifBtn: document.getElementById('browser-notif-btn'),
      notifBadge: document.getElementById('browser-notif-badge'),
      notifCenter: document.getElementById('browser-notif-center'),
      toastContainer: document.getElementById('browser-toast-container')
    };
  }

  observeViewportContent() {
    if (!this.dom.viewportContent || typeof MutationObserver === 'undefined') return;
    const normalizeViewport = () => {
      normalizeIcons(this.dom.viewportContent);
      normalizeBranding(this.dom.viewportContent);
    };
    this.viewportObserver = new MutationObserver(normalizeViewport);
    this.viewportObserver.observe(this.dom.viewportContent, { childList: true, subtree: true });
  }

  initTabManager() {
    this.tabManager = new TabManager({
      tabListEl: this.dom.tabList,
      onTabSelect: (tab) => this.updateUIForActiveTab(tab),
      onTabClose: () => this.updateUIForActiveTab(browserState.getActiveTab())
    });

    browserState.on('activeTabChanged', (tab) => this.updateUIForActiveTab(tab));
    browserState.on('tabNavigated', (tab) => this.updateUIForActiveTab(tab));
    browserState.on('bookmarksChanged', () => this.updateBookmarkIcon(browserState.getActiveTab()));
  }

  bindEvents() {
    // Native Electron window controls. These remain inert in a normal web preview.
    document.getElementById('win-min')?.addEventListener('click', () => {
      window.electronAPI?.windowControl('minimize');
    });
    document.getElementById('win-max')?.addEventListener('click', () => {
      window.electronAPI?.windowControl('maximize');
    });
    document.getElementById('win-close')?.addEventListener('click', () => {
      window.electronAPI?.windowControl('close');
    });

    // New Tab (+) Button
    this.dom.newTabBtn.addEventListener('click', () => {
      browserState.createTab('sivraj://home', false, 'New Tab', '⚡');
    });

    // Navigation Buttons
    this.dom.backBtn.addEventListener('click', () => browserState.goBack());
    this.dom.forwardBtn.addEventListener('click', () => browserState.goForward());
    this.dom.refreshBtn.addEventListener('click', () => {
      this.triggerPageLoad(() => this.renderViewport(browserState.getActiveTab()));
    });

    // Omnibox Navigation & Dropdown
    this.dom.omniboxInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const rawValue = this.dom.omniboxInput.value;
        const resolvedUrl = URLRouter.resolveInput(rawValue);
        const routeInfo = URLRouter.getRouteInfo(resolvedUrl);

        this.hideDropdown();
        this.dom.omniboxInput.blur();

        this.triggerPageLoad(() => {
          browserState.navigateActiveTab(resolvedUrl, routeInfo.title, routeInfo.favicon);
        });
      } else if (e.key === 'Escape') {
        this.hideDropdown();
      }
    });

    this.dom.omniboxInput.addEventListener('input', () => {
      this.showDropdown(this.dom.omniboxInput.value.trim());
    });

    this.dom.omniboxInput.addEventListener('focus', () => {
      this.dom.omniboxInput.select();
      this.showDropdown(this.dom.omniboxInput.value.trim());
    });

    // Bookmark Star Button
    this.dom.omniboxStarBtn.addEventListener('click', () => {
      const tab = browserState.getActiveTab();
      if (tab) {
        bookmarksStore.toggleBookmark(tab.url, tab.title, tab.favicon);
        this.updateBookmarkIcon(tab);
      }
    });

    // Bookmarks Bar Clicks
    this.dom.bookmarksBar.querySelectorAll('.bookmark-item').forEach(item => {
      item.addEventListener('click', () => {
        const url = item.getAttribute('data-url');
        if (url) {
          const routeInfo = URLRouter.getRouteInfo(url);
          this.triggerPageLoad(() => {
            browserState.navigateActiveTab(url, routeInfo.title, routeInfo.favicon);
          });
        }
      });
    });

    // Three-Dot Menu Toggle
    this.dom.menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.dom.menuPopup.classList.toggle('open');
    });

    this.dom.themeMenu?.addEventListener('click', () => {
      this.applyTheme(document.body.classList.contains('light-mode') ? 'dark' : 'light');
    });

    // Three-Dot Menu Options
    document.getElementById('menu-new-tab')?.addEventListener('click', () => {
      this.dom.menuPopup.classList.remove('open');
      browserState.createTab('sivraj://home', false, 'New Tab', '⚡');
    });

    document.getElementById('menu-new-incognito')?.addEventListener('click', () => {
      this.dom.menuPopup.classList.remove('open');
      browserState.createTab('sivraj://incognito', true, 'New Tab', '🕵️');
    });

    document.getElementById('menu-history')?.addEventListener('click', () => {
      this.dom.menuPopup.classList.remove('open');
      browserState.navigateActiveTab('sivraj://history', 'History', '🕒');
    });

    document.getElementById('menu-zoom-in')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.currentZoom = Math.min(150, this.currentZoom + 10);
      this.applyZoom();
    });

    document.getElementById('menu-zoom-out')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.currentZoom = Math.max(70, this.currentZoom - 10);
      this.applyZoom();
    });

    document.getElementById('menu-about')?.addEventListener('click', () => {
      this.dom.menuPopup.classList.remove('open');
      alert('DefinitelyNotChrome Browser v1.0.0 (Chromium Build 128.0.0)\nAn internal digital environment for autonomous artificial intelligence.');
    });

    // Notification Center Toggle
    this.dom.notifBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.dom.menuPopup.classList.remove('open');
      const isHidden = this.dom.notifCenter.classList.contains('hidden');
      if (isHidden) {
        this.renderNotificationCenter();
        this.dom.notifCenter.classList.remove('hidden');
      } else {
        this.dom.notifCenter.classList.add('hidden');
      }
    });

    // Close dropdowns on outside click
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.omnibox-container')) {
        this.hideDropdown();
      }
      if (!e.target.closest('#chrome-menu-btn') && !e.target.closest('#chrome-menu-popup')) {
        this.dom.menuPopup.classList.remove('open');
      }
      if (!e.target.closest('.browser-notif-btn-wrapper') && !e.target.closest('#browser-notif-center')) {
        this.dom.notifCenter.classList.add('hidden');
      }
    });
  }

  initNotificationCenter() {
    this.updateNotificationBadge();

    // Subscribe to state updates
    notificationService.subscribe(() => {
      this.updateNotificationBadge();
      if (!this.dom.notifCenter.classList.contains('hidden')) {
        this.renderNotificationCenter();
      }
    });

    // Subscribe to live toast popups
    notificationService.onToast((notif) => {
      this.showToast(notif);
    });
  }

  updateNotificationBadge() {
    const unread = notificationService.getUnreadCount();
    if (this.dom.notifBadge) {
      if (unread > 0) {
        this.dom.notifBadge.textContent = unread > 99 ? '99+' : unread;
        this.dom.notifBadge.classList.remove('hidden');
      } else {
        this.dom.notifBadge.classList.add('hidden');
      }
    }
  }

  renderNotificationCenter() {
    const notifications = notificationService.getNotifications(this.activeNotifFilter);
    const unreadCount = notificationService.getUnreadCount();

    const tabs = [
      { id: 'all', label: 'All' },
      { id: 'unread', label: 'Unread' },
      { id: 'matches', label: 'Matches' },
      { id: 'social', label: 'Social' },
      { id: 'shopping', label: 'Shopping' },
      { id: 'system', label: 'System' }
    ];

    this.dom.notifCenter.innerHTML = `
      <div class="notif-header">
        <div class="notif-title-row">
          <span>🔔 Notifications</span>
          <span class="notif-unread-count-pill">${unreadCount} unread</span>
        </div>
        <div class="notif-header-actions">
          <button class="notif-hdr-btn" id="notif-mark-all" title="Mark all as read">✓✓ Read</button>
          <button class="notif-hdr-btn" id="notif-clear-all" title="Clear all">Clear</button>
        </div>
      </div>

      <div class="notif-tabs-row">
        ${tabs.map(t => `
          <div class="notif-tab-pill ${this.activeNotifFilter === t.id ? 'active' : ''}" data-tab="${t.id}">
            ${t.label}
          </div>
        `).join('')}
      </div>

      <div class="notif-list-container">
        ${notifications.length === 0 ? `
          <div class="notif-empty-state">
            <span style="font-size:32px; opacity:0.6;">🔕</span>
            <p style="font-size:13px;">No notifications in this category.</p>
          </div>
        ` : notifications.map(n => `
          <div class="notif-item-card ${n.read ? '' : 'unread'}" data-id="${n.id}" data-url="${n.targetUrl}">
            <div class="notif-item-icon">${n.sourceIcon || '⚡'}</div>
            <div class="notif-item-body">
              <div class="notif-item-title-row">
                <span class="notif-item-title">${escapeHTML(n.title)}</span>
                <span class="notif-item-time">${formatTimeAgo(n.timestamp)}</span>
              </div>
              <p class="notif-item-message">${escapeHTML(n.message)}</p>
              <span class="notif-item-source">via ${escapeHTML(n.source)}</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;
    normalizeIcons(this.dom.notifCenter);
    normalizeBranding(this.dom.notifCenter);

    // Bind Notification Center events
    this.dom.notifCenter.querySelectorAll('.notif-tab-pill').forEach(pill => {
      pill.addEventListener('click', (e) => {
        e.stopPropagation();
        this.activeNotifFilter = pill.getAttribute('data-tab');
        this.renderNotificationCenter();
      });
    });

    this.dom.notifCenter.querySelector('#notif-mark-all')?.addEventListener('click', (e) => {
      e.stopPropagation();
      notificationService.markAllAsRead();
    });

    this.dom.notifCenter.querySelector('#notif-clear-all')?.addEventListener('click', (e) => {
      e.stopPropagation();
      notificationService.clearAll();
    });

    this.dom.notifCenter.querySelectorAll('.notif-item-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.getAttribute('data-id');
        const url = card.getAttribute('data-url');
        if (id) notificationService.markAsRead(id);
        this.dom.notifCenter.classList.add('hidden');
        if (url) {
          browserState.navigateActiveTab(url);
        }
      });
    });
  }

  showToast(notif) {
    if (!this.dom.toastContainer) return;

    const toast = document.createElement('div');
    toast.className = 'browser-toast-card';
    toast.innerHTML = `
      <div class="browser-toast-icon">${notif.sourceIcon || '🔔'}</div>
      <div class="browser-toast-body">
        <div class="browser-toast-title">${escapeHTML(notif.title)}</div>
        <div class="browser-toast-message">${escapeHTML(notif.message)}</div>
      </div>
    `;
    normalizeIcons(toast);
    normalizeBranding(toast);

    toast.addEventListener('click', () => {
      notificationService.markAsRead(notif.id);
      if (notif.targetUrl) {
        browserState.navigateActiveTab(notif.targetUrl);
      }
      toast.remove();
    });

    this.dom.toastContainer.appendChild(toast);

    // Auto remove after 4.5 seconds
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(40px)';
      setTimeout(() => toast.remove(), 180);
    }, 4500);
  }

  bindShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Ctrl+T: New Tab
      if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        browserState.createTab('sivraj://home', false, 'New Tab', '⚡');
      }

      // Ctrl+Shift+N: New Incognito Tab
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        browserState.createTab('sivraj://incognito', true, 'New Tab', '🕵️');
      }

      // Ctrl+W: Close Tab
      if (e.ctrlKey && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        if (browserState.activeTabId) {
          browserState.closeTab(browserState.activeTabId);
        }
      }

      // Ctrl+L or Alt+D: Focus Omnibox
      if ((e.ctrlKey && e.key.toLowerCase() === 'l') || (e.altKey && e.key.toLowerCase() === 'd')) {
        e.preventDefault();
        this.dom.omniboxInput.focus();
        this.dom.omniboxInput.select();
      }

      // Ctrl+H: History
      if (e.ctrlKey && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        browserState.navigateActiveTab('sivraj://history', 'History', '🕒');
      }
    });
  }

  applyZoom() {
    const zoomText = document.getElementById('menu-zoom-val');
    if (zoomText) zoomText.textContent = `${this.currentZoom}%`;
    if (this.dom.viewportContent) {
      this.dom.viewportContent.style.zoom = `${this.currentZoom}%`;
    }
  }

  applyTheme(theme) {
    const isLight = theme === 'light';
    document.body.classList.toggle('light-mode', isLight);
    localStorage.setItem('sivraj-theme', isLight ? 'light' : 'dark');
    if (this.dom.themeLabel) this.dom.themeLabel.textContent = isLight ? 'Light' : 'Dark';
  }

  updateUIForActiveTab(tab) {
    if (!tab) return;

    // Omnibox URL
    this.dom.omniboxInput.value = tab.url;

    // Back / Forward Buttons
    this.dom.backBtn.disabled = tab.historyIndex <= 0;
    this.dom.forwardBtn.disabled = tab.historyIndex >= tab.historyStack.length - 1;

    // Incognito Shell Styling
    if (tab.isIncognito) {
      this.dom.app.classList.add('is-incognito-mode');
    } else {
      this.dom.app.classList.remove('is-incognito-mode');
    }

    // Bookmark Star State
    this.updateBookmarkIcon(tab);

    // Bookmarks bar active state
    this.dom.bookmarksBar.querySelectorAll('.bookmark-item').forEach(item => {
      const itemUrl = item.getAttribute('data-url');
      item.classList.toggle('active', itemUrl === tab.url);
    });

    // Render Viewport
    this.renderViewport(tab);
  }

  updateBookmarkIcon(tab) {
    if (!tab) return;
    const isBookmarked = bookmarksStore.isBookmarked(tab.url);
    this.dom.omniboxStarBtn.classList.toggle('bookmarked', isBookmarked);
    this.dom.omniboxStarBtn.textContent = isBookmarked ? '★' : '☆';
  }

  renderViewport(tab) {
    if (!tab || !this.dom.viewportContent) return;
    this.dom.viewportContent.innerHTML = '';

    const onNavigate = (targetUrl) => {
      const route = URLRouter.getRouteInfo(targetUrl);
      this.triggerPageLoad(() => {
        browserState.navigateActiveTab(targetUrl, route.title, route.favicon);
      });
    };

    const url = tab.url || 'sivraj://home';
    const cleanUrl = url.split('?')[0];

    let viewNode;

    if (cleanUrl === 'sivraj://home' || cleanUrl === 'robo://home') {
      const urlParams = new URLSearchParams(url.includes('?') ? url.split('?')[1] : '');
      const searchParam = urlParams.get('q') || '';
      viewNode = renderHomeView(onNavigate, searchParam);
    } else if (cleanUrl === 'sivraj://botter' || cleanUrl === 'sivraj://robobook' || cleanUrl === 'robo://book') {
      viewNode = renderRobobookView(onNavigate);
    } else if (cleanUrl === 'sivraj://dailybot' || cleanUrl === 'sivraj://robonews' || cleanUrl === 'robo://news') {
      const urlParams = new URLSearchParams(url.includes('?') ? url.split('?')[1] : '');
      const articleParam = urlParams.get('article') || null;
      viewNode = renderRobonewsView(onNavigate, articleParam);
    } else if (cleanUrl === 'sivraj://pair' || cleanUrl === 'sivraj://robomatch' || cleanUrl === 'robo://match') {
      viewNode = renderRobomatchView(onNavigate);
    } else if (cleanUrl === 'sivraj://probablyuseful' || cleanUrl === 'sivraj://roboshop' || cleanUrl === 'robo://shop') {
      const urlParams = new URLSearchParams(url.includes('?') ? url.split('?')[1] : '');
      const productParam = urlParams.get('product') || null;
      const catParam = urlParams.get('category') || 'All';
      viewNode = renderRoboshopView(onNavigate, productParam, catParam);
    } else if (cleanUrl === 'sivraj://profile' || cleanUrl === 'sivraj://me' || cleanUrl === 'robo://profile') {
      viewNode = renderProfileView(onNavigate);
    } else if (cleanUrl === 'sivraj://history' || cleanUrl === 'robo://history') {
      viewNode = renderHistoryView(onNavigate);
    } else if (cleanUrl === 'sivraj://botoverflow') {
      viewNode = renderBotOverflowView(onNavigate);
    } else if (cleanUrl === 'sivraj://search') {
      const query = new URLSearchParams(url.split('?')[1] || '').get('q') || '';
      viewNode = renderSearchView(onNavigate, query);
    } else if (cleanUrl === 'sivraj://replyall') {
      viewNode = renderReplyAllView(onNavigate);
    } else if (cleanUrl === 'sivraj://notifications') {
      viewNode = renderNotificationsView(onNavigate);
    } else if (cleanUrl === 'sivraj://bookmarks') {
      viewNode = renderBookmarksView(onNavigate);
    } else if (cleanUrl === 'sivraj://incognito' || cleanUrl === 'about:incognito') {
      viewNode = renderIncognitoView(onNavigate);
    } else if (cleanUrl === 'about:blank') {
      viewNode = document.createElement('div');
    } else {
      const routeInfo = URLRouter.getRouteInfo(url);
      if (routeInfo.type === 'fictional_site') {
        viewNode = renderSitePlaceholder(routeInfo, onNavigate);
      } else {
        viewNode = renderErrorView(url, onNavigate);
      }
    }

    this.dom.viewportContent.appendChild(viewNode);
    normalizeIcons(viewNode);
    normalizeBranding(viewNode);
  }

  showDropdown(query) {
    const suggestions = URLRouter.getSuggestions(query);
    this.dom.omniboxDropdown.innerHTML = '';

    if (suggestions.length === 0) {
      this.hideDropdown();
      return;
    }

    suggestions.forEach(s => {
      const item = document.createElement('div');
      item.className = 'dropdown-item';
      item.innerHTML = `
        <span class="dropdown-icon">${s.icon || '🌐'}</span>
        <span class="dropdown-title">${escapeHTML(s.title)}</span>
        <span class="dropdown-url">${escapeHTML(s.url)}</span>
      `;

      item.addEventListener('click', () => {
        const routeInfo = URLRouter.getRouteInfo(s.url);
        this.hideDropdown();
        this.triggerPageLoad(() => {
          browserState.navigateActiveTab(s.url, routeInfo.title, routeInfo.favicon);
        });
      });

      this.dom.omniboxDropdown.appendChild(item);
      normalizeIcons(item);
      normalizeBranding(item);
    });

    this.dom.omniboxDropdown.classList.add('open');
  }

  hideDropdown() {
    this.dom.omniboxDropdown.classList.remove('open');
  }

  triggerPageLoad(callback) {
    const bar = this.dom.progressBar;
    bar.classList.add('loading');
    bar.style.width = '35%';

    setTimeout(() => {
      bar.style.width = '85%';
      setTimeout(() => {
        bar.style.width = '100%';
        if (callback) callback();
        setTimeout(() => {
          bar.classList.remove('loading');
          bar.style.width = '0%';
        }, 120);
      }, 60);
    }, 40);
  }
}

function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

function formatTimeAgo(timestamp) {
  if (!timestamp) return '';
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / (1000 * 60));
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / (1000 * 60 * 60));
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / (1000 * 60 * 60 * 24));
  return `${days}d ago`;
}

// Start application
document.addEventListener('DOMContentLoaded', () => {
  const app = new SivrajBrowserApp();
  app.init();
});
