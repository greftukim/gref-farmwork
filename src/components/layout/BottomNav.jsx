import { NavLink } from 'react-router-dom';

const tabs = [
  { to: '/worker', label: '홈', icon: '🏠' },
  { to: '/worker/tasks', label: '작업', icon: '📋' },
  { to: '/worker/survey', label: '생육조사', icon: '🌱' },
  { to: '/worker/attendance', label: '근태', icon: '🕐' },
  { to: '/worker/more', label: '더보기', icon: '⋯' },
];

export default function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex justify-around items-center
        border-t border-emerald-900/20 px-2 py-1"
      style={{ backgroundColor: 'rgba(5, 46, 22, 0.96)' }}
    >
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/worker'}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-0.5 min-w-[48px] min-h-[48px] px-2 py-1 rounded-lg transition-colors ${
              isActive ? 'text-emerald-300' : 'text-emerald-100/60'
            }`
          }
        >
          <span className="text-lg">{tab.icon}</span>
          <span className="text-[11px] font-medium">{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
