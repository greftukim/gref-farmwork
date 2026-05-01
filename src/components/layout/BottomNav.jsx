// 작업자 BottomNav
// 트랙 77 U4: 공지사항 탭 unread 빨간점 (Q5)
import { NavLink } from 'react-router-dom';
import useNoticeStore from '../../stores/noticeStore';
import useAuthStore from '../../stores/authStore';
import { getUnreadCount } from '../../lib/noticeRead';

const tabs = [
  { to: '/worker', label: '홈', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { to: '/worker/tasks', label: '작업', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { to: '/worker/attendance', label: '근태', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  { to: '/worker/notices', label: '공지사항', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9', noticeBadge: true },
];

function TabIcon({ path }) {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  );
}

export default function BottomNav() {
  const notices = useNoticeStore((s) => s.notices);
  const currentUser = useAuthStore((s) => s.currentUser);
  const unread = getUnreadCount(notices, currentUser?.id);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex justify-around items-center
        bg-white border-t border-gray-100 px-2 py-1.5 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]"
    >
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/worker'}
          className={({ isActive }) =>
            `relative flex flex-col items-center justify-center gap-0.5 min-w-[56px] min-h-[52px] px-2 py-1 rounded-xl transition-colors ${
              isActive ? 'text-indigo-600' : 'text-gray-400'
            }`
          }
        >
          <div className="relative">
            <TabIcon path={tab.icon} />
            {tab.noticeBadge && unread > 0 && (
              <span
                aria-label={`미확인 공지 ${unread}건`}
                className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white"
              />
            )}
          </div>
          <span className="text-[11px] font-medium">{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
