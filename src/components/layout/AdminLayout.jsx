import { useCallback, useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import AdminBottomNav from './AdminBottomNav';
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
import PWAInstallGuideModal from '../PWAInstallGuideModal';
import { getGuideType } from '../../lib/deviceDetect';
import ChatbotFab from '../chatbot/ChatbotFab';
import ChatbotPanel from '../chatbot/ChatbotPanel';

const SESSION_KEY = 'pwa_guide_shown';

export default function AdminLayout() {
  useDataLoader();

  const addNotification = useNotificationStore((s) => s.addNotification);
  const currentUser = useAuthStore((s) => s.currentUser);
  const [guideType, setGuideType] = useState(null);

  const handleNotification = useCallback((n) => {
    addNotification(n);
  }, [addNotification]);

  useRealtimeSubscriptions(handleNotification);

  // IOS-001: 로그인 직후 1회 PWA 설치 안내 모달
  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) return;
    const type = getGuideType();
    if (type) setGuideType(type);
  }, []);

  const closeGuide = () => {
    sessionStorage.setItem(SESSION_KEY, '1');
    setGuideType(null);
  };

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
      {/* 사이드바: 모바일에서 숨김 (md 이상에서만 표시) */}
      <div className="hidden md:block">
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        {/* 모바일: 하단 네비 여백, 데스크탑: 기본 패딩 */}
        <main className="flex-1 p-4 md:p-6 pb-24 md:pb-6">
          <Outlet />
        </main>
      </div>
      {/* 모바일 하단 네비 (md 미만에서만 표시) */}
      <AdminBottomNav />
      <ToastContainer />
      <PWAInstallGuideModal guideType={guideType} onClose={closeGuide} />
      {/*
        챗봇 영역.
        z-index 값으로 레이어 보장: FAB z-[60] < Panel z-[70] < Toast z-[100].
        DOM append 순서는 일관성 목적일 뿐, z-index 값이 시각 우선순위 결정.
        렌더 순서: FAB 먼저, Panel 다음 (구조상 의미 없음, 가독성 관례).
      */}
      <ChatbotFab />
      <ChatbotPanel />
    </div>
  );
}
