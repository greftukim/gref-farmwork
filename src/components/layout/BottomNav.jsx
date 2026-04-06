import { NavLink } from 'react-router-dom';

const tabs = [
  { to: '/worker', label: '홈' },
  { to: '/worker/tasks', label: '작업' },
  { to: '/worker/attendance', label: '출퇴근', isCenter: true },
  { to: '/worker/survey', label: '생육조사' },
  { to: '/worker/more', label: '더보기' },
];

export default function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex justify-around items-center
        border-t border-slate-700/30 px-2 py-1"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.96)' }}
    >
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/worker'}
          className={({ isActive }) =>
            tab.isCenter
              ? `flex flex-col items-center justify-center gap-0.5 -mt-4
                  min-w-[56px] min-h-[56px] rounded-full
                  bg-blue-600 text-white shadow-lg shadow-blue-600/30
                  active:scale-[0.95] transition-all`
              : `flex flex-col items-center justify-center gap-0.5 min-w-[48px] min-h-[48px] px-2 py-1 rounded-lg transition-colors ${
                  isActive ? 'text-blue-400' : 'text-slate-400'
                }`
          }
        >
          <span className="text-[11px] font-medium">{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
