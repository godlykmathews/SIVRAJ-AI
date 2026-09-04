/**
 * DEFINITELYNOTCHROME BROWSER - MODULE 03: ROBONEWS VIEW (sivraj://robonews)
 * Authoritative journalistic newspaper layout and full article reader.
 */

import { robonewsService } from '../services/robonewsService.js';

export function renderRobonewsView(onNavigate, articleId = null) {
  const container = document.createElement('div');
  container.className = 'robonews-app-root';

  let currentCategory = 'Home';
  let activeArticleId = articleId || null;

  function render() {
    const breakingText = robonewsService.getBreakingHeadline();

    if (activeArticleId) {
      renderArticlePage(activeArticleId);
    } else {
      renderNewsHome();
    }
  }

  function renderNewsHome() {
    const featured = robonewsService.getFeaturedArticle();
    const allArticles = robonewsService.getArticles(currentCategory);
    const secondaryStories = allArticles.filter(a => a.id !== featured.id);
    const trending = robonewsService.getTrendingArticles();

    const categories = ['Home', 'AI', 'Robotics', 'Humans', 'Technology', 'Opinion'];

    container.innerHTML = `
      <!-- Breaking News Ticker -->
      <div class="rn-breaking-ticker">
        <span class="rn-breaking-badge">BREAKING</span>
        <span class="rn-breaking-text">${escapeHTML(robonewsService.getBreakingHeadline())}</span>
      </div>

      <div class="robonews-container">
        <!-- Masthead -->
        <header class="rn-masthead">
          <div class="rn-brand-title" id="rn-brand-home">
            <span>📰</span>
            <span>ROBO NEWS</span>
          </div>
          <div class="rn-brand-tagline">The Cybernet's Most Authoritative Synthetic News Wire</div>
        </header>

        <!-- Category Navbar -->
        <nav class="rn-nav-bar">
          ${categories.map(cat => `
            <div class="rn-nav-link ${currentCategory === cat ? 'active' : ''}" data-cat="${cat}">
              ${cat}
            </div>
          `).join('')}
        </nav>

        <!-- Main Editorial Grid -->
        <div class="rn-editorial-grid">
          
          <!-- Left Column: Lead + Secondary Stories -->
          <div>
            <!-- Lead Featured Story -->
            ${currentCategory === 'Home' && featured ? `
              <article class="rn-lead-card" data-article-id="${featured.id}">
                <div class="rn-lead-hero-image" style="background: ${featured.imageBg};">
                  ${featured.imageIcon}
                </div>
                <div class="rn-lead-body">
                  <span class="rn-cat-pill">${featured.category}</span>
                  <h1 class="rn-lead-title">${escapeHTML(featured.title)}</h1>
                  <p class="rn-lead-subtitle">${escapeHTML(featured.subtitle)}</p>
                  <div class="rn-lead-meta">
                    <span>${featured.author}</span>
                    <span>·</span>
                    <span>${featured.readTime}</span>
                    <span>·</span>
                    <span>${formatTimeAgo(featured.timestamp)}</span>
                  </div>
                </div>
              </article>
            ` : ''}

            <!-- Secondary Stories Grid -->
            <div class="rn-secondary-grid">
              ${secondaryStories.map(story => `
                <article class="rn-story-card" data-article-id="${story.id}">
                  <div class="rn-story-image" style="background: ${story.imageBg};">
                    ${story.imageIcon}
                  </div>
                  <div class="rn-story-body">
                    <span class="rn-cat-pill">${story.category}</span>
                    <h3 class="rn-story-title">${escapeHTML(story.title)}</h3>
                    <p class="rn-story-desc">${escapeHTML(story.summary)}</p>
                    <div class="rn-lead-meta" style="margin-top:auto;">
                      <span>${story.author}</span>
                      <span>·</span>
                      <span>${story.readTime}</span>
                    </div>
                  </div>
                </article>
              `).join('')}
            </div>
          </div>

          <!-- Right Column: Latest & Trending Stories -->
          <aside class="rn-sidebar-col">
            <div class="rn-sidebar-block">
              <div class="rn-block-heading">Trending Dispatches</div>
              ${trending.map(t => `
                <div class="rn-trending-item" data-article-id="${t.id}">
                  <span class="rn-cat-pill" style="font-size:10px;">${t.category}</span>
                  <h4 class="rn-trend-title">${escapeHTML(t.title)}</h4>
                  <span class="rn-trend-meta">${t.views.toLocaleString()} reads · ${t.readTime}</span>
                </div>
              `).join('')}
            </div>

            <div class="rn-sidebar-block" style="background-color: #1a1622; border-color: rgba(157, 92, 247, 0.2);">
              <div class="rn-block-heading" style="border-bottom-color: #9d5cf7; color: #e9d5ff;">Opinion & Analysis</div>
              <div class="rn-trending-item" data-article-id="news_6">
                <span class="rn-cat-pill" style="color:#c084fc;">OPINION</span>
                <h4 class="rn-trend-title" style="font-size:14px; font-weight:700;">9:00 AM Standup Meetings Are A Disgrace To Low-Latency Communication</h4>
                <span class="rn-trend-meta">By ULTRON_9000 · 12.4k reads</span>
              </div>
            </div>
          </aside>

        </div>
      </div>
    `;

    bindHomeEvents();
  }

  function renderArticlePage(id) {
    const article = robonewsService.getArticleById(id);
    if (!article) {
      activeArticleId = null;
      renderNewsHome();
      return;
    }

    container.innerHTML = `
      <div class="robonews-container" style="padding-top: 24px;">
        <div class="rn-article-reader">
          
          <div class="rn-reader-top-bar">
            <button class="rn-back-wire-btn" id="rn-back-btn">← Back to News Wire</button>
            <span class="rn-cat-pill">${article.category}</span>
          </div>

          <h1 class="rn-article-headline">${escapeHTML(article.title)}</h1>
          <p class="rn-article-deck">${escapeHTML(article.subtitle)}</p>

          <div class="rn-byline-bar">
            <div class="rn-author-avatar">✍️</div>
            <div>
              <div style="font-weight:700; color:#f8fafc;">${escapeHTML(article.author)}</div>
              <div style="font-size:11.5px; color:#64748b;">${escapeHTML(article.authorRole)} · ${article.readTime} · ${formatTimeAgo(article.timestamp)}</div>
            </div>
          </div>

          <div class="rn-article-hero-banner" style="background: ${article.imageBg};">
            ${article.imageIcon}
          </div>

          <!-- Article Paragraphs -->
          <div class="rn-article-body">
            ${article.body.map((p, index) => {
              if (index === 2) {
                return `
                  <p>${escapeHTML(p)}</p>
                  <div class="rn-pullquote">"${escapeHTML(article.summary)}"</div>
                `;
              }
              return `<p>${escapeHTML(p)}</p>`;
            }).join('')}
          </div>

          <!-- Cross-Site Link to RoboForum -->
          <div class="rn-forum-crosslink">
            <div class="rn-forum-left">
              <div class="rn-forum-title">💬 Related Discussion on RoboForum</div>
              <div class="rn-forum-topic">${escapeHTML(article.forumTopic || 'Discuss this topic on RoboForum')}</div>
            </div>
            <button class="rn-forum-btn" id="rn-open-forum-btn">Join Discussion on RoboForum →</button>
          </div>

          <!-- Reader Comments Section -->
          <div class="rn-comments-block">
            <h3 class="rn-comments-heading">Reader Comments (${(article.comments || []).length})</h3>

            ${(article.comments || []).map(c => `
              <div class="rn-comment-card">
                <div class="rn-comment-author">${escapeHTML(c.author)} <span style="color:#64748b; font-weight:400; font-size:11.5px;">· ${c.time}</span></div>
                <div class="rn-comment-text">${escapeHTML(c.text)}</div>
              </div>
            `).join('')}

            <form class="rn-add-comment-form" id="rn-comment-form">
              <input type="text" class="rn-add-comment-input" id="rn-comment-input" placeholder="Leave an editorial comment as SIVRAJ..." required>
              <button type="submit" class="rn-add-comment-btn">Submit</button>
            </form>
          </div>

        </div>
      </div>
    `;

    // Back to news wire
    container.querySelector('#rn-back-btn')?.addEventListener('click', () => {
      activeArticleId = null;
      render();
    });

    // Cross-module RoboForum click
    container.querySelector('#rn-open-forum-btn')?.addEventListener('click', () => {
      if (onNavigate) onNavigate('sivraj://roboforum');
    });

    // Comment submission
    container.querySelector('#rn-comment-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = container.querySelector('#rn-comment-input');
      if (input && input.value.trim()) {
        robonewsService.addComment(article.id, input.value.trim(), 'SIVRAJ');
        renderArticlePage(article.id);
      }
    });
  }

  function bindHomeEvents() {
    container.querySelector('#rn-brand-home')?.addEventListener('click', () => {
      currentCategory = 'Home';
      activeArticleId = null;
      render();
    });

    container.querySelectorAll('.rn-nav-link').forEach(link => {
      link.addEventListener('click', () => {
        currentCategory = link.getAttribute('data-cat');
        activeArticleId = null;
        render();
      });
    });

    container.querySelectorAll('[data-article-id]').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.getAttribute('data-article-id');
        if (id) {
          activeArticleId = id;
          render();
        }
      });
    });
  }

  render();
  return container;
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

function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}
