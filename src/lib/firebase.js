import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { supabase } from './supabase';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

const app = initializeApp(firebaseConfig);

let messaging = null;
try {
  messaging = getMessaging(app);
} catch (e) {
  // messaging not supported
}

// FCM SW를 앱 시작 시 즉시 등록 (알림 권한과 무관하게)
let fcmSwRegistration = null;

export async function ensureFCMServiceWorker() {
  if (fcmSwRegistration) return fcmSwRegistration;
  if (!('serviceWorker' in navigator)) return null;
  try {
    fcmSwRegistration = await navigator.serviceWorker.register(
      '/firebase-messaging-sw.js',
      { scope: '/' }
    );
    console.log('FCM SW 등록 완료, scope:', fcmSwRegistration.scope);
    return fcmSwRegistration;
  } catch (e) {
    console.warn('FCM SW 등록 실패:', e);
    return null;
  }
}

export async function requestNotificationPermission(employeeId) {
  if (!messaging) {
    console.warn('FCM: messaging not supported');
    return null;
  }
  try {
    const permission = await Notification.requestPermission();
    console.log('알림 권한:', permission);
    if (permission !== 'granted') return null;

    const swReg = await ensureFCMServiceWorker();
    if (!swReg) return null;

    // SW가 활성화될 때까지 대기
    if (!swReg.active) {
      await new Promise((resolve) => {
        const sw = swReg.installing || swReg.waiting;
        if (!sw) { resolve(); return; }
        sw.addEventListener('statechange', () => {
          if (sw.state === 'activated') resolve();
        });
      });
    }

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swReg,
    });
    console.log('FCM 토큰 획득:', token ? token.substring(0, 20) + '...' : 'null');

    if (token && employeeId) {
      await saveTokenToSupabase(employeeId, token);
    }

    return token;
  } catch (e) {
    console.warn('FCM token 등록 실패:', e);
    return null;
  }
}

async function saveTokenToSupabase(employeeId, token) {
  const { data: existing } = await supabase
    .from('fcm_tokens')
    .select('id')
    .eq('employee_id', employeeId)
    .eq('token', token)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('fcm_tokens')
      .update({ updated_at: new Date().toISOString(), device_info: navigator.userAgent })
      .eq('id', existing.id);
    console.log('FCM 토큰 갱신 완료 (DB)');
    return;
  }

  const { error } = await supabase.from('fcm_tokens').insert({
    employee_id: employeeId,
    token,
    device_info: navigator.userAgent,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.warn('FCM 토큰 저장 실패:', error.message);
  } else {
    console.log('FCM 토큰 저장 완료 (DB)');
  }
}

export function onForegroundMessage(callback) {
  if (!messaging) return () => {};
  return onMessage(messaging, (payload) => {
    callback({
      title: payload.notification?.title || '알림',
      message: payload.notification?.body || '',
      type: payload.data?.type || 'info',
      urgent: payload.data?.urgent === 'true',
    });
  });
}
