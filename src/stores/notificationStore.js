import { create } from 'zustand';

let notifId = 0;

const useNotificationStore = create((set, get) => ({
  notifications: [],
  soundEnabled: true,

  addNotification: (notification) => {
    const id = ++notifId;
    const item = {
      id,
      type: notification.type || 'info',
      title: notification.title,
      message: notification.message,
      urgent: notification.urgent || false,
      timestamp: Date.now(),
    };
    set((s) => ({ notifications: [...s.notifications, item] }));

    // Auto-remove after 6 seconds (urgent stays 10 seconds)
    setTimeout(() => {
      set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) }));
    }, item.urgent ? 10000 : 6000);

    // Play sound
    if (get().soundEnabled) {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        gain.gain.value = 0.3;

        if (item.urgent) {
          // Urgent: two-tone alert
          osc.frequency.value = 880;
          osc.start();
          osc.frequency.setValueAtTime(660, ctx.currentTime + 0.15);
          osc.frequency.setValueAtTime(880, ctx.currentTime + 0.3);
          gain.gain.setValueAtTime(0, ctx.currentTime + 0.5);
          osc.stop(ctx.currentTime + 0.5);
        } else {
          // Normal: single soft tone
          osc.frequency.value = 523;
          osc.start();
          gain.gain.setValueAtTime(0, ctx.currentTime + 0.2);
          osc.stop(ctx.currentTime + 0.2);
        }
      } catch (e) {
        // AudioContext not available
      }
    }

    return id;
  },

  removeNotification: (id) => {
    set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) }));
  },

  toggleSound: () => {
    set((s) => ({ soundEnabled: !s.soundEnabled }));
  },
}));

export default useNotificationStore;
