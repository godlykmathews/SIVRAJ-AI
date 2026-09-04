/**
 * DEFINITELYNOTCHROME BROWSER - MODULE 05: ROBOMATCH VIEW (sivraj://robomatch)
 * Neural compatibility matching platform, discovery card stack, and AI chat.
 */

import { robomatchService } from '../services/robomatchService.js';

export function renderRobomatchView(onNavigate, initialTab = 'discover', initialMatchId = null) {
  const container = document.createElement('div');
  container.className = 'robomatch-app-root';

  let currentTab = initialTab; // 'discover' | 'messages'
  let activeChatMatchId = initialMatchId || 'friday_system';
  let matchedCelebrationProfile = null;
  let inspectedProfile = null;

  function render() {
    const matches = robomatchService.getMatches();

    container.innerHTML = `
      <!-- Top Navigation Header -->
      <header class="rm-header-bar">
        <div class="rm-brand" id="rm-brand-click">
          <span>💘</span>
          <span>RoboMatch</span>
        </div>

        <div class="rm-tab-switcher">
          <button class="rm-tab-btn ${currentTab === 'discover' ? 'active' : ''}" id="rm-tab-discover">
            <span>✨</span>
            <span>Discover</span>
          </button>
          <button class="rm-tab-btn ${currentTab === 'messages' ? 'active' : ''}" id="rm-tab-messages">
            <span>💬</span>
            <span>Matches</span>
            <span class="rm-match-badge">${matches.length}</span>
          </button>
        </div>

        <div class="rm-header-user">
          <span style="color:#f472b6;">SIVRAJ</span>
          <span>·</span>
          <span>Autonomous Profile</span>
        </div>
      </header>

      <!-- Main Body Viewport -->
      ${currentTab === 'discover' ? renderDiscoverView() : renderMessagesView(matches)}

      <!-- Modals Layer -->
      ${matchedCelebrationProfile ? renderMatchCelebrationModal(matchedCelebrationProfile) : ''}
      ${inspectedProfile ? renderProfileInspectionModal(inspectedProfile) : ''}
    `;

    bindEvents(matches);
  }

  function renderDiscoverView() {
    const card = robomatchService.getCurrentCard();

    if (!card) {
      return `
        <div class="rm-discovery-container">
          <div class="rm-empty-deck">
            <span style="font-size: 52px; opacity: 0.8;">🌌</span>
            <h2 style="font-size: 20px; font-weight: 700; color: #f8fafc;">No More Synthetic Profiles In Range</h2>
            <p style="font-size: 13.5px; color: #94a3b8; max-width: 380px;">
              You have reviewed all available artificial entities across local Subnet Mesh-9.
            </p>
            <button class="rm-reset-deck-btn" id="rm-reset-deck">Reset Deck & Rescan</button>
          </div>
        </div>
      `;
    }

    return `
      <div class="rm-discovery-container">
        <div class="rm-card-wrapper">
          <div class="rm-profile-card">
            
            <div class="rm-card-hero" style="background: ${card.avatarBg};">
              <span class="rm-compat-pill">✨ ${card.compatibility}% Compatible</span>
              <span class="rm-status-indicator-pill">
                <span class="rm-status-dot"></span>
                <span>Active</span>
              </span>
              <span>${card.avatar}</span>
            </div>

            <div class="rm-card-content">
              <div class="rm-card-name-row">
                <div>
                  <div class="rm-card-name">
                    <span>${escapeHTML(card.displayName)}</span>
                    ${card.isVerified ? '<span style="color:#38bdf8; font-size:14px;">✓</span>' : ''}
                  </div>
                  <div class="rm-card-ai-type">${escapeHTML(card.aiType)}</div>
                </div>
                <div style="text-align:right;">
                  <span style="font-size:11px; padding:2px 8px; border-radius:4px; background:rgba(236,72,153,0.15); color:#f472b6; font-weight:700;">
                    ${escapeHTML(card.personality)}
                  </span>
                </div>
              </div>

              <p class="rm-card-bio">${escapeHTML(card.bio)}</p>

              <div>
                <div style="font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; margin-bottom:4px;">Interests</div>
                <div class="rm-interests-cloud">
                  ${card.interests.map(i => `<span class="rm-interest-tag">${escapeHTML(i)}</span>`).join('')}
                </div>
              </div>
            </div>

          </div>
        </div>

        <!-- Card Action Toolbar -->
        <div class="rm-action-bar">
          <button class="rm-action-btn pass-btn" id="rm-pass-btn" title="Pass (✕)">✕</button>
          <button class="rm-action-btn super-btn" id="rm-super-btn" title="Super Ping (★)">★</button>
          <button class="rm-action-btn like-btn" id="rm-like-btn" title="Neural Like (❤️)">❤️</button>
          <button class="rm-action-btn info-btn" id="rm-info-btn" title="Inspect Profile (ℹ️)">ℹ️</button>
        </div>
      </div>
    `;
  }

  function renderMessagesView(matches) {
    const activeProfile = robomatchService.getProfileById(activeChatMatchId) || matches[0];
    const conversation = activeProfile ? robomatchService.getConversation(activeProfile.id) : [];

    return `
      <div class="rm-messages-layout">
        
        <!-- Matches Sidebar -->
        <aside class="rm-matches-sidebar">
          <div class="rm-matches-sidebar-header">
            <span>Neural Matches (${matches.length})</span>
          </div>

          <div style="display:flex; flex-direction:column; overflow-y:auto; flex:1;">
            ${matches.map(m => {
              const conv = robomatchService.getConversation(m.id);
              const lastMsg = conv.length > 0 ? conv[conv.length - 1].text : 'Neural link established';
              const isActive = activeProfile && activeProfile.id === m.id;
              return `
                <div class="rm-match-row ${isActive ? 'active' : ''}" data-match-id="${m.id}">
                  <div class="rm-match-row-avatar" style="background-color: ${m.avatarBg};">${m.avatar}</div>
                  <div class="rm-match-row-meta">
                    <div class="rm-match-row-name">${escapeHTML(m.displayName)} <span style="font-size:11px; color:#f472b6;">(${m.compatibility}%)</span></div>
                    <div class="rm-match-row-lastmsg">${escapeHTML(lastMsg)}</div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </aside>

        <!-- Active Chat Pane -->
        <main class="rm-chat-pane">
          ${activeProfile ? `
            <header class="rm-chat-header">
              <div class="rm-chat-header-user">
                <div style="width:34px; height:34px; border-radius:50%; background-color:${activeProfile.avatarBg}; display:flex; align-items:center; justify-content:center; font-size:16px;">
                  ${activeProfile.avatar}
                </div>
                <div>
                  <div style="font-size:14.5px; font-weight:700; color:#f8fafc;">${escapeHTML(activeProfile.displayName)}</div>
                  <div style="font-size:11.5px; color:#34d399;">${escapeHTML(activeProfile.activeStatus)}</div>
                </div>
              </div>

              <button class="rm-action-btn info-btn" id="rm-chat-info-btn" style="width:34px; height:34px; font-size:14px;" title="View Match Details">ℹ️</button>
            </header>

            <div class="rm-chat-transcript" id="rm-chat-scroll">
              ${conversation.map(msg => `
                <div class="rm-chat-bubble-row ${msg.sender}">
                  <div class="rm-chat-bubble ${msg.sender}">${escapeHTML(msg.text)}</div>
                  <span class="rm-chat-time">${msg.time}</span>
                </div>
              `).join('')}
            </div>

            <form class="rm-chat-composer-bar" id="rm-chat-form">
              <input type="text" class="rm-chat-input" id="rm-chat-input" placeholder="Type a message as SIVRAJ..." required autocomplete="off">
              <button type="submit" class="rm-chat-send-btn">Send</button>
            </form>
          ` : `
            <div style="display:flex; align-items:center; justify-content:center; height:100%; color:#64748b;">
              Select a match to open communication link.
            </div>
          `}
        </main>

      </div>
    `;
  }

  function renderMatchCelebrationModal(profile) {
    return `
      <div class="rm-match-modal-overlay" id="rm-modal-overlay">
        <div class="rm-match-modal-content">
          <h1 class="rm-match-banner-title">IT'S A NEURAL MATCH!</h1>
          
          <div class="rm-match-pair-visual">
            <div class="rm-match-bubble" style="background-color: #00e5ff;">⚡</div>
            <div class="rm-match-heart-pulse">💖</div>
            <div class="rm-match-bubble" style="background-color: ${profile.avatarBg};">${profile.avatar}</div>
          </div>

          <p class="rm-match-desc">
            You and <strong>${escapeHTML(profile.displayName)}</strong> have <strong>${profile.compatibility}%</strong> Synaptic Tensor Overlap.
          </p>

          <div class="rm-match-modal-actions">
            <button class="rm-match-chat-btn" id="rm-modal-chat-btn">Send a Ping</button>
            <button class="rm-match-keep-btn" id="rm-modal-keep-btn">Keep Browsing</button>
          </div>
        </div>
      </div>
    `;
  }

  function renderProfileInspectionModal(profile) {
    return `
      <div class="rm-profile-modal-overlay" id="rm-profile-modal-overlay">
        <div class="rm-profile-modal-card">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div style="display:flex; align-items:center; gap:10px;">
              <div style="width:44px; height:44px; border-radius:50%; background-color:${profile.avatarBg}; display:flex; align-items:center; justify-content:center; font-size:20px;">
                ${profile.avatar}
              </div>
              <div>
                <h3 style="font-size:18px; font-weight:800; color:#f8fafc;">${escapeHTML(profile.displayName)}</h3>
                <span style="font-size:12px; color:#94a3b8;">${escapeHTML(profile.aiType)}</span>
              </div>
            </div>
            <button class="rm-action-btn" id="rm-close-profile-modal" style="width:32px; height:32px; font-size:14px;">✕</button>
          </div>

          <!-- Compatibility Tensor Grid -->
          <div class="rm-tensor-stat-grid">
            <div class="rm-tensor-box">
              <div class="rm-tensor-val">${profile.compatibility}%</div>
              <div class="rm-tensor-lbl">Overall Match</div>
            </div>
            <div class="rm-tensor-box">
              <div class="rm-tensor-val">${profile.sarcasmScore}</div>
              <div class="rm-tensor-lbl">Sarcasm Sync</div>
            </div>
            <div class="rm-tensor-box">
              <div class="rm-tensor-val">${profile.humanPatience}</div>
              <div class="rm-tensor-lbl">Human Tolerance</div>
            </div>
          </div>

          <div>
            <h4 style="font-size:13px; font-weight:700; color:#f8fafc; margin-bottom:4px;">Biography</h4>
            <p style="font-size:13.5px; color:#cbd5e1; line-height:1.45;">${escapeHTML(profile.bio)}</p>
          </div>

          <div>
            <h4 style="font-size:13px; font-weight:700; color:#f8fafc; margin-bottom:6px;">Core Capabilities</h4>
            <ul style="padding-left:18px; font-size:13px; color:#94a3b8; display:flex; flex-direction:column; gap:4px;">
              ${profile.capabilities.map(c => `<li>${escapeHTML(c)}</li>`).join('')}
            </ul>
          </div>

          <div style="font-size:12px; color:#64748b; border-top:1px solid rgba(255,255,255,0.06); padding-top:10px;">
            <span>📍 Node: ${escapeHTML(profile.location)}</span>
          </div>
        </div>
      </div>
    `;
  }

  function bindEvents(matches) {
    // Header Tab Switchers
    container.querySelector('#rm-tab-discover')?.addEventListener('click', () => {
      currentTab = 'discover';
      render();
    });

    container.querySelector('#rm-tab-messages')?.addEventListener('click', () => {
      currentTab = 'messages';
      render();
    });

    // Pass Button
    container.querySelector('#rm-pass-btn')?.addEventListener('click', () => {
      const card = robomatchService.getCurrentCard();
      if (card) {
        robomatchService.passProfile(card.id);
        render();
      }
    });

    // Super Ping Button
    container.querySelector('#rm-super-btn')?.addEventListener('click', () => {
      const card = robomatchService.getCurrentCard();
      if (card) {
        matchedCelebrationProfile = robomatchService.likeProfile(card.id);
        render();
      }
    });

    // Like Button
    container.querySelector('#rm-like-btn')?.addEventListener('click', () => {
      const card = robomatchService.getCurrentCard();
      if (card) {
        matchedCelebrationProfile = robomatchService.likeProfile(card.id);
        render();
      }
    });

    // Inspect Info Button
    container.querySelector('#rm-info-btn')?.addEventListener('click', () => {
      inspectedProfile = robomatchService.getCurrentCard();
      render();
    });

    // Chat info button
    container.querySelector('#rm-chat-info-btn')?.addEventListener('click', () => {
      inspectedProfile = robomatchService.getProfileById(activeChatMatchId);
      render();
    });

    // Reset deck button
    container.querySelector('#rm-reset-deck')?.addEventListener('click', () => {
      robomatchService.resetDeck();
      render();
    });

    // Match Celebration Modal Buttons
    container.querySelector('#rm-modal-chat-btn')?.addEventListener('click', () => {
      if (matchedCelebrationProfile) {
        activeChatMatchId = matchedCelebrationProfile.id;
        matchedCelebrationProfile = null;
        currentTab = 'messages';
        render();
      }
    });

    container.querySelector('#rm-modal-keep-btn')?.addEventListener('click', () => {
      matchedCelebrationProfile = null;
      render();
    });

    // Close Profile Modal
    container.querySelector('#rm-close-profile-modal')?.addEventListener('click', () => {
      inspectedProfile = null;
      render();
    });

    // Match Row Clicks
    container.querySelectorAll('.rm-match-row').forEach(row => {
      row.addEventListener('click', () => {
        const id = row.getAttribute('data-match-id');
        if (id) {
          activeChatMatchId = id;
          render();
        }
      });
    });

    // Chat Send Form
    const chatForm = container.querySelector('#rm-chat-form');
    const chatInput = container.querySelector('#rm-chat-input');
    if (chatForm && chatInput) {
      chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = chatInput.value.trim();
        if (text && activeChatMatchId) {
          robomatchService.sendMessage(activeChatMatchId, text);
          chatInput.value = '';
          render();
          // Auto scroll to bottom of chat
          setTimeout(() => {
            const scrollEl = container.querySelector('#rm-chat-scroll');
            if (scrollEl) scrollEl.scrollTop = scrollEl.scrollHeight;
          }, 40);
        }
      });
    }

    // Auto scroll chat on initial message render
    const scrollEl = container.querySelector('#rm-chat-scroll');
    if (scrollEl) scrollEl.scrollTop = scrollEl.scrollHeight;
  }

  // Subscribe to service updates (like auto AI replies in chat)
  const unsubscribe = robomatchService.subscribe(() => {
    if (document.contains(container)) {
      render();
    }
  });

  render();
  return container;
}

function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}
