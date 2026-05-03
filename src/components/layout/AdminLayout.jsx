import { useCallback, useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Sidebar, T } from '../../design/primitives';
import { HQSidebar } from '../../design/hq-shell';
import AdminBottomNav from './AdminBottomNav';
import ToastContainer from '../common/ToastContainer';
import useDataLoader from '../../hooks/useDataLoader';
import useRealtimeSubscriptions from '../../hooks/useRealtimeSubscriptions';
import useNotificationStore from '../../stores/notificationStore';
import useAuthStore from '../../stores/authStore';
import { useTeamStore } from '../../stores/team';
import {
  ensureFCMServiceWorker,
  requestNotificationPermission,
  onForegroundMessage,
} from '../../lib/firebase';
import PWAInstallGuideModal from '../PWAInstallGuideModal';
import InstallPromptBanner from '../common/InstallPromptBanner';
import { getGuideType } from '../../lib/deviceDetect';
import ChatbotFab from '../chatbot/ChatbotFab';
import ChatbotPanel from '../chatbot/ChatbotPanel';

const SESSION_KEY = 'pwa_guide_shown';

const HQ_ROUTES = {
  dashboard: '/admin/hq',
  branches: '/admin/hq/branches',
  employees: '/admin/hq/employees',
  leave: '/admin/hq/leave',
  performance: '/admin/hq/performance',
  growth: '/admin/hq/growth',
  approvals: '/admin/hq/approvals',
  issues: '/admin/hq/issues',
  finance: '/admin/hq/finance',
  notice: '/admin/hq/notices',
  settings: '/admin/hq',
};

function getHQActiveId(pathname) {
  if (pathname === '/admin/hq') return 'dashboard';
  if (pathname.startsWith('/admin/hq/performance')) return 'performance';
  if (pathname.startsWith('/admin/hq/leave')) return 'leave';
  const entries = Object.entries(HQ_ROUTES).filter(([, v]) => v !== '/admin/hq');
  for (const [id, path] of entries) {
    if (pathname.startsWith(path)) return id;
  }
  return 'dashboard';
}

const FARM_ROUTES = {
  dashboard: '/admin',
  employees: '/admin/employees',
  schedule: '/admin/schedule',
  leave: '/admin/leave',
  tasks: '/admin/tasks',
  floor: '/admin/floor',
  growth: '/admin/growth',
  stats: '/admin/performance',
  // [TRACK77-U15] 이상신고 라우트 매핑 (Sidebar items.id와 일치)
  'issue-call': '/admin/issue-call',
  notice: '/admin/notices',
};

function getActiveId(pathname) {
  if (pathname === '/admin') return 'dashboard';
  const entries = Object.entries(FARM_ROUTES).filter(([, v]) => v !== '/admin');
  for (const [id, path] of entries) {
    if (pathname.startsWith(path)) return id;
  }
  return 'dashboard';
}

export default function AdminLayout() {
  useDataLoader();

  const team = useTeamStore((s) => s.team);
  const addNotification = useNotificationStore((s) => s.addNotification);
  const currentUser = useAuthStore((s) => s.currentUser);
  const [guideType, setGuideType] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const activeId = getActiveId(location.pathname);

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

  // MOBILE-AUTO-DETECT-001: 모바일 진입 시 /admin/m/home 자동 전환
  // Tailwind md = 768px 기준. /admin/m/* 이미 접속 중이면 재진입 방지.
  useEffect(() => {
    if (window.innerWidth < 768 && !location.pathname.startsWith('/admin/m')) {
      navigate('/admin/m/home', { replace: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isMobileRoute = location.pathname.startsWith('/admin/m');

  const handleNavigate = (id) => {
    const path = FARM_ROUTES[id];
    if (path) navigate(path);
  };

  const handleHQNavigate = (id) => {
    const path = HQ_ROUTES[id];
    if (path) navigate(path);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: 'Pretendard, system-ui', background: T.bg }}>
      {/* md 미만 또는 모바일 라우트: 사이드바 숨김 */}
      <div className="hidden md:flex">
        {!isMobileRoute && (team === 'farm' ? (
          <Sidebar active={activeId} onNavigate={handleNavigate} />
        ) : (
          <HQSidebar active={getHQActiveId(location.pathname)} onNavigate={handleHQNavigate} />
        ))}
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <main style={{ flex: 1, overflow: 'auto' }} className={isMobileRoute ? '' : 'pb-24 md:pb-0'}>
          <Outlet />
        </main>
      </div>
      {/* AdminBottomNav — /admin/m/* 에서는 AdminMobileShell 자체 탭바 사용 */}
      {!isMobileRoute && <AdminBottomNav />}
      <ToastContainer />
      <InstallPromptBanner />
      <PWAInstallGuideModal guideType={guideType} onClose={closeGuide} />
      {/*
        챗봇 영역 — 임시 숨김 처리 (세션 73).
        재활성화: 아래 두 줄 주석 해제.
        z-index 값으로 레이어 보장: FAB z-[60] < Panel z-[70] < Toast z-[100].
      */}
      {/* <ChatbotFab /> */}
      {/* <ChatbotPanel /> */}
    </div>
  );
}
