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

// FCM 전용 서비스 워커 등록
async function registerFCMServiceWorker() {
  try {
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/firebase-cloud-messaging-push-scope',
    });
    return registration;
  } catch (e) {
    console.warn('FCM SW 등록 실패:', e);
    return null;
  }
}

export async function requestNotificationPermission(employeeId) {
  if (!messaging) return null;
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const swRegistration = await registerFCMServiceWorker();
    if (!swRegistration) return null;

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swRegistration,
    });

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
  // 먼저 기존 토큰 확인
  const { data: existing } = await supabase
    .from('fcm_tokens')
    .select('id')
    .eq('employee_id', employeeId)
    .eq('token', token)
    .maybeSingle();

  if (existing) {
    // 이미 존재 → updated_at만 갱신
    await supabase
      .from('fcm_tokens')
      .update({ updated_at: new Date().toISOString(), device_info: navigator.userAgent })
      .eq('id', existing.id);
    console.log('FCM 토큰 갱신 완료');
    return;
  }

  // 새로 삽입
  const { error } = await supabase.from('fcm_tokens').insert({
    employee_id: employeeId,
    token,
    device_info: navigator.userAgent,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.warn('FCM 토큰 저장 실패:', error.message);
  } else {
    console.log('FCM 토큰 저장 완료');
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
