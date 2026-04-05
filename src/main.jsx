import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

// PWA 서비스 워커 업데이트 시 자동 리로드
// 모바일에서 구 캐시가 남아있는 문제 해결
if ('serviceWorker' in navigator) {
  // 새 SW가 제어권을 가져오면 페이지 리로드
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
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
