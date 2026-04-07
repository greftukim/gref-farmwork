import { useCallback, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import TopBar from './TopBar';
import BottomNav from './BottomNav';
import ToastContainer from '../common/ToastContainer';
import useDataLoader from '../../hooks/useDataLoader';
import useNotificationStore from '../../stores/notificationStore';
import useAuthStore from '../../stores/authStore';
import {
  ensureFCMServiceWorker,
  requestNotificationPermission,
  onForegroundMessage,
} from '../../lib/firebase';
import InstallPromptBanner from '../common/InstallPromptBanner';

export default function WorkerLayout() {
  useDataLoader();

  const addNotification = useNotificationStore((s) => s.addNotification);
  const currentUser = useAuthStore((s) => s.currentUser);

  // 1단계: FCM 서비스 워커 등록 (알림 권한 무관)
  useEffect(() => {
    ensureFCMServiceWorker();
  }, []);

  // 2단계: 사용자 ID 확보 후 알림 권한 요청 + 토큰 저장
  useEffect(() => {
    if (!currentUser?.id) return;
    requestNotificationPermission(currentUser.id)
      .then((token) => {
        if (token) console.log('[FCM Worker] 토큰 저장 완료');
      })
      .catch((err) => {
        // 작업자에게는 FCM 오류 토스트 미표시 (UX 방해 방지)
        console.warn('[FCM Worker] 초기화 실패:', err.message);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  // 3단계: 포그라운드 메시지 수신 → 토스트 표시
  const handleNotification = useCallback((n) => {
    addNotification(n);
  }, [addNotification]);

  useEffect(() => {
    const unsub = onForegroundMessage(handleNotification);
    return unsub;
  }, [handleNotification]);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <TopBar />
      <main className="flex-1 px-4 py-4 pb-20">
        <Outlet />
      </main>
      <BottomNav />
      <ToastContainer />
      <InstallPromptBanner />
    </div>
  );
}
