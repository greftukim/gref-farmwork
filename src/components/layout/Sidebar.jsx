import { NavLink } from 'react-router-dom';
import useBranchFilter from '../../hooks/useBranchFilter';
import useBranchStore from '../../stores/branchStore';

const menuItems = [
  { to: '/admin', label: '대시보드', icon: '📊' },
  { to: '/admin/employees', label: '직원 관리', icon: '👥' },
  { to: '/admin/attendance', label: '근무 관리', icon: '🕐' },
  { to: '/admin/leave', label: '휴가 관리', icon: '🌴' },
  { to: '/admin/leave-approval', label: '근태 승인', icon: '✅' },
  { to: '/admin/schedule', label: '주간 일정', icon: '📅' },
  { to: '/admin/crops', label: '작물 관리', icon: '🌿' },
  { to: '/admin/tasks', label: '작업 배정', icon: '📋' },
  { to: '/admin/board', label: '작업 현황', icon: '📌' },
  { to: '/admin/records', label: '신고·호출', icon: '🚨' },
  { to: '/admin/stats', label: '성과 분석', icon: '📈' },
  { to: '/admin/work-stats', label: '근무·수확', icon: '📊' },
  { to: '/admin/report', label: '일일 보고서', icon: '📄' },
  { to: '/admin/notices', label: '공지사항', icon: '📢' },
  { to: '/admin/survey', label: '생육 조사', icon: '🌱' },
  { to: '/admin/location', label: '온실 위치', icon: '📍' },
];

export default function Sidebar() {
  const { branchFilter, isFarmAdmin, setSelectedBranch } = useBranchFilter();
  const branches = useBranchStore((s) => s.branches);

  return (
    <nav className="w-56 bg-emerald-950 min-h-screen py-4 flex-shrink-0 flex flex-col">
      <div className="px-4 pb-4 mb-2 border-b border-emerald-800">
        <span className="text-lg font-heading font-bold text-white">GREF FarmWork</span>
      </div>

      {/* HR 관리자용 지점 필터 */}
      {!isFarmAdmin && branches.length > 0 && (
        <div className="px-3 pb-3 mb-1 border-b border-emerald-800">
          <label className="block text-xs text-emerald-400 mb-1">지점 필터</label>
          <select
            value={branchFilter || ''}
            onChange={(e) => setSelectedBranch(e.target.value || null)}
            className="w-full bg-emerald-900 text-emerald-100 text-xs rounded-lg px-2 py-1.5 border border-emerald-700"
          >
            <option value="">전체 지점</option>
            {branches.map((b) => (
              <option key={b.id} value={b.code}>{b.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* 재배팀 관리자: 소속 지점 표시 */}
      {isFarmAdmin && (
        <div className="px-4 pb-2 mb-1">
          <span className="text-xs text-emerald-400">소속: </span>
          <span className="text-xs text-emerald-200 font-medium">
            {branches.find((b) => b.code === branchFilter)?.name || branchFilter}
          </span>
        </div>
      )}

      <ul className="space-y-1 px-2 flex-1 overflow-y-auto">
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
