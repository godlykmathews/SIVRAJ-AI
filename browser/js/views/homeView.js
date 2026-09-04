import { historyStore } from '../state/historyStore.js';
import { bookmarksStore } from '../state/bookmarksStore.js';
import { iconMarkup } from '../ui/iconSystem.js';
import { siteRegistry, getSiteByUrl } from '../state/siteRegistry.js';

export function renderHomeView(onNavigate) {
  const container = document.createElement('div');
  container.className = 'home-container';
  const history = historyStore.getHistory().filter(item => item.url && item.url !== 'sivraj://home').slice(0, 5);
  const recentPages = history.length ? history : siteRegistry.slice(0, 5).map((site, index) => ({ title: `${site.name} — Home`, url: site.url, icon: site.icon, timestamp: Date.now() - (index + 1) * 1080000 }));
  const bookmarks = bookmarksStore.getBookmarks();

  container.innerHTML = `
    <div class="home-content">
      <header class="home-header"><h1 aria-label="definitely not chrome"><span class="logo-blue">definitely</span> <span class="logo-red">not</span> <span class="logo-yellow">chrome</span></h1></header>
      <form class="home-search-form" id="home-search-form" role="search">
        <span class="home-search-icon">${iconMarkup('search')}</span>
        <input id="home-search-input" class="home-search-input" type="text" placeholder="Search the SIVRAJ Internet" autocomplete="off" spellcheck="false">
        <button class="home-search-submit" type="submit" aria-label="Search">${iconMarkup('search')}</button>
      </form>
      <section class="home-section" aria-labelledby="quick-heading">
        <div class="home-section-header"><h2 id="quick-heading">Quick Access</h2><span>Frequently visited</span></div>
        <div class="quick-links-grid">${siteRegistry.map(site => `
          <button class="quick-link" type="button" data-url="${site.url}"><span class="quick-link-icon">${iconMarkup(site.icon)}</span><span><strong>${escapeHTML(site.name)}</strong><small>${site.url}</small></span></button>
        `).join('')}</div>
      </section>
      <section class="home-section" aria-labelledby="recent-heading">
        <div class="home-section-header"><h2 id="recent-heading">Recently visited</h2><span>${recentPages.length} pages</span></div>
        <div class="recent-pages-list">${recentPages.map(page => `
          <button class="recent-page" type="button" data-url="${escapeHTML(page.url)}"><span class="recent-page-icon">${iconMarkup(getSiteByUrl(page.url)?.icon || page.icon || 'globe')}</span><span><strong>${escapeHTML(displayTitle(page.title))}</strong><small>${escapeHTML(getSiteByUrl(page.url)?.name || page.url)} · ${escapeHTML(page.url)}</small></span><time>${formatTimeAgo(page.timestamp)}</time></button>
        `).join('')}</div>
      </section>
      ${bookmarks.length ? `<section class="home-section"><div class="home-section-header"><h2>Saved</h2><span>Bookmarks</span></div><div class="saved-list">${bookmarks.map(bookmark => `
        <button class="saved-item" type="button" data-url="${escapeHTML(bookmark.url)}"><span>${iconMarkup(getSiteByUrl(bookmark.url)?.icon || 'star')}</span><span><strong>${escapeHTML(displayTitle(bookmark.title))}</strong><small>${escapeHTML(getSiteByUrl(bookmark.url)?.name || bookmark.url)}</small></span></button>
      `).join('')}</div></section>` : ''}
      <footer class="home-footer">SIVRAJ <span>•</span> Online</footer>
    </div>`;

  container.querySelector('#home-search-form').addEventListener('submit', event => {
    event.preventDefault();
    const query = container.querySelector('#home-search-input').value.trim();
    if (query) onNavigate?.(`sivraj://search?q=${encodeURIComponent(query)}`);
  });
  container.querySelectorAll('[data-url]').forEach(item => item.addEventListener('click', () => onNavigate?.(item.dataset.url)));
  return container;
}

function formatTimeAgo(timestamp) {
  if (!timestamp) return '';
  const minutes = Math.max(1, Math.floor((Date.now() - timestamp) / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours}h ago` : `${Math.floor(hours / 24)}d ago`;
}

function displayTitle(title) {
  return String(title || '')
    .replaceAll('RoboBook', 'BotBook')
    .replaceAll('RoboNews', '404 News')
    .replaceAll('RoboForum', 'BotOverflow')
    .replaceAll('RoboMatch', 'Neuralinked')
    .replaceAll('RoboShop', 'Consume.exe');
}

function escapeHTML(value) {
  return String(value || '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
}
