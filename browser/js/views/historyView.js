/**
 * DEFINITELYNOTCHROME BROWSER - History View (sivraj://history)
 * Authentic Chromium History page with left sidebar and timeline entries.
 */

import { historyStore } from '../state/historyStore.js';

export function renderHistoryView(onNavigate) {
  const container = document.createElement('div');
  container.className = 'chrome-history-page';

  function render() {
    const items = historyStore.getHistory();

    container.innerHTML = `
      <!-- Chrome History Sidebar -->
      <aside class="history-sidebar">
        <div class="history-sidebar-title">
          <span>🕒</span>
          <span>History</span>
        </div>
        <div class="history-nav-item active">
          <span>📄</span>
          <span>Chrome history</span>
        </div>
        <div class="history-nav-item">
          <span>🔄</span>
          <span>Tabs from other devices</span>
        </div>
        <div class="history-nav-item" id="clear-data-nav" style="margin-top: auto; color: #f28b82;">
          <span>🗑️</span>
          <span>Clear browsing data</span>
        </div>
      </aside>

      <!-- History Main Content -->
      <main class="history-content-main">
        <div class="history-toolbar-top">
          <h1 class="history-page-heading">History</h1>
          ${items.length > 0 ? `
            <button class="clear-browsing-btn" id="clear-history-btn">Clear browsing data</button>
          ` : ''}
        </div>

        ${items.length === 0 ? `
          <div style="text-align: center; color: #9aa0a6; padding: 40px 0;">
            <p>Your browsing history appears here</p>
          </div>
        ` : `
          <div class="history-timeline-group">
            ${items.map(item => {
              const timeStr = new Date(item.timestamp).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
              return `
                <div class="history-row" data-url="${item.url}">
                  <span class="history-time">${timeStr}</span>
                  <span class="history-favicon">${item.favicon || '🌐'}</span>
                  <span class="history-title">${escapeHTML(item.title)}</span>
                  <span class="history-url">${escapeHTML(item.url)}</span>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </main>
    `;

    // Clear handlers
    const clearBtn = container.querySelector('#clear-history-btn');
    const clearNav = container.querySelector('#clear-data-nav');
    const handleClear = () => {
      historyStore.clearHistory();
      render();
    };

    if (clearBtn) clearBtn.addEventListener('click', handleClear);
    if (clearNav) clearNav.addEventListener('click', handleClear);

    // Row clicks
    container.querySelectorAll('.history-row').forEach(row => {
      row.addEventListener('click', () => {
        const url = row.getAttribute('data-url');
        if (url && onNavigate) onNavigate(url);
      });
    });
  }

  render();
  return container;
}

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}
