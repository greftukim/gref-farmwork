import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
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

// isSupported()로 비동기 정확히 판별 — 동기 getMessaging()은 모바일에서 오탐 발생
const messagingPromise = isSupported()
  .then((supported) => (supported ? getMessaging(app) : null))
  .catch(() => null);

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
  const messaging = await messagingPromise;
  if (!messaging) {
    throw new Error('이 브라우저는 FCM 푸시 알림을 지원하지 않습니다');
  }

  const permission = await Notification.requestPermission();
  console.log('알림 권한:', permission);
  // 사용자가 직접 거부한 경우는 에러가 아니므로 null 반환
  if (permission !== 'granted') return null;

  const swReg = await ensureFCMServiceWorker();
  if (!swReg) {
    throw new Error('FCM 서비스 워커 등록에 실패했습니다');
  }

  // SW가 활성화될 때까지 최대 10초 대기
  if (!swReg.active) {
    await new Promise((resolve, reject) => {
      const sw = swReg.installing || swReg.waiting;
      if (!sw) {
        // 상태 불명확 시 1초 뒤 재시도
        setTimeout(resolve, 1000);
        return;
      }
      const timeout = setTimeout(
        () => reject(new Error('서비스 워커 활성화 타임아웃 (10초 초과)')),
        10000
      );
      sw.addEventListener('statechange', () => {
        if (sw.state === 'activated') {
          clearTimeout(timeout);
          resolve();
        }
      });
    });
  }

  let token;
  try {
    token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swReg,
    });
  } catch (e) {
    throw new Error(`FCM 토큰 발급 실패: ${e.message}`);
  }

  console.log('FCM 토큰 획득:', token ? token.substring(0, 20) + '...' : 'null');

  if (!token) {
    throw new Error('FCM 토큰이 빈 값입니다 (VAPID 키 또는 Firebase 프로젝트 설정을 확인하세요)');
  }

  if (employeeId) {
    await saveTokenToSupabase(employeeId, token);
  }

  return token;
}

async function saveTokenToSupabase(employeeId, token) {
  const { data: existing, error: selectError } = await supabase
    .from('fcm_tokens')
    .select('id')
    .eq('employee_id', employeeId)
    .eq('token', token)
    .maybeSingle();

  if (selectError) {
    throw new Error(`fcm_tokens 조회 실패: ${selectError.message}`);
  }

  if (existing) {
    const { error: updateError } = await supabase
      .from('fcm_tokens')
      .update({ updated_at: new Date().toISOString(), device_info: navigator.userAgent })
      .eq('id', existing.id);
    if (updateError) {
      throw new Error(`fcm_tokens 갱신 실패: ${updateError.message}`);
    }
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
    throw new Error(`FCM 토큰 저장 실패: ${error.message}`);
  }
  console.log('FCM 토큰 저장 완료 (DB)');
}

export function onForegroundMessage(callback) {
  let unsub = null;
  messagingPromise.then((messaging) => {
    if (!messaging) return;
    unsub = onMessage(messaging, (payload) => {
      callback({
        title: payload.notification?.title || '알림',
        message: payload.notification?.body || '',
        type: payload.data?.type || 'info',
        urgent: payload.data?.urgent === 'true',
      });
    });
  });
  return () => { if (unsub) unsub(); };
}
