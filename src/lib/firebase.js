import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: 'AIzaSyARFBu7vy_x9nqUiL1g0_gHzClqxzuTbIA',
  authDomain: 'gref-farmwork.firebaseapp.com',
  projectId: 'gref-farmwork',
  storageBucket: 'gref-farmwork.firebasestorage.app',
  messagingSenderId: '991796861535',
  appId: '1:991796861535:web:a1ef4563d38e3bbb5f19ea',
};

const VAPID_KEY = 'BCDT9xLIKDtGLJ4uXxLsRk54vBA19MQABqj8x-wRyp0uwtS8FWZpi52dk3j3pEaXoINpQGG0ntF3tV6WRIULwmI';

const app = initializeApp(firebaseConfig);

let messaging = null;
try {
  messaging = getMessaging(app);
} catch (e) {
  // messaging not supported (e.g. no service worker)
}

export async function requestNotificationPermission() {
  if (!messaging) return null;
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: await navigator.serviceWorker.getRegistration(),
    });
    console.log('FCM Token:', token);
    return token;
  } catch (e) {
    console.warn('FCM token 등록 실패:', e);
    return null;
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
