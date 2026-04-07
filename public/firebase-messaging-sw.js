/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/11.6.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.6.0/firebase-messaging-compat.js');

console.log('[FCM SW] 서비스 워커 로드됨');

firebase.initializeApp({
  apiKey: 'AIzaSyARFBu7vy_x9nqUiL1g0_gHzClqxzuTbIA',
  authDomain: 'gref-farmwork.firebaseapp.com',
  projectId: 'gref-farmwork',
  storageBucket: 'gref-farmwork.firebasestorage.app',
  messagingSenderId: '991796861535',
  appId: '1:991796861535:web:a1ef4563d38e3bbb5f19ea',
});

const messaging = firebase.messaging();

// ─── 즉시 활성화 ──────────────────────────────────────────────────────────────
// Vite PWA(Workbox) SW와 같은 scope(/)에 등록될 때, waiting 상태로 머물면
// push 이벤트를 수신하지 못한다. skipWaiting으로 즉시 활성화한다.
self.addEventListener('install', (event) => {
  console.log('[FCM SW] install → skipWaiting');
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  console.log('[FCM SW] activate → clients.claim');
  event.waitUntil(self.clients.claim());
});

// ─── 백그라운드 메시지 (Firebase SDK 핸들러) ─────────────────────────────────
// notification 필드가 포함된 메시지는 Firebase SDK가 자동 표시한다.
// data-only 메시지의 경우 이 핸들러가 호출된다.
messaging.onBackgroundMessage((payload) => {
  console.log('[FCM SW] 백그라운드 메시지 수신:', JSON.stringify(payload));

  const title = payload.notification?.title || 'GREF FarmWork';
  const urgent = payload.data?.urgent === 'true';

  const options = {
    body: payload.notification?.body || '새로운 알림이 있습니다',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: payload.data?.type || 'default',
    requireInteraction: urgent,
    data: payload.data,
  };

  console.log('[FCM SW] showNotification:', title, options);
  return self.registration.showNotification(title, options);
});

// ─── push 이벤트 직접 리스닝 (폴백) ─────────────────────────────────────────
// Firebase SDK가 push 이벤트를 처리하지 못하는 엣지 케이스를 대비해
// 직접 리스닝한다. Firebase SDK가 먼저 처리하면 이 핸들러는 무시된다.
self.addEventListener('push', (event) => {
  console.log('[FCM SW] push 이벤트 수신 (raw)');

  // Firebase SDK가 이미 처리했거나, 처리 중인 경우 skipWaiting 전달만
  if (!event.data) {
    console.log('[FCM SW] push data 없음, 무시');
    return;
  }

  let payload;
  try {
    payload = event.data.json();
  } catch {
    console.warn('[FCM SW] push data JSON 파싱 실패, 원본:', event.data.text());
    return;
  }

  // Firebase SDK가 처리하는 FCM 메시지는 gcm 또는 notification 필드를 갖는다.
  // 여기서는 Firebase SDK가 미처리한 경우의 폴백으로 notification 필드를 직접 표시한다.
  const notif = payload.notification;
  if (!notif?.title) {
    // Firebase SDK가 처리 중 → 폴백 표시 불필요
    return;
  }

  event.waitUntil(
    self.registration.showNotification(notif.title, {
      body: notif.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: payload.data?.type || 'default',
      requireInteraction: payload.data?.urgent === 'true',
      data: payload.data,
    })
  );
});

// ─── 알림 클릭 ────────────────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  console.log('[FCM SW] 알림 클릭:', event.notification.tag);
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return clients.openWindow('/');
    })
  );
});
