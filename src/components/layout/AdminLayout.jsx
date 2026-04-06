import { useCallback, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import ToastContainer from '../common/ToastContainer';
import useDataLoader from '../../hooks/useDataLoader';
import useRealtimeSubscriptions from '../../hooks/useRealtimeSubscriptions';
import useNotificationStore from '../../stores/notificationStore';
import useAuthStore from '../../stores/authStore';
import {
  ensureFCMServiceWorker,
  requestNotificationPermission,
  onForegroundMessage,
} from '../../lib/firebase';

export default function AdminLayout() {
  useDataLoader();

  const addNotification = useNotificationStore((s) => s.addNotification);
  const currentUser = useAuthStore((s) => s.currentUser);

  const handleNotification = useCallback((n) => {
    addNotification(n);
  }, [addNotification]);

  useRealtimeSubscriptions(handleNotification);

  // 1단계: 앱 진입 시 FCM SW 즉시 등록 (알림 권한과 무관)
  useEffect(() => {
    ensureFCMServiceWorker();
  }, []);

  // 2단계: 사용자 ID 확보 후 알림 권한 요청 + 토큰 저장
  useEffect(() => {
    if (!currentUser?.id) return;

    requestNotificationPermission(currentUser.id)
      .then((token) => {
        if (token) {
          console.log('[FCM] 토큰 저장 완료:', token.substring(0, 20) + '...');
        }
      })
      .catch((err) => {
        console.error('[FCM] 오류:', err);
        addNotification({
          type: 'fcm_error',
          title: '[디버그] FCM 토큰 저장 실패',
          message: err.message || '알 수 없는 오류',
          urgent: false,
        });
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  // 3단계: 포그라운드 메시지 수신
  useEffect(() => {
    const unsub = onForegroundMessage((msg) => {
      addNotification(msg);
    });
    return unsub;
  }, [addNotification]);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
      <ToastContainer />
    </div>
  );
}
