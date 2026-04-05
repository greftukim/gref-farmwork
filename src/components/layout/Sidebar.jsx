import { NavLink } from 'react-router-dom';

const menuItems = [
  { to: '/admin', label: '대시보드', icon: '📊' },
  { to: '/admin/employees', label: '직원 관리', icon: '👥' },
  { to: '/admin/attendance', label: '근무 관리', icon: '🕐' },
  { to: '/admin/leave', label: '휴가 관리', icon: '🌴' },
  { to: '/admin/schedule', label: '주간 일정', icon: '📅' },
  { to: '/admin/crops', label: '작물·구역', icon: '🌿' },
  { to: '/admin/tasks', label: '작업 배정', icon: '📋' },
  { to: '/admin/board', label: '작업 현황', icon: '📌' },
  { to: '/admin/records', label: '신고·호출', icon: '🚨' },
  { to: '/admin/stats', label: '성과 분석', icon: '📈' },
  { to: '/admin/work-stats', label: '근무·수확', icon: '📊' },
  { to: '/admin/report', label: '일일 보고서', icon: '📄' },
  { to: '/admin/notices', label: '공지사항', icon: '📢' },
];

export default function Sidebar() {
  return (
    <nav className="w-56 bg-emerald-950 min-h-screen py-4 flex-shrink-0">
      <div className="px-4 pb-4 mb-2 border-b border-emerald-800">
        <span className="text-lg font-heading font-bold text-white">GREF FarmWork</span>
      </div>
      <ul className="space-y-1 px-2">
        {menuItems.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.to === '/admin'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors min-h-[44px] ${
                  isActive
                    ? 'bg-emerald-800 text-white font-medium'
                    : 'text-emerald-200 hover:bg-emerald-900 hover:text-white'
                }`
              }
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
