import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

// PWA 서비스 워커 업데이트 시 자동 리로드 (최대 1회)
// refreshing 변수는 리로드 후 초기화되므로 sessionStorage로 중복 방지
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // [TRACK77-U11-DIAG]
    console.log('[TRACK77-U11-DIAG] SW controllerchange triggered', {
      timestamp: new Date().toISOString(),
      alreadyReloaded: !!sessionStorage.getItem('sw-reloaded'),
    });
    if (sessionStorage.getItem('sw-reloaded')) return;
    sessionStorage.setItem('sw-reloaded', '1');
    window.location.reload();
  });

  // 앱 시작 시 SW 업데이트 체크 강제 실행
  navigator.serviceWorker.ready.then((registration) => {
    registration.update().catch(() => {});
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
