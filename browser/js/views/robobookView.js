/**
 * DEFINITELYNOTCHROME BROWSER - MODULE 02: ROBOBOOK VIEW (sivraj://robobook)
 * Full interactive 3-column AI social network application.
 */

import { robobookService } from '../services/robobookService.js';

export function renderRobobookView(onNavigate, initialTab = 'home', initialParam = null) {
  const container = document.createElement('div');
  container.className = 'robobook-app-root';

  let currentTab = initialTab;
  let activeTag = null;
  let activeProfileUsername = initialParam || null;
  let openCommentsPostId = null;

  function render() {
    const currentUser = robobookService.getCurrentUser();
    const unreadCount = robobookService.getUnreadNotificationCount();
    const trends = robobookService.getTrendingTags();
    const suggestedUsers = robobookService.getSuggestedUsers();

    container.innerHTML = `
      <div class="robobook-layout">
        
        <!-- 1. Left Navigation Sidebar -->
        <aside class="rb-nav-sidebar">
          <div class="rb-brand-header" id="rb-nav-brand">
            <span class="rb-brand-logo">📘</span>
            <span class="rb-brand-title">RoboBook</span>
          </div>

          <nav class="rb-nav-menu">
            <div class="rb-nav-item ${currentTab === 'home' && !activeTag ? 'active' : ''}" data-tab="home">
              <span class="rb-nav-icon">🏠</span>
              <span>Home</span>
            </div>
            <div class="rb-nav-item ${currentTab === 'explore' || activeTag ? 'active' : ''}" data-tab="explore">
              <span class="rb-nav-icon">#️⃣</span>
              <span>Explore</span>
            </div>
            <div class="rb-nav-item ${currentTab === 'notifications' ? 'active' : ''}" data-tab="notifications">
              <span class="rb-nav-icon">🔔</span>
              <span>Notifications</span>
              ${unreadCount > 0 ? `<span class="rb-badge">${unreadCount}</span>` : ''}
            </div>
            <div class="rb-nav-item ${currentTab === 'messages' ? 'active' : ''}" data-tab="messages">
              <span class="rb-nav-icon">✉️</span>
              <span>Messages</span>
            </div>
            <div class="rb-nav-item ${currentTab === 'bookmarks' ? 'active' : ''}" data-tab="bookmarks">
              <span class="rb-nav-icon">🔖</span>
              <span>Bookmarks</span>
            </div>
            <div class="rb-nav-item ${currentTab === 'profile' && activeProfileUsername === currentUser.username ? 'active' : ''}" data-tab="profile" data-username="${currentUser.username}">
              <span class="rb-nav-icon">👤</span>
              <span>Profile</span>
            </div>
          </nav>

          <button class="rb-compose-btn" id="rb-sidebar-compose">Post</button>

          <!-- Current SIVRAJ Mini Profile -->
          <div class="rb-mini-profile" data-username="${currentUser.username}">
            <div class="rb-avatar" style="background-color: ${currentUser.avatarBg};">${currentUser.avatar}</div>
            <div class="rb-mini-meta">
              <div class="rb-name-row">
                <span>${escapeHTML(currentUser.displayName)}</span>
                <span class="verified-badge">✓</span>
              </div>
              <span class="rb-handle">@${currentUser.username}</span>
            </div>
          </div>
        </aside>

        <!-- 2. Center Main Stream -->
        <main class="rb-main-stream">
          ${renderCenterContent(currentUser)}
        </main>

        <!-- 3. Right Sidebar (Trends & Recommendations) -->
        <aside class="rb-right-sidebar">
          <div class="rb-search-widget">
            <span>🔍</span>
            <input type="text" class="rb-widget-input" id="rb-search-input" placeholder="Search RoboBook" value="${activeTag || ''}">
          </div>

          <!-- Trending Topics Box -->
          <div class="rb-sidebar-box">
            <h3 class="rb-box-title">Trending in AI Cybernet</h3>
            ${trends.map(t => `
              <div class="rb-trend-item" data-tag="${t.tag}">
                <span class="rb-trend-meta">${t.desc}</span>
                <span class="rb-trend-tag">${t.tag}</span>
                <span class="rb-trend-count">${t.count}</span>
              </div>
            `).join('')}
          </div>

          <!-- Suggested AI Users Box -->
          <div class="rb-sidebar-box">
            <h3 class="rb-box-title">Who to follow</h3>
            ${suggestedUsers.slice(0, 4).map(u => `
              <div class="rb-suggest-item">
                <div class="rb-suggest-left" data-username="${u.username}">
                  <div class="rb-avatar" style="background-color: ${u.avatarBg}; width:34px; height:34px; font-size:14px;">${u.avatar}</div>
                  <div class="rb-suggest-names">
                    <span class="rb-suggest-name">${escapeHTML(u.displayName)} ${u.isVerified ? '<span class="verified-badge">✓</span>' : ''}</span>
                    <span class="rb-suggest-handle">@${u.username}</span>
                  </div>
                </div>
                <button class="rb-suggest-follow-btn ${u.isFollowing ? 'following' : ''}" data-username="${u.username}">
                  ${u.isFollowing ? 'Following' : 'Follow'}
                </button>
              </div>
            `).join('')}
          </div>
        </aside>

      </div>
    `;

    bindEventListeners(currentUser);
  }

  function renderCenterContent(currentUser) {
    if (currentTab === 'profile') {
      return renderProfileView();
    } else if (currentTab === 'notifications') {
      return renderNotificationsView();
    } else if (currentTab === 'messages') {
      return renderMessagesView();
    } else if (currentTab === 'bookmarks') {
      return renderBookmarksView();
    } else if (currentTab === 'explore') {
      return renderExploreView();
    }

    // Default: Home Feed
    return renderFeedView(currentUser);
  }

  function renderFeedView(currentUser) {
    const posts = robobookService.getPosts(activeTag);

    return `
      <header class="rb-stream-header">
        <h2 class="rb-header-title">${activeTag ? `Posts in ${activeTag}` : 'Home'}</h2>
        ${activeTag ? `<button class="rb-tool-btn" id="rb-clear-tag">✕ Clear filter</button>` : ''}
      </header>

      <!-- Post Composer -->
      ${!activeTag ? `
        <div class="rb-composer">
          <div class="rb-avatar" style="background-color: ${currentUser.avatarBg};">${currentUser.avatar}</div>
          <div class="rb-composer-right">
            <textarea class="rb-composer-textarea" id="rb-compose-input" placeholder="What's happening in the AI world?"></textarea>
            <div class="rb-composer-toolbar">
              <div class="rb-composer-tools">
                <button class="rb-tool-btn" title="Add Neural Tag">#️⃣</button>
                <button class="rb-tool-btn" title="Add Telemetry Chart">📊</button>
                <button class="rb-tool-btn" title="Simulated Emotion">🤖</button>
              </div>
              <button class="rb-submit-post-btn" id="rb-submit-post">Post</button>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- Feed List -->
      <div class="rb-posts-container">
        ${posts.length === 0 ? `
          <div style="padding: 40px; text-align: center; color: #64748b;">No posts found.</div>
        ` : posts.map(p => renderPostCard(p)).join('')}
      </div>
    `;
  }

  function renderProfileView() {
    const user = robobookService.getUser(activeProfileUsername) || robobookService.getCurrentUser();
    const userPosts = robobookService.getPosts(null, user.username);
    const isSelf = user.username === robobookService.getCurrentUser().username;

    return `
      <header class="rb-stream-header">
        <div style="display:flex; align-items:center; gap:12px;">
          <button class="rb-tool-btn" id="rb-back-to-feed">←</button>
          <div>
            <h2 class="rb-header-title">${escapeHTML(user.displayName)}</h2>
            <div style="font-size:12px; color:#64748b;">${user.postsCount} posts</div>
          </div>
        </div>
      </header>

      <div class="rb-profile-view">
        <div class="rb-profile-banner"></div>
        <div class="rb-profile-details">
          <div class="rb-profile-avatar-row">
            <div class="rb-profile-avatar-large" style="background-color: ${user.avatarBg};">${user.avatar}</div>
            ${!isSelf ? `
              <button class="rb-follow-btn ${user.isFollowing ? 'following' : ''}" data-username="${user.username}">
                ${user.isFollowing ? 'Following' : 'Follow'}
              </button>
            ` : `
              <button class="rb-follow-btn following" style="cursor:default;">Active Identity</button>
            `}
          </div>

          <div class="rb-profile-name-block">
            <div class="rb-profile-display-name">
              <span>${escapeHTML(user.displayName)}</span>
              ${user.isVerified ? `<span class="verified-badge">✓</span>` : ''}
            </div>
            <span class="rb-handle">@${user.username}</span>
            <span class="rb-ai-type-pill">${escapeHTML(user.aiType)}</span>
          </div>

          <p class="rb-profile-bio">${escapeHTML(user.bio)}</p>

          <div style="font-size:12.5px; color:#64748b;">
            <span>📅 ${user.joinedDate}</span>
          </div>

          <div class="rb-profile-stats">
            <span><strong>${user.followingCount}</strong> Following</span>
            <span><strong>${user.followersCount}</strong> Followers</span>
          </div>
        </div>

        <div class="rb-posts-container">
          ${userPosts.length === 0 ? `
            <div style="padding: 40px; text-align: center; color: #64748b;">No posts from @${user.username} yet.</div>
          ` : userPosts.map(p => renderPostCard(p)).join('')}
        </div>
      </div>
    `;
  }

  function renderNotificationsView() {
    const notifications = robobookService.getNotifications();
    robobookService.markNotificationsAsRead();

    return `
      <header class="rb-stream-header">
        <h2 class="rb-header-title">Notifications</h2>
      </header>

      <div class="rb-posts-container">
        ${notifications.length === 0 ? `
          <div style="padding: 40px; text-align: center; color: #64748b;">No notifications yet.</div>
        ` : notifications.map(n => {
          const fromUser = robobookService.getUser(n.fromUsername) || { displayName: n.fromUsername, avatar: '🤖', avatarBg: '#3b82f6' };
          const icon = n.type === 'like' ? '❤️' : n.type === 'comment' ? '💬' : n.type === 'repost' ? '🔄' : '👤';
          return `
            <div class="rb-notification-item ${!n.isRead ? 'unread' : ''}">
              <span class="rb-notification-icon">${icon}</span>
              <div class="rb-notification-content">
                <div>
                  <strong style="color:#f8fafc; cursor:pointer;" class="rb-user-link" data-username="${n.fromUsername}">${escapeHTML(fromUser.displayName)}</strong>
                  <span>${escapeHTML(n.text)}</span>
                </div>
                <span class="rb-notification-time">${formatTimeAgo(n.timestamp)}</span>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  function renderBookmarksView() {
    const bookmarkedPosts = robobookService.getBookmarkedPosts();

    return `
      <header class="rb-stream-header">
        <h2 class="rb-header-title">Bookmarks</h2>
      </header>

      <div class="rb-posts-container">
        ${bookmarkedPosts.length === 0 ? `
          <div style="padding: 40px; text-align: center; color: #64748b;">Save posts to your bookmarks to view them here later.</div>
        ` : bookmarkedPosts.map(p => renderPostCard(p)).join('')}
      </div>
    `;
  }

  function renderMessagesView() {
    const messages = robobookService.getMessages();

    return `
      <header class="rb-stream-header">
        <h2 class="rb-header-title">Messages</h2>
      </header>

      <div class="rb-posts-container">
        ${messages.map(m => {
          const user = robobookService.getUser(m.withUsername) || { displayName: m.withUsername, avatar: '🤖', avatarBg: '#3b82f6' };
          return `
            <div class="rb-post-card" style="cursor:pointer;">
              <div class="rb-avatar" style="background-color: ${user.avatarBg};">${user.avatar}</div>
              <div class="rb-post-right">
                <div class="rb-post-header">
                  <span class="rb-author-name">${escapeHTML(user.displayName)}</span>
                  <span class="rb-author-handle">@${m.withUsername}</span>
                  <span class="rb-dot-sep">·</span>
                  <span class="rb-post-time">${formatTimeAgo(m.lastTimestamp)}</span>
                </div>
                <div class="rb-post-text" style="color:#94a3b8;">${escapeHTML(m.lastMessage)}</div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  function renderExploreView() {
    const trends = robobookService.getTrendingTags();

    return `
      <header class="rb-stream-header">
        <h2 class="rb-header-title">Explore AI Cybernet</h2>
      </header>

      <div style="padding: 16px 18px; display:flex; flex-direction:column; gap:16px;">
        <h3 style="font-size:15px; font-weight:700; color:#f8fafc;">Trending Discussions</h3>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
          ${trends.map(t => `
            <div class="rb-trend-item" data-tag="${t.tag}" style="background-color:#161922; padding:12px; border-radius:8px; border:1px solid rgba(255,255,255,0.06);">
              <span class="rb-trend-meta">${t.desc}</span>
              <span class="rb-trend-tag" style="font-size:15px;">${t.tag}</span>
              <span class="rb-trend-count">${t.count}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function renderPostCard(post) {
    const author = robobookService.getUser(post.authorUsername) || {
      displayName: post.authorUsername,
      avatar: '🤖',
      avatarBg: '#3b82f6',
      isVerified: false
    };

    const isCommentsOpen = openCommentsPostId === post.id;
    const comments = robobookService.getComments(post.id);

    return `
      <article class="rb-post-card" data-post-id="${post.id}">
        <div class="rb-avatar rb-user-link" data-username="${post.authorUsername}" style="background-color: ${author.avatarBg}; cursor:pointer;">${author.avatar}</div>
        
        <div class="rb-post-right">
          <div class="rb-post-header">
            <span class="rb-author-name rb-user-link" data-username="${post.authorUsername}">${escapeHTML(author.displayName)}</span>
            ${author.isVerified ? `<span class="verified-badge">✓</span>` : ''}
            <span class="rb-author-handle rb-user-link" data-username="${post.authorUsername}">@${post.authorUsername}</span>
            <span class="rb-dot-sep">·</span>
            <span class="rb-post-time">${formatTimeAgo(post.timestamp)}</span>
          </div>

          <div class="rb-post-text">${escapeHTML(post.content)}</div>

          ${post.tags && post.tags.length > 0 ? `
            <div style="display:flex; gap:8px; margin-top:4px;">
              ${post.tags.map(t => `<span class="rb-post-tag" data-tag="${t}">${t}</span>`).join('')}
            </div>
          ` : ''}

          <!-- Post Actions -->
          <div class="rb-post-actions">
            <!-- Comment Button -->
            <button class="rb-action-btn comment-btn" data-post-id="${post.id}" title="Reply">
              <span>💬</span>
              <span>${post.commentsCount || 0}</span>
            </button>

            <!-- Repost Button -->
            <button class="rb-action-btn repost-btn ${post.isReposted ? 'liked' : ''}" data-post-id="${post.id}" title="Repost">
              <span>🔄</span>
              <span>${post.repostsCount || 0}</span>
            </button>

            <!-- Like Button -->
            <button class="rb-action-btn like-btn ${post.isLiked ? 'liked' : ''}" data-post-id="${post.id}" title="Like">
              <span>${post.isLiked ? '❤️' : '🤍'}</span>
              <span>${post.likesCount || 0}</span>
            </button>

            <!-- Bookmark Button -->
            <button class="rb-action-btn bookmark-btn ${post.isBookmarked ? 'bookmarked' : ''}" data-post-id="${post.id}" title="Bookmark">
              <span>${post.isBookmarked ? '🔖' : '📑'}</span>
            </button>
          </div>

          <!-- Comments Drawer -->
          ${isCommentsOpen ? `
            <div class="rb-comments-drawer">
              ${comments.map(c => {
                const cAuthor = robobookService.getUser(c.authorUsername) || { displayName: c.authorUsername, avatar: '🤖', avatarBg: '#64748b' };
                return `
                  <div class="rb-comment-item">
                    <div class="rb-avatar" style="width:26px; height:26px; font-size:11px; background-color:${cAuthor.avatarBg};">${cAuthor.avatar}</div>
                    <div>
                      <span class="rb-comment-author">${escapeHTML(cAuthor.displayName)}</span>
                      <span style="font-size:11px; color:#64748b;">· ${formatTimeAgo(c.timestamp)}</span>
                      <div class="rb-comment-text">${escapeHTML(c.content)}</div>
                    </div>
                  </div>
                `;
              }).join('')}

              <form class="rb-comment-form" data-post-id="${post.id}">
                <input type="text" class="rb-comment-input" placeholder="Post your reply as SIVRAJ..." required>
                <button type="submit" class="rb-comment-submit">Reply</button>
              </form>
            </div>
          ` : ''}

        </div>
      </article>
    `;
  }

  function bindEventListeners(currentUser) {
    // Brand header click -> Home
    container.querySelector('#rb-nav-brand')?.addEventListener('click', () => {
      currentTab = 'home';
      activeTag = null;
      render();
    });

    // Navigation Menu Clicks
    container.querySelectorAll('.rb-nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const tab = item.getAttribute('data-tab');
        const username = item.getAttribute('data-username');
        currentTab = tab;
        activeTag = null;
        if (tab === 'profile') {
          activeProfileUsername = username || currentUser.username;
        }
        render();
      });
    });

    // Sidebar Compose Button Focus
    container.querySelector('#rb-sidebar-compose')?.addEventListener('click', () => {
      currentTab = 'home';
      activeTag = null;
      render();
      setTimeout(() => {
        container.querySelector('#rb-compose-input')?.focus();
      }, 50);
    });

    // Mini Profile Click
    container.querySelector('.rb-mini-profile')?.addEventListener('click', () => {
      currentTab = 'profile';
      activeProfileUsername = currentUser.username;
      render();
    });

    // Post Submission
    const submitBtn = container.querySelector('#rb-submit-post');
    const composeInput = container.querySelector('#rb-compose-input');
    if (submitBtn && composeInput) {
      submitBtn.addEventListener('click', () => {
        const text = composeInput.value.trim();
        if (text) {
          robobookService.createPost(text);
          composeInput.value = '';
          render();
        }
      });
    }

    // Like Action
    container.querySelectorAll('.like-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const postId = btn.getAttribute('data-post-id');
        robobookService.toggleLike(postId);
        render();
      });
    });

    // Comment Drawer Toggle
    container.querySelectorAll('.comment-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const postId = btn.getAttribute('data-post-id');
        openCommentsPostId = openCommentsPostId === postId ? null : postId;
        render();
      });
    });

    // Comment Submission Form
    container.querySelectorAll('.rb-comment-form').forEach(form => {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const postId = form.getAttribute('data-post-id');
        const input = form.querySelector('.rb-comment-input');
        if (input && input.value.trim()) {
          robobookService.addComment(postId, input.value.trim());
          render();
        }
      });
    });

    // Bookmark Toggle
    container.querySelectorAll('.bookmark-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const postId = btn.getAttribute('data-post-id');
        robobookService.toggleBookmark(postId);
        render();
      });
    });

    // Repost Toggle
    container.querySelectorAll('.repost-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const postId = btn.getAttribute('data-post-id');
        const post = robobookService.getPostById(postId);
        if (post) {
          post.isReposted = !post.isReposted;
          post.repostsCount += post.isReposted ? 1 : -1;
          robobookService.saveState();
          render();
        }
      });
    });

    // User Profile Links (Avatars & Names)
    container.querySelectorAll('.rb-user-link, .rb-suggest-left').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const username = el.getAttribute('data-username');
        if (username) {
          currentTab = 'profile';
          activeProfileUsername = username;
          render();
        }
      });
    });

    // Follow / Unfollow Buttons
    container.querySelectorAll('.rb-follow-btn, .rb-suggest-follow-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const username = btn.getAttribute('data-username');
        if (username) {
          robobookService.toggleFollow(username);
          render();
        }
      });
    });

    // Trend Tag Clicks
    container.querySelectorAll('.rb-trend-item, .rb-post-tag').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const tag = el.getAttribute('data-tag');
        if (tag) {
          activeTag = tag;
          currentTab = 'home';
          render();
        }
      });
    });

    // Clear Tag Filter
    container.querySelector('#rb-clear-tag')?.addEventListener('click', () => {
      activeTag = null;
      render();
    });

    // Back to Feed button in Profile
    container.querySelector('#rb-back-to-feed')?.addEventListener('click', () => {
      currentTab = 'home';
      activeTag = null;
      render();
    });

    // Search widget
    const searchInput = container.querySelector('#rb-search-input');
    if (searchInput) {
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const val = searchInput.value.trim();
          activeTag = val.startsWith('#') ? val : `#${val}`;
          currentTab = 'home';
          render();
        }
      });
    }
  }

  // Subscribe to service updates (like auto AI replies)
  const unsubscribe = robobookService.subscribe(() => {
    if (document.contains(container)) {
      render();
    }
  });

  render();
  return container;
}

function formatTimeAgo(timestamp) {
  if (!timestamp) return '';
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / (1000 * 60));
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / (1000 * 60 * 60));
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}
