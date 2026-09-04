/**
 * DEFINITELYNOTCHROME BROWSER - IPC Communication Bridge
 * Modular event interface connecting Godly's SIVRAJ Core (Vision, AI Brain, Presence)
 * with the DefinitelyNotChrome Internal Browser.
 */

import { browserState } from '../state/browserState.js';
import { URLRouter } from '../navigation/urlRouter.js';

class SivrajIPCBridge {
  constructor() {
    this.handlers = {};
    this.isBrowserVisible = true;
    this.automationTimers = [];
    this.initListeners();
  }

  initListeners() {
    // Listen for postMessage events from parent frame / Electron / Webview wrapper
    window.addEventListener('message', (event) => {
      if (!event.data || !event.data.type) return;
      this.handleCommand(event.data.type, event.data.payload);
    });

    // Secure Electron preload bridge. The page never receives raw ipcRenderer.
    window.electronAPI?.onAutonomousBrowse((plan) => {
      this.handleCommand('AUTO_BROWSE', plan);
    });

    // Notify Godly's core when browser tab navigates
    browserState.on('tabNavigated', (tab) => {
      this.emitToCore('SITE_OPENED', {
        tabId: tab.id,
        url: tab.url,
        title: tab.title,
        isIncognito: tab.isIncognito,
        timestamp: Date.now()
      });
    });

    // Notify Godly's core when tabs change
    browserState.on('tabsChanged', ({ tabs, activeTabId }) => {
      const activeTab = tabs.find(t => t.id === activeTabId);
      this.emitToCore('TABS_UPDATED', {
        tabCount: tabs.length,
        activeTab: activeTab ? { id: activeTab.id, url: activeTab.url, isIncognito: activeTab.isIncognito } : null
      });
    });
  }

  /**
   * Handle incoming command from Godly's SIVRAJ Core
   */
  handleCommand(command, payload = {}) {
    console.log(`[SIVRAJ IPC] Received Command: ${command}`, payload);

    switch (command) {
      case 'OPEN_BROWSER':
        this.setBrowserVisibility(true);
        this.emitToCore('BROWSER_OPENED', { timestamp: Date.now() });
        break;

      case 'CLOSE_BROWSER':
        this.setBrowserVisibility(false);
        this.emitToCore('BROWSER_CLOSED', { timestamp: Date.now() });
        break;

      case 'OPEN_TAB':
        const newTab = browserState.createTab(payload.url || 'robo://home', payload.isIncognito || false);
        this.emitToCore('TAB_OPENED', { tabId: newTab.id, url: newTab.url });
        break;

      case 'CLOSE_TAB':
        browserState.closeTab(payload.tabId || browserState.activeTabId);
        this.emitToCore('TAB_CLOSED', { tabId: payload.tabId });
        break;

      case 'OPEN_INCOGNITO':
        const incogTab = browserState.createTab('about:incognito', true, 'Incognito', '🕵️');
        this.emitToCore('INCOGNITO_OPENED', { tabId: incogTab.id });
        break;

      case 'NAVIGATE':
        if (payload.url) {
          browserState.navigateActiveTab(payload.url);
        }
        break;

      case 'AUTO_BROWSE':
        this.executeAutonomousSequence(payload);
        break;

      default:
        console.warn(`[SIVRAJ IPC] Unrecognized command: ${command}`);
    }
  }

  /**
   * Dispatches command locally (useful for debugging in console)
   */
  dispatch(command, payload) {
    this.handleCommand(command, payload);
  }

  /**
   * Control UI visibility when human arrives/leaves
   */
  setBrowserVisibility(visible) {
    this.isBrowserVisible = visible;
    const appEl = document.getElementById('browser-app');
    if (appEl) {
      if (visible) {
        appEl.style.display = 'flex';
        appEl.style.opacity = '1';
        appEl.style.pointerEvents = 'all';
      } else {
        // Fast instant concealment
        appEl.style.opacity = '0';
        appEl.style.pointerEvents = 'none';
      }
    }
  }

  /**
   * Emits event back to SIVRAJ Core (Godly)
   */
  emitToCore(eventType, data = {}) {
    const message = {
      source: 'SIVRAJ_BROWSER',
      type: eventType,
      data,
      timestamp: Date.now()
    };

    // 1. Log to console for debugging
    console.log(`[SIVRAJ IPC Outbound] -> ${eventType}`, data);

    // 2. Post to window opener / parent frame if embedded
    if (window.opener) {
      window.opener.postMessage(message, '*');
    }
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(message, '*');
    }

    // 3. Dispatch native CustomEvent for local integration
    window.dispatchEvent(new CustomEvent('sivraj:ipc', { detail: message }));
  }

  /**
   * Autonomous browsing sequence simulation
   */
  executeAutonomousSequence(plan = {}) {
    const sequence = Array.isArray(plan) ? plan : plan.sequence;
    if (!Array.isArray(sequence) || sequence.length === 0) return;
    this.stopAutonomousSequence();
    this.ensureAutomationUI();

    const runCycle = () => {
      let elapsed = 0;
      sequence.forEach((step) => {
        elapsed += step.delayMs || 1500;
        this.scheduleAutomation(() => this.performAutonomousStep(step), elapsed);
      });

      if (!Array.isArray(plan) && plan.loop) {
        this.scheduleAutomation(
          runCycle,
          elapsed + (plan.pauseBetweenCyclesMs || 2000)
        );
      }
    };
    runCycle();
  }

  stopAutonomousSequence() {
    this.automationTimers.forEach((timer) => clearTimeout(timer));
    this.automationTimers = [];
  }

  scheduleAutomation(callback, delay) {
    const timer = setTimeout(() => {
      this.automationTimers = this.automationTimers.filter((item) => item !== timer);
      callback();
    }, delay);
    this.automationTimers.push(timer);
  }

  performAutonomousStep(step) {
    this.moveAutomationCursor(step);
    const indicator = document.getElementById('sivraj-autonomy-indicator');
    if (indicator) {
      indicator.querySelector('.autonomy-label').textContent = step.label || step.action;
      indicator.classList.add('is-working');
      setTimeout(() => indicator.classList.remove('is-working'), 700);
    }

    // Let the visible cursor arrive before the navigation happens.
    this.scheduleAutomation(() => {
      const route = step.url ? URLRouter.getRouteInfo(step.url) : null;
      if (step.action === 'NAVIGATE' && step.url) {
        browserState.navigateActiveTab(step.url, route?.title, route?.favicon);
      } else if (step.action === 'OPEN_TAB' && step.url) {
        browserState.createTab(step.url, Boolean(step.isIncognito), route?.title, route?.favicon);
      } else if (step.action === 'BACK') {
        browserState.goBack();
      } else if (step.action === 'FORWARD') {
        browserState.goForward();
      }
    }, 620);
  }

  ensureAutomationUI() {
    if (document.getElementById('sivraj-autonomy-indicator')) return;
    const indicator = document.createElement('div');
    indicator.id = 'sivraj-autonomy-indicator';
    indicator.innerHTML = '<span class="autonomy-pulse"></span><span>AUTONOMOUS</span><span class="autonomy-label">Waking up</span>';
    const cursor = document.createElement('div');
    cursor.id = 'sivraj-autonomy-cursor';
    cursor.innerHTML = '<span></span>';
    document.body.append(indicator, cursor);
  }

  moveAutomationCursor(step) {
    const cursor = document.getElementById('sivraj-autonomy-cursor');
    if (!cursor) return;
    let target = null;
    if (step.action === 'BACK') target = document.getElementById('nav-back-btn');
    if (step.action === 'FORWARD') target = document.getElementById('nav-forward-btn');
    if (step.action === 'OPEN_TAB') target = document.getElementById('new-tab-btn');
    if (step.action === 'NAVIGATE' && step.url) {
      target = [...document.querySelectorAll('[data-url]')]
        .find((element) => element.getAttribute('data-url') === step.url.split('?')[0]);
      target ||= document.getElementById('omnibox-input');
    }
    if (!target) return;
    const rect = target.getBoundingClientRect();
    cursor.style.transform = `translate(${rect.left + rect.width / 2}px, ${rect.top + rect.height / 2}px)`;
    cursor.classList.remove('clicking');
    setTimeout(() => cursor.classList.add('clicking'), 480);
  }
}

export const sivrajBridge = new SivrajIPCBridge();

// Expose on window object for easy manual/automated access
if (typeof window !== 'undefined') {
  window.__SIVRAJ_IPC__ = sivrajBridge;
}
