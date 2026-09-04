/**
 * DEFINITELYNOTCHROME BROWSER - Chromium Tab Manager
 * Manages authentic Chrome tabs, selection, and close actions.
 */

import { browserState } from '../state/browserState.js';
import { URLRouter } from './urlRouter.js';
import { normalizeIcons, normalizeBranding } from '../ui/iconSystem.js';

export class TabManager {
  constructor({ tabListEl, onTabSelect, onTabClose }) {
    this.tabListEl = tabListEl;
    this.onTabSelect = onTabSelect;
    this.onTabClose = onTabClose;

    browserState.on('tabsChanged', ({ tabs, activeTabId }) => {
      this.renderTabs(tabs, activeTabId);
    });
  }

  renderTabs(tabs, activeTabId) {
    this.tabListEl.innerHTML = '';

    tabs.forEach(tab => {
      const tabItem = document.createElement('div');
      const isActive = tab.id === activeTabId;
      tabItem.className = `chrome-tab ${isActive ? 'active' : ''} ${tab.isIncognito ? 'is-incognito' : ''}`;
      tabItem.setAttribute('data-tab-id', tab.id);

      const routeInfo = URLRouter.getRouteInfo(tab.url);
      const displayTitle = tab.isIncognito && (tab.url === 'sivraj://incognito' || tab.url === 'about:incognito')
        ? 'Incognito'
        : (tab.title || routeInfo.title);
      const displayFavicon = tab.isIncognito ? '🕵️' : (tab.favicon || routeInfo.favicon);

      tabItem.innerHTML = `
        <span class="tab-favicon">${displayFavicon}</span>
        <span class="tab-title" title="${escapeHTML(displayTitle)}">${escapeHTML(displayTitle)}</span>
        <button class="tab-close-btn" title="Close tab (Ctrl+W)">✕</button>
      `;
      normalizeIcons(tabItem);
      normalizeBranding(tabItem);

      tabItem.addEventListener('click', (e) => {
        if (e.target.closest('.tab-close-btn')) return;
        browserState.setActiveTab(tab.id);
        if (this.onTabSelect) this.onTabSelect(tab);
      });

      const closeBtn = tabItem.querySelector('.tab-close-btn');
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        browserState.closeTab(tab.id);
        if (this.onTabClose) this.onTabClose(tab.id);
      });

      this.tabListEl.appendChild(tabItem);
    });

    const activeEl = this.tabListEl.querySelector('.chrome-tab.active');
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', inline: 'nearest' });
    }
  }
}

function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}
