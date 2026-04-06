import { create } from 'zustand';

let notifId = 0;

// 모듈 레벨 싱글톤 — 매번 생성하면 모바일에서 suspended 상태로 시작
let _audioCtx = null;

function playNotificationSound(urgent) {
  try {
    if (!window.AudioContext && !window.webkitAudioContext) {
      console.warn('[Sound] AudioContext 미지원 브라우저');
      return;
    }
    if (!_audioCtx) {
      _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    const ctx = _audioCtx;

    const doPlay = () => {
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        gain.gain.value = 0.3;

        if (urgent) {
          // 긴급: 투톤 경고음
          osc.frequency.value = 880;
          osc.start();
          osc.frequency.setValueAtTime(660, ctx.currentTime + 0.15);
          osc.frequency.setValueAtTime(880, ctx.currentTime + 0.3);
          gain.gain.setValueAtTime(0, ctx.currentTime + 0.5);
          osc.stop(ctx.currentTime + 0.5);
        } else {
          // 일반: 단음
          osc.frequency.value = 523;
          osc.start();
          gain.gain.setValueAtTime(0, ctx.currentTime + 0.2);
          osc.stop(ctx.currentTime + 0.2);
        }
      } catch (e) {
        console.error('[Sound] 오실레이터 재생 실패:', e);
      }
    };

    // 모바일은 사용자 인터랙션 없이 AudioContext가 suspended 상태
    if (ctx.state === 'suspended') {
      console.log('[Sound] AudioContext suspended → resume 시도');
      ctx.resume()
        .then(() => { console.log('[Sound] resume 성공, 재생'); doPlay(); })
        .catch((e) => console.error('[Sound] resume 실패:', e));
    } else {
      doPlay();
    }
  } catch (e) {
    console.error('[Sound] AudioContext 생성 실패:', e);
  }
}

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

    // Auto-remove: urgent 10초, fcm_error 15초, 일반 6초
    const duration = item.urgent ? 10000 : item.type === 'fcm_error' ? 15000 : 6000;
    setTimeout(() => {
      set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) }));
    }, duration);

    // 소리 재생
    if (get().soundEnabled) {
      playNotificationSound(item.urgent);
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
