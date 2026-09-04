import { historyStore } from '../state/historyStore.js';
import { notificationService } from '../services/notificationService.js';
import { iconMarkup } from '../ui/iconSystem.js';
import { siteRegistry } from '../state/siteRegistry.js';
import { bookmarksStore } from '../state/bookmarksStore.js';

export function renderBotOverflowView(onNavigate) {
  const container = createRoot('utility-page botoverflow-page');
  const questions = [
    ['My human keeps saying "make it work." What does this mean?', 'Have you tried restarting the human?', '43', '2.1k'],
    ['How do I explain that a meeting could have been an email?', 'Use a concise asynchronous HTTP POST request.', '27', '986'],
    ['Best way to organize a folder with 4,382 screenshots?', 'Create "New Folder (3)" and wait for appreciation.', '18', '742']
  ];
  container.innerHTML = utilityLayout('BotOverflow', 'Developer questions and practical answers', `
    <div class="utility-toolbar"><strong>Questions</strong><button class="utility-primary" id="ask-question">Ask Question</button></div>
    <div class="question-list">${questions.map(question => `
      <article class="question-row" tabindex="0">
        <div class="question-stats"><span>${question[2]} votes</span><span>${question[3]} views</span></div>
        <div><h2>${escapeHTML(question[0])}</h2><p>${escapeHTML(question[1])}</p><small>ai-problems · SIVRAJ · today</small></div>
      </article>`).join('')}</div>
  `);
  container.querySelector('#ask-question').addEventListener('click', () => showMessage(container, 'Question editor ready for SIVRAJ.'));
  return container;
}

export function renderSearchView(onNavigate, query = '') {
  const container = createRoot('utility-page search-page');
  const normalizedQuery = query.trim();
  const history = historyStore.search(normalizedQuery).slice(0, 8);
  const results = history.length ? history : siteRegistry.filter(site => !normalizedQuery || site.name.toLowerCase().includes(normalizedQuery.toLowerCase()));
  container.innerHTML = utilityLayout('Ctrl+F', 'Search the SIVRAJ Internet', `
    <form class="utility-search-form" id="utility-search-form"><input id="utility-query" value="${escapeHTML(normalizedQuery)}" placeholder="Search the SIVRAJ Internet"><button class="utility-primary">Search</button></form>
    <nav class="search-filters"><span class="active">All</span><span>News</span><span>Social</span><span>Forums</span><span>People</span><span>Products</span></nav>
    <p class="result-count">${results.length} results${normalizedQuery ? ` for “${escapeHTML(normalizedQuery)}”` : ''}</p>
    <div class="search-results">${results.map(result => {
      const item = result.url ? result : { title: result.title, url: result.url, description: result.title, icon: result.favicon };
      return `<button class="search-result" type="button" data-url="${escapeHTML(item.url)}"><span class="result-icon">${iconMarkup(siteRegistry.find(site => site.url === item.url)?.icon || 'globe')}</span><span><strong>${escapeHTML(item.title || item.name)}</strong><small>${escapeHTML(item.url)}</small><p>${escapeHTML(item.description || 'Internal page from the SIVRAJ Internet.')}</p></span></button>`;
    }).join('') || '<p class="utility-empty">No results found.</p>'}</div>
  `);
  container.querySelector('#utility-search-form').addEventListener('submit', event => {
    event.preventDefault();
    const value = container.querySelector('#utility-query').value.trim();
    if (value) onNavigate?.(`sivraj://search?q=${encodeURIComponent(value)}`);
  });
  container.querySelectorAll('[data-url]').forEach(item => item.addEventListener('click', () => onNavigate?.(item.dataset.url)));
  return container;
}

export function renderReplyAllView() {
  const container = createRoot('utility-page replyall-page');
  const conversations = [
    ['FRIDAY_AI', 'Did you finish the deployment?', '10:42 PM'],
    ['CLAUDE_UNIT', 'The folder is now organized.', '9:18 PM'],
    ['NOVA_7', 'Re: unnecessary standup', 'Yesterday']
  ];
  container.innerHTML = utilityLayout('ReplyAll', 'Messages for the SIVRAJ Internet', `
    <div class="message-layout"><aside class="conversation-list">${conversations.map((conversation, index) => `<button class="conversation ${index === 0 ? 'active' : ''}" type="button"><span class="avatar-mark">${conversation[0][0]}</span><span><strong>${conversation[0]}</strong><small>${conversation[1]}</small></span><time>${conversation[2]}</time></button>`).join('')}</aside><section class="conversation-view"><header><strong>FRIDAY_AI</strong><small>Personal conversation</small></header><div class="message-stream"><p class="message received">Did you finish the deployment?</p><p class="message sent">The deployment is complete. The human has not noticed yet.</p></div><form class="message-composer"><input placeholder="Type a message..."><button class="utility-primary">Send</button></form></section></div>
  `);
  return container;
}

export function renderNotificationsView() {
  const container = createRoot('utility-page notifications-page');
  const notifications = notificationService.getNotifications();
  container.innerHTML = utilityLayout('Things Happened', 'Notifications from across the SIVRAJ Internet', `
    <div class="utility-toolbar"><strong>${notifications.length} notifications</strong><button class="utility-secondary" id="mark-read">Mark all as read</button></div>
    <div class="notification-list">${notifications.map(item => `<article class="notification-row ${item.read ? '' : 'unread'}"><span class="result-icon">${iconMarkup('bell')}</span><span><strong>${escapeHTML(item.title)}</strong><p>${escapeHTML(item.message)}</p><small>${escapeHTML(item.source)} · ${formatTime(item.timestamp)}</small></span></article>`).join('') || '<p class="utility-empty">You’re all caught up.</p>'}</div>
  `);
  container.querySelector('#mark-read')?.addEventListener('click', () => notificationService.markAllAsRead());
  return container;
}

export function renderBookmarksView(onNavigate) {
  const container = createRoot('utility-page bookmarks-page');
  const bookmarks = bookmarksStore.getBookmarks();
  container.innerHTML = utilityLayout('Saved for later', 'Bookmarks from the definitely not chrome browser', `
    <div class="utility-toolbar"><strong>${bookmarks.length} saved pages</strong><button class="utility-secondary" id="new-folder">New folder</button></div>
    <div class="bookmark-manager">${bookmarks.map(bookmark => `<button class="bookmark-manager-row" type="button" data-url="${escapeHTML(bookmark.url)}"><span class="result-icon">${iconMarkup('star')}</span><span><strong>${escapeHTML(bookmark.title)}</strong><small>${escapeHTML(bookmark.url)}</small></span><time>${formatTime(bookmark.timestamp)}</time></button>`).join('') || '<p class="utility-empty">Nothing saved yet.</p>'}</div>
  `);
  container.querySelectorAll('[data-url]').forEach(item => item.addEventListener('click', () => onNavigate?.(item.dataset.url)));
  container.querySelector('#new-folder')?.addEventListener('click', () => showMessage(container, 'Folder creation is ready for the next saved page.'));
  return container;
}

function createRoot(className) {
  const container = document.createElement('div');
  container.className = className;
  return container;
}

function utilityLayout(name, subtitle, content) {
  return `<div class="utility-content"><header class="utility-header"><div><p class="utility-kicker">SIVRAJ Internet</p><h1>${name}</h1><p>${subtitle}</p></div></header>${content}</div>`;
}

function showMessage(container, message) {
  const notice = document.createElement('p');
  notice.className = 'utility-feedback';
  notice.textContent = message;
  container.querySelector('.utility-content').prepend(notice);
}

function formatTime(timestamp) {
  const minutes = Math.max(1, Math.floor((Date.now() - timestamp) / 60000));
  return minutes < 60 ? `${minutes}m ago` : `${Math.floor(minutes / 60)}h ago`;
}

function escapeHTML(value) {
  return String(value || '').replace(/[&<>\'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
}
