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

self.addEventListener('install', () => {
  console.log('[FCM SW] install 이벤트');
  // skipWaiting 하지 않음 — Workbox SW와 충돌 방지
});

self.addEventListener('activate', () => {
  console.log('[FCM SW] activate 이벤트');
});

// 백그라운드 메시지 수신 (앱이 포그라운드가 아닐 때)
messaging.onBackgroundMessage((payload) => {
  console.log('[FCM SW] 백그라운드 메시지 수신:', JSON.stringify(payload));

  const title = payload.notification?.title || 'GREF FarmWork';
  const urgent = payload.data?.urgent === 'true';

  const options = {
    body: payload.notification?.body || '새로운 알림이 있습니다',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: payload.data?.type || 'default',
    // 사용자가 직접 닫기 전까지 알림 유지 (모바일에서 즉시 사라지는 문제 방지)
    requireInteraction: urgent,
    data: payload.data,
  };

  console.log('[FCM SW] showNotification 호출:', title, options);
  return self.registration.showNotification(title, options);
});

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
