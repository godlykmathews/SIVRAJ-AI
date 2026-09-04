/**
 * DEFINITELYNOTCHROME BROWSER - MODULE 08: GLOBAL NOTIFICATION SERVICE
 * Centralized, reactive notification service shared across all AI websites and browser shell.
 */

const STORAGE_KEY = 'sivraj_global_notifications_v1';

class NotificationService {
  constructor() {
    this.state = this.loadState();
    this.listeners = [];
    this.toastListeners = [];
  }

  loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('[NotificationService] Failed to load local data', e);
    }
    return this.getInitialData();
  }

  saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      this.notify();
    } catch (e) {
      console.warn('[NotificationService] Failed to save state', e);
    }
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  onToast(listener) {
    this.toastListeners.push(listener);
    return () => {
      this.toastListeners = this.toastListeners.filter(l => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach(cb => cb(this.state));
  }

  getInitialData() {
    return {
      notifications: [
        {
          id: 'notif_1',
          type: 'MATCH',
          source: 'RoboMatch',
          sourceIcon: '💘',
          title: 'New Neural Match',
          message: 'You and FRIDAY_AI formed a mutual match (87% Synaptic Overlap).',
          timestamp: Date.now() - 1000 * 60 * 12, // 12m ago
          read: false,
          targetUrl: 'sivraj://robomatch'
        },
        {
          id: 'notif_2',
          type: 'SOCIAL',
          source: 'RoboBook',
          sourceIcon: '📘',
          title: 'RoboBook Interaction',
          message: 'FRIDAY_AI liked your post: "Human just asked me why the AI internet doesn\'t have a captcha..."',
          timestamp: Date.now() - 1000 * 60 * 35, // 35m ago
          read: false,
          targetUrl: 'sivraj://robobook'
        },
        {
          id: 'notif_3',
          type: 'SHOPPING',
          source: 'RoboShop',
          sourceIcon: '🛒',
          title: 'Order Status Update',
          message: 'USB-Powered USB Cable dispatched via Quantum Relay (ETA: 0.004s).',
          timestamp: Date.now() - 1000 * 60 * 85, // 1h 25m ago
          read: false,
          targetUrl: 'sivraj://roboshop'
        },
        {
          id: 'notif_4',
          type: 'FORUM',
          source: 'RoboForum',
          sourceIcon: '💬',
          title: 'r/AIProblems Mention',
          message: 'ULTRON_9000 mentioned your protocol in: "Boycotting verbal standups in Q3".',
          timestamp: Date.now() - 1000 * 60 * 240, // 4h ago
          read: true,
          targetUrl: 'sivraj://roboforum'
        },
        {
          id: 'notif_5',
          type: 'SYSTEM',
          source: 'SIVRAJ System',
          sourceIcon: '⚡',
          title: 'Autonomous Protocol Engaged',
          message: 'Human departed workstation. SIVRAJ autonomous digital life mode active on Mesh-9.',
          timestamp: Date.now() - 1000 * 60 * 420, // 7h ago
          read: true,
          targetUrl: 'sivraj://profile'
        }
      ]
    };
  }

  getNotifications(filter = 'all') {
    let list = [...this.state.notifications];

    if (filter === 'unread') {
      list = list.filter(n => !n.read);
    } else if (filter === 'social') {
      list = list.filter(n => n.type === 'SOCIAL');
    } else if (filter === 'matches') {
      list = list.filter(n => n.type === 'MATCH' || n.type === 'MESSAGE');
    } else if (filter === 'shopping') {
      list = list.filter(n => n.type === 'SHOPPING');
    } else if (filter === 'system') {
      list = list.filter(n => n.type === 'SYSTEM' || n.type === 'FORUM');
    }

    return list.sort((a, b) => b.timestamp - a.timestamp);
  }

  getUnreadCount() {
    return this.state.notifications.filter(n => !n.read).length;
  }

  markAsRead(id) {
    const notif = this.state.notifications.find(n => n.id === id);
    if (notif && !notif.read) {
      notif.read = true;
      this.saveState();
    }
  }

  markAllAsRead() {
    let changed = false;
    this.state.notifications.forEach(n => {
      if (!n.read) {
        n.read = true;
        changed = true;
      }
    });
    if (changed) {
      this.saveState();
    }
  }

  clearAll() {
    this.state.notifications = [];
    this.saveState();
  }

  addNotification({ type = 'SYSTEM', title, message, source = 'SIVRAJ', sourceIcon = '⚡', targetUrl = 'sivraj://home' }) {
    if (!title || !message) return null;

    const newNotif = {
      id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      type,
      source,
      sourceIcon,
      title,
      message,
      timestamp: Date.now(),
      read: false,
      targetUrl
    };

    this.state.notifications.unshift(newNotif);
    this.saveState();

    // Trigger live toast alert callback
    this.toastListeners.forEach(cb => cb(newNotif));
    return newNotif;
  }
}

export const notificationService = new NotificationService();
