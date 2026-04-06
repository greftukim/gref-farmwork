import { NavLink } from 'react-router-dom';
import useAuthStore from '../../stores/authStore';

const farmMenuItems = [
  { to: '/admin', label: '대시보드' },
  { to: '/admin/attendance-status', label: '출근 현황' },
  { to: '/admin/tasks', label: '작업 배정' },
  { to: '/admin/board', label: '작업 현황' },
  { to: '/admin/crops', label: '작물·구역' },
  { to: '/admin/survey', label: '생육 조사' },
  { to: '/admin/records', label: '신고·호출' },
  { to: '/admin/stats', label: '성과 분석' },
  { to: '/admin/work-stats', label: '근무·수확' },
  { to: '/admin/report', label: '일일 보고서' },
  { to: '/admin/leave-approval', label: '근태 승인(1차)' },
  { to: '/admin/notices', label: '공지사항' },
  { to: '/admin/qr', label: '앱 배포 QR' },
];

const mgmtMenuItems = [
  { to: '/admin', label: '대시보드' },
  { to: '/admin/employees', label: '직원 관리' },
  { to: '/admin/attendance-status', label: '출근 현황' },
  { to: '/admin/attendance', label: '근무 관리' },
  { to: '/admin/leave', label: '휴가 관리' },
  { to: '/admin/schedule', label: '주간 일정' },
  { to: '/admin/records', label: '출퇴근 기록' },
  { to: '/admin/leave-approval', label: '근태 승인(최종)' },
  { to: '/admin/notices', label: '공지사항' },
  { to: '/admin/qr', label: '앱 배포 QR' },
];

export default function Sidebar() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const team = currentUser?.team;
  const menuItems = team === 'management' ? mgmtMenuItems : farmMenuItems;

  return (
    <nav className="w-56 bg-slate-900 min-h-screen py-4 flex-shrink-0">
      <div className="px-4 pb-4 mb-2 border-b border-slate-700">
        <span className="text-lg font-heading font-bold text-white">GREF FarmWork</span>
        {team && (
          <span className="block text-xs text-blue-300 mt-1">
            {team === 'farm' ? '재배팀' : '관리팀'}
          </span>
        )}
      </div>
      <ul className="space-y-1 px-2">
        {menuItems.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.to === '/admin'}
              className={({ isActive }) =>
                `flex items-center px-3 py-2.5 rounded-lg text-sm transition-colors min-h-[44px] ${
                  isActive
                    ? 'bg-blue-600 text-white font-medium'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <span>{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
