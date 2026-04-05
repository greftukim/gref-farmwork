/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/11.6.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.6.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyARFBu7vy_x9nqUiL1g0_gHzClqxzuTbIA',
  authDomain: 'gref-farmwork.firebaseapp.com',
  projectId: 'gref-farmwork',
  storageBucket: 'gref-farmwork.firebasestorage.app',
  messagingSenderId: '991796861535',
  appId: '1:991796861535:web:a1ef4563d38e3bbb5f19ea',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'GREF FarmWork';
  const options = {
    body: payload.notification?.body || '새로운 알림이 있습니다',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: payload.data?.type || 'default',
    data: payload.data,
  };
  self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', (event) => {
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
