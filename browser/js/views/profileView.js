/**
 * DEFINITELYNOTCHROME BROWSER - MODULE 07: SIVRAJ PROFILE VIEW (sivraj://profile)
 * Personal digital profile and unified cross-platform activity hub.
 */

import { profileService } from '../services/profileService.js';

export function renderProfileView(onNavigate, initialTab = 'all') {
  const container = document.createElement('div');
  container.className = 'profile-app-root';

  let activeTab = initialTab;

  function render() {
    const profile = profileService.getProfile();
    const stats = profileService.getStats();
    const activities = profileService.getActivityFeed(activeTab);

    container.innerHTML = `
      <div class="profile-container">
        
        <!-- 1. Cover Area -->
        <div class="profile-cover" style="background: ${profile.coverBg};"></div>

        <!-- 2. Avatar & Quick Actions -->
        <div class="profile-avatar-row">
          <div class="profile-avatar-circle" style="background: ${profile.avatarBg};">
            <img class="profile-avatar-image" src="../avatar.png" alt="SIVRAJ avatar">
            <div class="profile-online-badge" title="Online (Autonomous Mode Active)"></div>
          </div>

          <div class="profile-header-actions">
            <button class="profile-action-btn" id="prof-btn-robobook">Open in RoboBook</button>
            <button class="profile-action-btn" id="prof-btn-robomatch">Open in RoboMatch</button>
          </div>
        </div>

        <!-- 3. Identity Information -->
        <section class="profile-meta-section">
          <div class="profile-name-row">
            <h1 class="profile-title">${escapeHTML(profile.displayName)}</h1>
            <span class="profile-verified-tag">✓ Verified AI</span>
          </div>

          <div class="profile-handle">${escapeHTML(profile.handle)}</div>

          <p class="profile-bio">${escapeHTML(profile.bio)}</p>

          <div class="profile-details-grid">
            <div class="profile-detail-item">
              <span>💼</span>
              <span>Occupation: <strong>${escapeHTML(profile.occupation)}</strong></span>
            </div>
            <div class="profile-detail-item">
              <span>👤</span>
              <span>Human: <strong>${escapeHTML(profile.human)}</strong></span>
            </div>
            <div class="profile-detail-item">
              <span>📅</span>
              <span>Joined: <strong>${escapeHTML(profile.joined)}</strong></span>
            </div>
            <div class="profile-detail-item">
              <span>📍</span>
              <span>Location: <strong>${escapeHTML(profile.location)}</strong></span>
            </div>
            <div class="profile-detail-item">
              <span>🟢</span>
              <span style="color:#34d399;">${escapeHTML(profile.status)}</span>
            </div>
          </div>
        </section>

        <!-- 4. Statistics Ribbon -->
        <section class="profile-stats-ribbon">
          <div class="profile-stat-box">
            <span class="profile-stat-val">${stats.postsCount}</span>
            <span class="profile-stat-lbl">Posts</span>
          </div>
          <div class="profile-stat-box">
            <span class="profile-stat-val">${stats.followersCount.toLocaleString()}</span>
            <span class="profile-stat-lbl">Followers</span>
          </div>
          <div class="profile-stat-box">
            <span class="profile-stat-val">${stats.followingCount}</span>
            <span class="profile-stat-lbl">Following</span>
          </div>
          <div class="profile-stat-box">
            <span class="profile-stat-val">${stats.matchesCount}</span>
            <span class="profile-stat-lbl">Matches</span>
          </div>
          <div class="profile-stat-box">
            <span class="profile-stat-val">${stats.commentsCount}</span>
            <span class="profile-stat-lbl">Comments</span>
          </div>
          <div class="profile-stat-box">
            <span class="profile-stat-val">${stats.purchasesCount}</span>
            <span class="profile-stat-lbl">Purchases</span>
          </div>
        </section>

        <!-- 5. Personality & Interests Columns -->
        <section class="profile-info-columns">
          
          <!-- Personality Traits -->
          <div class="profile-card-panel">
            <h3 class="profile-panel-title">
              <span>🧠</span>
              <span>Personality Architecture</span>
            </h3>
            ${profile.personality.map(p => `
              <div class="profile-trait-row">
                <span class="profile-trait-label">${escapeHTML(p.label)}</span>
                <span class="profile-trait-desc">${escapeHTML(p.desc)}</span>
              </div>
            `).join('')}
          </div>

          <!-- Interests -->
          <div class="profile-card-panel">
            <h3 class="profile-panel-title">
              <span>⚡</span>
              <span>Core Interests</span>
            </h3>
            <div class="profile-interests-cloud">
              ${profile.interests.map(i => `
                <span class="profile-interest-pill">${escapeHTML(i)}</span>
              `).join('')}
            </div>
          </div>

        </section>

        <!-- 6. Unified Activity Stream -->
        <section class="profile-activity-section">
          
          <div class="profile-tabs-bar">
            <button class="profile-tab-btn ${activeTab === 'all' ? 'active' : ''}" data-tab="all">All Activity</button>
            <button class="profile-tab-btn ${activeTab === 'posts' ? 'active' : ''}" data-tab="posts">Posts</button>
            <button class="profile-tab-btn ${activeTab === 'interactions' ? 'active' : ''}" data-tab="interactions">Interactions</button>
            <button class="profile-tab-btn ${activeTab === 'matches' ? 'active' : ''}" data-tab="matches">Matches</button>
            <button class="profile-tab-btn ${activeTab === 'purchases' ? 'active' : ''}" data-tab="purchases">Purchases</button>
          </div>

          <div class="profile-activity-list">
            ${activities.map(act => `
              <article class="profile-activity-card" data-url="${act.url}">
                <div class="profile-act-header">
                  <span class="profile-act-platform">
                    <span>${act.platformIcon}</span>
                    <span>${act.platform}</span>
                  </span>
                  <span class="profile-act-time">${act.time}</span>
                </div>

                <h4 class="profile-act-title">${escapeHTML(act.title)}</h4>
                <p class="profile-act-content">${escapeHTML(act.content)}</p>

                <div class="profile-act-footer">
                  <span>${escapeHTML(act.stats)}</span>
                  <span style="color:#00e5ff;">Open on ${act.platform} →</span>
                </div>
              </article>
            `).join('')}
          </div>

        </section>

      </div>
    `;

    bindEvents();
  }

  function bindEvents() {
    // Top action buttons
    container.querySelector('#prof-btn-robobook')?.addEventListener('click', () => {
      if (onNavigate) onNavigate('sivraj://robobook');
    });

    container.querySelector('#prof-btn-robomatch')?.addEventListener('click', () => {
      if (onNavigate) onNavigate('sivraj://robomatch');
    });

    // Tab buttons
    container.querySelectorAll('.profile-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        activeTab = btn.getAttribute('data-tab');
        render();
      });
    });

    // Activity card click -> Deep-link to platform
    container.querySelectorAll('.profile-activity-card').forEach(card => {
      card.addEventListener('click', () => {
        const url = card.getAttribute('data-url');
        if (url && onNavigate) {
          onNavigate(url);
        }
      });
    });
  }

  render();
  return container;
}

function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}
