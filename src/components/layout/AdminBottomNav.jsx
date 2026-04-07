import { NavLink } from 'react-router-dom';

const adminTabs = [
  {
    to: '/admin',
    label: '대시보드',
    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  },
  {
    to: '/admin/tasks',
    label: '작업 배정',
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  },
  {
    to: '/admin/records',
    label: '신고·호출',
    icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z',
  },
  {
    to: '/admin/leave-approval',
    label: '근태 승인',
    icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  {
    to: '/admin/employees',
    label: '직원 관리',
    icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
  },
  {
    to: '/admin/notices',
    label: '공지사항',
    icon: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z',
  },
];

function TabIcon({ path }) {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  );
}

export default function AdminBottomNav() {
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex justify-around items-center
        bg-white border-t border-gray-100 px-1 py-1.5 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]"
    >
      {adminTabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/admin'}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 min-h-[52px] px-1 py-1 rounded-xl transition-colors ${
              isActive ? 'text-blue-600' : 'text-gray-400'
            }`
          }
        >
          <TabIcon path={tab.icon} />
          <span className="text-[10px] font-medium text-center leading-tight">{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
